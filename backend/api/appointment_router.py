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

@router.get("/stats")
def get_appointment_stats(current_user: User = Depends(get_current_user)):
    from persistence.database import get_connection
    conn = get_connection()
    cursor = conn.cursor()

    pid = current_user.id

    # Totales por estado
    cursor.execute("""
        SELECT status, COUNT(*) FROM appointments
        WHERE professional_id = ? GROUP BY status
    """, (pid,))
    by_status = {row[0]: row[1] for row in cursor.fetchall()}

    # Por mes (últimos 12 meses)
    cursor.execute("""
        SELECT substr(date_time,1,7) as month, status, COUNT(*) as cnt
        FROM appointments WHERE professional_id = ?
        GROUP BY month, status ORDER BY month DESC LIMIT 120
    """, (pid,))
    months: dict = {}
    for month, status, cnt in cursor.fetchall():
        if month not in months:
            months[month] = {"month": month, "ATTENDED": 0, "ABSENT": 0, "CANCELLED": 0, "PENDING": 0, "total": 0}
        months[month][status] = cnt
        months[month]["total"] += cnt
    by_month = sorted(months.values(), key=lambda x: x["month"])[-12:]

    # Por día de semana
    cursor.execute("""
        SELECT CAST(strftime('%w', substr(date_time,1,10)) AS INTEGER) as dow, COUNT(*) as cnt
        FROM appointments WHERE professional_id = ?
        GROUP BY dow
    """, (pid,))
    DOW = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
    by_dow = {d: 0 for d in DOW}
    for dow, cnt in cursor.fetchall():
        by_dow[DOW[dow]] = cnt

    # Top 10 pacientes por asistencia
    cursor.execute("""
        SELECT a.patient_id, p.name, p.last_name,
               COUNT(*) as total,
               SUM(CASE WHEN a.status='ATTENDED' THEN 1 ELSE 0 END) as attended,
               SUM(CASE WHEN a.status='ABSENT' THEN 1 ELSE 0 END) as absent,
               SUM(CASE WHEN a.status='CANCELLED' THEN 1 ELSE 0 END) as cancelled
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.professional_id = ?
        GROUP BY a.patient_id ORDER BY total DESC LIMIT 10
    """, (pid,))
    top_patients = [
        {"patient_id": r[0], "name": f"{r[1]} {r[2] or ''}".strip(),
         "total": r[3], "attended": r[4], "absent": r[5], "cancelled": r[6]}
        for r in cursor.fetchall()
    ]

    conn.close()
    return {
        "total": sum(by_status.values()),
        "by_status": by_status,
        "by_month": by_month,
        "by_dow": [{"day": d, "total": by_dow[d]} for d in DOW],
        "top_patients": top_patients,
    }

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
