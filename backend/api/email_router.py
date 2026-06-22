from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.dependencies import require_admin, get_current_user
from domain.user import User
from persistence.database import get_connection
from services.email_service import get_email_config, send_appointment_reminder, send_email
from services.scheduler import check_and_send_reminders
import base64

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
    if body.smtp_password:
        cursor.execute("""
            UPDATE email_config SET
                smtp_host=?, smtp_port=?, smtp_user=?, smtp_password=?,
                from_name=?, enabled=?
            WHERE id=1
        """, (body.smtp_host, body.smtp_port, body.smtp_user, body.smtp_password,
              body.from_name, 1 if body.enabled else 0))
    else:
        # No sobreescribir la contraseña si viene vacía
        cursor.execute("""
            UPDATE email_config SET
                smtp_host=?, smtp_port=?, smtp_user=?,
                from_name=?, enabled=?
            WHERE id=1
        """, (body.smtp_host, body.smtp_port, body.smtp_user,
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
    ok, msg = send_email(to, "Prueba de conexión — ONE Smile",
        "<h2>✅ Conexión exitosa</h2><p>El servidor de email de ONE Smile está configurado correctamente.</p>")
    if not ok:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": f"Email de prueba enviado a {to}"}

@router.post("/reminder")
def send_manual_reminder(body: ManualReminderRequest, current_user: User = Depends(get_current_user)):
    ok, msg = send_appointment_reminder(body.patient_name, body.patient_email, body.date_time, body.professional_name, body.reason)
    if not ok:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": "Recordatorio enviado"}

@router.post("/run-reminders")
def run_reminders_now(current_user: User = Depends(require_admin)):
    check_and_send_reminders()
    return {"message": "Proceso de recordatorios ejecutado"}

class SendDocumentRequest(BaseModel):
    to_email: str
    patient_name: str
    subject: str
    doc_type: str  # "presupuesto" | "consentimiento" | "tratamientos"
    pdf_base64: str
    filename: str

@router.post("/send-document")
def send_document(body: SendDocumentRequest, current_user: User = Depends(get_current_user)):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    config = get_email_config()
    if not config.get("enabled"):
        raise HTTPException(status_code=400, detail="El envío de emails está desactivado. Activalo en el Panel Admin.")
    if not config.get("smtp_user") or not config.get("smtp_password"):
        raise HTTPException(status_code=400, detail="Falta configurar el email en el Panel Admin.")

    DOC_LABELS = {
        "presupuesto": "un presupuesto",
        "consentimiento": "un formulario de consentimiento informado",
        "tratamientos": "el historial de tratamientos",
    }
    doc_label = DOC_LABELS.get(body.doc_type, "un documento")

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
      <div style="background:#0a285a;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">ONE Smile</h1>
        <p style="color:#a0c3f0;margin:4px 0 0;font-size:12px">ODONTOLOGÍA TRIFIRO</p>
      </div>
      <div style="padding:28px 32px">
        <p style="color:#444;font-size:14px">Hola <strong>{body.patient_name}</strong>,</p>
        <p style="color:#444;font-size:14px">Te enviamos adjunto {doc_label} de ONE Smile Odontología.</p>
        <p style="color:#444;font-size:14px">Ante cualquier consulta, no dudes en comunicarte con nosotros.</p>
      </div>
      <div style="background:#0a285a;padding:14px;text-align:center">
        <p style="color:#a0c3f0;font-size:11px;margin:0">ONE Smile · Odontología Trifiro</p>
      </div>
    </div>
    """

    try:
        msg = MIMEMultipart()
        msg["Subject"] = body.subject
        msg["From"] = f"{config['from_name']} <{config['smtp_user']}>"
        msg["To"] = body.to_email
        msg.attach(MIMEText(html, "html", "utf-8"))

        pdf_bytes = base64.b64decode(body.pdf_base64)
        part = MIMEBase("application", "octet-stream")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{body.filename}"')
        msg.attach(part)

        with smtplib.SMTP(config["smtp_host"], config["smtp_port"]) as server:
            server.ehlo()
            server.starttls()
            server.login(config["smtp_user"], config["smtp_password"])
            server.sendmail(config["smtp_user"], body.to_email, msg.as_string())

        return {"message": f"Documento enviado a {body.to_email}"}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=500, detail="Credenciales SMTP incorrectas. Verificá la configuración.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar: {str(e)}")
