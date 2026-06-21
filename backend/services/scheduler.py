import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from persistence.database import get_connection
from services.email_service import send_appointment_reminder, get_email_config

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def check_and_send_reminders():
    config = get_email_config()
    if not config.get("enabled"):
        return

    now = datetime.now()
    window_start = now + timedelta(hours=23)
    window_end   = now + timedelta(hours=25)
    ws = window_start.strftime("%Y-%m-%d %H:%M")
    we = window_end.strftime("%Y-%m-%d %H:%M")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.date_time, a.reason, a.status,
               p.name, p.email as patient_email,
               COALESCE(NULLIF(u.name,''), u.email) as prof_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.professional_id = u.id
        WHERE a.date_time BETWEEN ? AND ?
          AND a.status = 'PENDING'
          AND p.email IS NOT NULL AND p.email != ''
    """, (ws, we))
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        appt_id, date_time, reason, status, patient_name, patient_email, prof_name = row
        logger.info(f"Enviando recordatorio a {patient_email} para turno {date_time}")
        send_appointment_reminder(patient_name, patient_email, date_time, prof_name, reason or "")

def start_scheduler():
    scheduler.add_job(check_and_send_reminders, "interval", hours=1, id="reminder_job")
    scheduler.start()
    logger.info("Scheduler de recordatorios iniciado.")

def stop_scheduler():
    scheduler.shutdown()
