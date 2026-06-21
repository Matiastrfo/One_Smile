import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from persistence.database import get_connection

logger = logging.getLogger(__name__)

def get_email_config() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT smtp_host, smtp_port, smtp_user, smtp_password, from_name, enabled FROM email_config WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {}
    return {"smtp_host": row[0], "smtp_port": row[1], "smtp_user": row[2],
            "smtp_password": row[3], "from_name": row[4], "enabled": bool(row[5])}

def send_email(to_email: str, subject: str, html_body: str) -> tuple[bool, str]:
    config = get_email_config()
    if not config.get("enabled"):
        return False, "El envío de emails está desactivado. Activalo en el Panel Admin."
    if not config.get("smtp_user"):
        return False, "Falta el email remitente en la configuración."
    if not config.get("smtp_password"):
        return False, "Falta la contraseña en la configuración. Volvé a guardarla con la contraseña completa."
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{config['from_name']} <{config['smtp_user']}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        with smtplib.SMTP(config["smtp_host"], config["smtp_port"]) as server:
            server.ehlo()
            server.starttls()
            server.login(config["smtp_user"], config["smtp_password"])
            server.sendmail(config["smtp_user"], to_email, msg.as_string())
        logger.info(f"Email enviado a {to_email}")
        return True, "ok"
    except smtplib.SMTPAuthenticationError:
        msg = "Credenciales incorrectas. Para Gmail usá una App Password, no tu contraseña normal."
        logger.error(msg)
        return False, msg
    except smtplib.SMTPConnectError:
        msg = "No se pudo conectar al servidor SMTP. Verificá el host y puerto."
        logger.error(msg)
        return False, msg
    except Exception as e:
        logger.error(f"Error al enviar email: {e}")
        return False, str(e)

def send_appointment_reminder(patient_name: str, patient_email: str, date_time: str, professional_name: str, reason: str = "") -> tuple[bool, str]:
    date_part, time_part = (date_time.split(" ") + [""])[:2]
    subject = f"Recordatorio de turno — {date_part} {time_part}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
      <div style="background:#0a285a;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">ONE Smile</h1>
        <p style="color:#a0c3f0;margin:4px 0 0;font-size:12px">ODONTOLOGÍA TRIFIRO</p>
      </div>
      <div style="padding:28px 32px">
        <h2 style="color:#0a285a;font-size:18px;margin:0 0 8px">⏰ Recordatorio de turno</h2>
        <p style="color:#444;font-size:14px;margin:0 0 20px">Hola <strong>{patient_name}</strong>, te recordamos tu turno programado:</p>
        <div style="background:#f0f5ff;border-radius:10px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>📅 Fecha:</strong> {date_part}</p>
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>🕐 Hora:</strong> {time_part}</p>
          {"<p style='margin:4px 0;font-size:14px;color:#0a285a'><strong>📋 Motivo:</strong> " + reason + "</p>" if reason else ""}
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>👨‍⚕️ Profesional:</strong> {professional_name}</p>
        </div>
        <p style="color:#666;font-size:13px">Si necesitás cancelar o reprogramar tu turno, por favor comunicate con nosotros con anticipación.</p>
      </div>
      <div style="background:#0a285a;padding:14px;text-align:center">
        <p style="color:#a0c3f0;font-size:11px;margin:0">ONE Smile · Odontología Trifiro</p>
      </div>
    </div>
    """
    return send_email(patient_email, subject, html)
