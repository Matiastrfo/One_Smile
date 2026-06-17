from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from domain.contract import Contract, ContractAssign, ContractCreate, TransferRequest
from domain.user import User
from persistence.contract_repository import ContractRepository
from persistence.database import get_connection
from api.dependencies import require_admin

router = APIRouter()
contract_repo = ContractRepository()


@router.get("/", response_model=List[Contract])
def get_active_contracts(current_user: User = Depends(require_admin)):
    return contract_repo.get_all_active()


@router.post("/", response_model=Contract, status_code=201)
def assign_professional(body: ContractAssign, current_user: User = Depends(require_admin)):
    """Asigna un profesional a un box/día/turno creando un contrato nuevo."""
    existing = contract_repo.get_active_by_box_day_shift(body.box_id, body.day_of_week, body.shift)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ese turno ya tiene asignado a {existing.professional_email}."
        )
    current_month = datetime.now().strftime('%Y-%m')
    contract = contract_repo.create(ContractCreate(
        professional_id=body.professional_id,
        box_id=body.box_id,
        shift=body.shift,
        day_of_week=body.day_of_week,
        start_month_year=current_month,
        duration_months=body.duration_months,
    ))
    return contract


@router.delete("/{contract_id}")
def remove_contract(contract_id: int, current_user: User = Depends(require_admin)):
    """Finaliza un contrato activo (libera el slot)."""
    contract = contract_repo.get_by_id(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if contract.status != 'ACTIVE':
        raise HTTPException(status_code=400, detail="El contrato ya no está activo")
    contract_repo.update_status(contract_id, 'FINISHED')
    return {"detail": "Contrato finalizado"}


@router.post("/{contract_id}/transfer", response_model=Contract)
def transfer_contract(contract_id: int, body: TransferRequest, current_user: User = Depends(require_admin)):
    """
    Transfiere un contrato a otro box/día/turno con los meses restantes.
    Si swap=True e intercambia con el profesional que ocupa el destino.
    """
    old_contract = contract_repo.get_by_id(contract_id)
    if not old_contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if old_contract.status != 'ACTIVE':
        raise HTTPException(status_code=400, detail="Solo se pueden transferir contratos ACTIVOS")

    occupied = contract_repo.get_active_by_box_day_shift(body.new_box_id, body.new_day_of_week, body.new_shift)

    if occupied and not body.swap:
        raise HTTPException(
            status_code=409,
            detail=f"Ese slot ya tiene a {occupied.professional_email}. Podés hacer un intercambio."
        )
    if occupied and body.swap and occupied.id == contract_id:
        raise HTTPException(status_code=400, detail="No podés intercambiar un contrato consigo mismo")

    months_generated = contract_repo.count_payments(contract_id)
    remaining = old_contract.duration_months - months_generated
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="El contrato ya no tiene meses restantes para transferir")

    current_month = datetime.now().strftime('%Y-%m')
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if occupied and body.swap:
            occ_generated = contract_repo.count_payments(occupied.id)
            occ_remaining = max(occupied.duration_months - occ_generated, 1)

            cursor.execute("UPDATE contracts SET status = 'TRANSFERRED' WHERE id = ?", (contract_id,))
            cursor.execute("UPDATE contracts SET status = 'TRANSFERRED' WHERE id = ?", (occupied.id,))

            cursor.execute(
                "INSERT INTO contracts (professional_id, box_id, shift, day_of_week, start_month_year, duration_months, status, previous_contract_id) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                (old_contract.professional_id, body.new_box_id, body.new_shift, body.new_day_of_week, current_month, remaining, contract_id)
            )
            new_contract_id = cursor.lastrowid

            cursor.execute(
                "INSERT INTO contracts (professional_id, box_id, shift, day_of_week, start_month_year, duration_months, status, previous_contract_id) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                (occupied.professional_id, old_contract.box_id, old_contract.shift, old_contract.day_of_week, current_month, occ_remaining, occupied.id)
            )
        else:
            cursor.execute("UPDATE contracts SET status = 'TRANSFERRED' WHERE id = ?", (contract_id,))
            cursor.execute(
                "INSERT INTO contracts (professional_id, box_id, shift, day_of_week, start_month_year, duration_months, status, previous_contract_id) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                (old_contract.professional_id, body.new_box_id, body.new_shift, body.new_day_of_week, current_month, remaining, contract_id)
            )
            new_contract_id = cursor.lastrowid

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    finally:
        conn.close()

    return contract_repo.get_by_id(new_contract_id)
