from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.dependencies import require_admin, get_current_user
from domain.user import User
from persistence.database import get_connection
from services.email_service import get_email_config, send_appointment_reminder
from services.scheduler import check_and_send_reminders

router = APIRouter()

class EmailConfig(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_name: str = "OneSmile Odontología"
    enabled: bool = False

class ManualReminderRequest(BaseModel):
    patient_name: str
    patient_email: str
    date_time: str
    professional_name: str
    reason: str = ""

@router.get("/config")
def get_config(current_user: User = Depends(require_admin)):
    config = get_email_config()
    if config.get("smtp_password"):
        config["smtp_password"] = "••••••••"
    return config

@router.put("/config")
def save_config(body: EmailConfig, current_user: User = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE email_config SET
            smtp_host=?, smtp_port=?, smtp_user=?, smtp_password=?,
            from_name=?, enabled=?
        WHERE id=1
    """, (body.smtp_host, body.smtp_port, body.smtp_user, body.smtp_password,
          body.from_name, 1 if body.enabled else 0))
    conn.commit()
    conn.close()
    return {"message": "Configuración guardada"}

@router.post("/test")
def test_email(body: dict, current_user: User = Depends(require_admin)):
    to = body.get("to")
    if not to:
        raise HTTPException(status_code=400, detail="Falta el campo 'to'")
    from services.email_service import send_email
    ok = send_email(to, "Prueba de conexión — ONE Smile",
        "<h2>✅ Conexión exitosa</h2><p>El servidor de email de ONE Smile está configurado correctamente.</p>")
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo enviar el email. Verificá la configuración.")
    return {"message": f"Email de prueba enviado a {to}"}

@router.post("/reminder")
def send_manual_reminder(body: ManualReminderRequest, current_user: User = Depends(get_current_user)):
    ok = send_appointment_reminder(body.patient_name, body.patient_email, body.date_time, body.professional_name, body.reason)
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo enviar el recordatorio. Verificá que el email esté configurado.")
    return {"message": "Recordatorio enviado"}

@router.post("/run-reminders")
def run_reminders_now(current_user: User = Depends(require_admin)):
    check_and_send_reminders()
    return {"message": "Proceso de recordatorios ejecutado"}
