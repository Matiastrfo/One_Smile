from typing import List, Optional
from domain.patient_payment import PatientPayment
from persistence.database import get_connection

class PatientPaymentRepository:
    def insert(self, payment: PatientPayment) -> PatientPayment:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patient_payments (patient_id, professional_id, date, amount, description) VALUES (?, ?, ?, ?, ?)",
            (payment.patient_id, payment.professional_id, payment.date, payment.amount, payment.description)
        )
        payment.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return payment

    def get_by_patient(self, patient_id: int) -> List[PatientPayment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pp.id, pp.patient_id, pp.professional_id, pp.date, pp.amount, pp.description,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM patient_payments pp
            LEFT JOIN users u ON pp.professional_id = u.id
            WHERE pp.patient_id = ?
            ORDER BY pp.date ASC, pp.id ASC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [PatientPayment(id=r[0], patient_id=r[1], professional_id=r[2], date=r[3], amount=r[4], description=r[5], professional_name=r[6]) for r in rows]

    def delete(self, payment_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patient_payments WHERE id = ?", (payment_id,))
        conn.commit()
        conn.close()

    def get_summary_all_patients(self, professional_id: int = None) -> List[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        where = "WHERE p.professional_id = ?" if professional_id else ""
        params = (professional_id,) if professional_id else ()
        cursor.execute(f"""
            SELECT p.id, p.name, p.last_name, p.dni,
                COALESCE((SELECT SUM(t.price) FROM treatments t WHERE t.patient_id = p.id AND t.price > 0), 0) as total_charges,
                COALESCE((SELECT SUM(pp.amount) FROM patient_payments pp WHERE pp.patient_id = p.id), 0) as total_payments
            FROM patients p
            {where}
            ORDER BY p.name ASC
        """, params)
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "patient_id": r[0], "patient_name": r[1], "last_name": r[2], "dni": r[3],
                "total_charges": r[4], "total_payments": r[5],
                "balance": r[4] - r[5],
            }
            for r in rows
        ]
