from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from datetime import datetime

from domain.box_payment import BoxPayment, BoxPaymentUpdate
from domain.user import User
from persistence.box_payment_repository import BoxPaymentRepository
from services.payment_service import PaymentService
from api.dependencies import require_admin

router = APIRouter()
payment_repo = BoxPaymentRepository()
payment_service = PaymentService()

@router.get("/", response_model=List[BoxPayment])
def get_all_payments(current_user: User = Depends(require_admin)):
    return payment_repo.get_all()

@router.get("/professional/{prof_id}", response_model=List[BoxPayment])
def get_payments_by_professional(prof_id: int, current_user: User = Depends(require_admin)):
    return payment_repo.get_by_professional_id(prof_id)

class GenerateResponse(BaseModel):
    generated_count: int
    month_year: str

@router.post("/generate", response_model=GenerateResponse)
def generate_monthly_payments(month_year: str = None, current_user: User = Depends(require_admin)):
    if not month_year:
        month_year = datetime.now().strftime('%Y-%m')
    count = payment_service.generate_monthly_payments(month_year)
    return GenerateResponse(generated_count=count, month_year=month_year)

@router.delete("/{payment_id}")
def delete_payment(payment_id: int, current_user: User = Depends(require_admin)):
    payment = payment_repo.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    payment_repo.delete(payment_id)
    return {"detail": "Pago eliminado"}

@router.put("/{payment_id}", response_model=BoxPayment)
def update_payment(payment_id: int, payment_update: BoxPaymentUpdate, current_user: User = Depends(require_admin)):
    payment = payment_repo.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    updated = payment_repo.update(payment_id, payment_update)
    if not updated:
        raise HTTPException(status_code=400, detail="Error al actualizar pago")
    return updated
