from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from domain.appointment import Appointment
from domain.patient import Patient
from domain.user import User
from services.appointment_service import AppointmentService
from services.patient_service import PatientService
from api.dependencies import get_current_user

router = APIRouter()
appointment_service = AppointmentService()
patient_service = PatientService()


class QuickAppointmentRequest(BaseModel):
    patient_name: str
    patient_phone: Optional[str] = None
    date_time: str
    reason: Optional[str] = ""

@router.post("/", response_model=Appointment)
def create_appointment(appointment: Appointment, current_user: User = Depends(get_current_user)):
    try:
        appointment.professional_id = current_user.id
        return appointment_service.create_appointment(appointment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[Appointment])
def get_appointments(current_user: User = Depends(get_current_user)):
    return appointment_service.get_appointments_by_professional(current_user.id)

VALID_STATUSES = {"PENDING", "ATTENDED", "ABSENT", "CANCELLED"}

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, current_user: User = Depends(get_current_user)):
    appt = appointment_service.repository.get_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if appt.professional_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    appointment_service.delete_appointment(appointment_id)
    return {"message": "Turno eliminado"}

@router.post("/quick", response_model=Appointment)
def quick_appointment(body: QuickAppointmentRequest, current_user: User = Depends(get_current_user)):
    """Crea un paciente (solo nombre) y un turno en un solo paso."""
    patient = patient_service.create_patient(Patient(name=body.patient_name, phone=body.patient_phone, professional_id=current_user.id))
    try:
        appt = Appointment(patient_id=patient.id, date_time=body.date_time, reason=body.reason, professional_id=current_user.id)
        return appointment_service.create_appointment(appt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class StatusUpdateRequest(BaseModel):
    status: str

@router.patch("/{appointment_id}/status")
def update_appointment_status(appointment_id: int, request: StatusUpdateRequest, current_user: User = Depends(get_current_user)):
    if request.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {', '.join(VALID_STATUSES)}")
    appt = appointment_service.repository.get_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if appt.professional_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    try:
        appointment_service.update_appointment_status(appointment_id, request.status)
        return {"message": "Estado actualizado"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
