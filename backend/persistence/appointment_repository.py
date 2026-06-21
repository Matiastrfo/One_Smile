from domain.appointment import Appointment
from persistence.database import get_connection

class AppointmentRepository:
    def _map(self, row) -> Appointment:
        return Appointment(id=row[0], patient_id=row[1], professional_id=row[2], date_time=row[3], reason=row[4], status=row[5], notes=row[6] if len(row) > 6 else None)

    def insert(self, appointment: Appointment) -> Appointment:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO appointments (patient_id, professional_id, date_time, reason, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
            (appointment.patient_id, appointment.professional_id, appointment.date_time, appointment.reason, appointment.status, appointment.notes)
        )
        appointment.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return appointment

    def get_all(self) -> list[Appointment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, professional_id, date_time, reason, status, notes FROM appointments")
        rows = cursor.fetchall()
        conn.close()
        return [self._map(r) for r in rows]

    def get_by_professional(self, professional_id: int) -> list[Appointment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, professional_id, date_time, reason, status, notes FROM appointments WHERE professional_id = ?", (professional_id,))
        rows = cursor.fetchall()
        conn.close()
        return [self._map(r) for r in rows]

    def get_by_patient(self, patient_id: int) -> list[Appointment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, professional_id, date_time, reason, status, notes FROM appointments WHERE patient_id = ?", (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [self._map(r) for r in rows]
        
    def is_time_taken(self, date_time: str, professional_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM appointments WHERE date_time = ? AND professional_id = ?", (date_time, professional_id))
        result = cursor.fetchone()
        conn.close()
        return result is not None
        
    def get_by_id(self, appointment_id: int):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, patient_id, professional_id, date_time, reason, status, notes FROM appointments WHERE id = ?", (appointment_id,))
            row = cursor.fetchone()
            return self._map(row) if row else None
        finally:
            conn.close()

    def delete(self, appointment_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
        conn.commit()
        conn.close()

    def update_status(self, appointment_id: int, new_status: str, notes: str = None) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        if notes is not None:
            cursor.execute("UPDATE appointments SET status = ?, notes = ? WHERE id = ?", (new_status, notes, appointment_id))
        else:
            cursor.execute("UPDATE appointments SET status = ? WHERE id = ?", (new_status, appointment_id))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated
