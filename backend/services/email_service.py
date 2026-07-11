import smtplib
import logging
from urllib.parse import quote
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from persistence.database import get_connection
from services.secret_crypto import decrypt_secret

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
            "smtp_password": decrypt_secret(row[3]) if row[3] else "", "from_name": row[4], "enabled": bool(row[5])}

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

def send_appointment_reminder(patient_name: str, patient_email: str, date_time: str, professional_name: str, reason: str = "", professional_email: str = "") -> tuple[bool, str]:
    date_part, time_part = (date_time.split(" ") + [""])[:2]
    subject = f"Recordatorio de turno — {date_part} {time_part}"

    action_buttons = ""
    if professional_email:
        confirm_subject = quote(f"Confirmo mi turno — {patient_name} {date_part} {time_part}")
        confirm_body = quote(
            f"Hola, confirmo que voy a asistir a mi turno del {date_part} a las {time_part}.\n\n"
            f"Paciente: {patient_name}"
        )
        cancel_subject = quote(f"Cancelo mi turno — {patient_name} {date_part} {time_part}")
        cancel_body = quote(
            f"Hola, no voy a poder asistir a mi turno del {date_part} a las {time_part} y quiero cancelarlo.\n\n"
            f"Paciente: {patient_name}"
        )
        confirm_url = f"mailto:{professional_email}?subject={confirm_subject}&body={confirm_body}"
        cancel_url = f"mailto:{professional_email}?subject={cancel_subject}&body={cancel_body}"
        action_buttons = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
          <tr>
            <td align="center" style="padding:0 6px 0 0">
              <a href="{confirm_url}" style="display:block;background:#16a34a;color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 8px;border-radius:8px;text-align:center">✅ Confirmar turno</a>
            </td>
            <td align="center" style="padding:0 0 0 6px">
              <a href="{cancel_url}" style="display:block;background:#dc2626;color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 8px;border-radius:8px;text-align:center">✖ Cancelar turno</a>
            </td>
          </tr>
        </table>
        <p style="color:#888;font-size:11px;margin:0 0 20px;text-align:center">Al tocar un botón se abre tu app de mail con una respuesta ya redactada — solo tenés que enviarla.</p>
        """

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
        {action_buttons}
        <p style="color:#666;font-size:13px">Si necesitás cancelar o reprogramar tu turno, por favor comunicate con nosotros con anticipación.</p>
      </div>
      <div style="background:#0a285a;padding:14px;text-align:center">
        <p style="color:#a0c3f0;font-size:11px;margin:0">ONE Smile · Odontología Trifiro</p>
      </div>
    </div>
    """
    return send_email(patient_email, subject, html)

def send_lab_job_notification(lab_email: str, lab_name: str, patient_name: str, description: str, sent_date: str, professional_name: str) -> tuple[bool, str]:
    subject = f"Nuevo trabajo enviado — {patient_name}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
      <div style="background:#0a285a;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">ONE Smile</h1>
        <p style="color:#a0c3f0;margin:4px 0 0;font-size:12px">ODONTOLOGÍA TRIFIRO</p>
      </div>
      <div style="padding:28px 32px">
        <h2 style="color:#0a285a;font-size:18px;margin:0 0 8px">Nuevo trabajo enviado</h2>
        <p style="color:#444;font-size:14px;margin:0 0 20px">Hola <strong>{lab_name}</strong>, te enviamos un nuevo trabajo:</p>
        <div style="background:#f0f5ff;border-radius:10px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>Paciente:</strong> {patient_name}</p>
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>Trabajo:</strong> {description}</p>
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>Fecha de envío:</strong> {sent_date}</p>
          <p style="margin:4px 0;font-size:14px;color:#0a285a"><strong>Profesional:</strong> {professional_name}</p>
        </div>
      </div>
      <div style="background:#0a285a;padding:14px;text-align:center">
        <p style="color:#a0c3f0;font-size:11px;margin:0">ONE Smile · Odontología Trifiro</p>
      </div>
    </div>
    """
    return send_email(lab_email, subject, html)
