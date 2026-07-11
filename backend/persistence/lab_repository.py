from typing import List, Optional
from domain.lab import Lab, LabJob
from persistence.database import get_connection


class LabRepository:
    def get_all(self) -> List[Lab]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, email, price_list_path, created_at FROM labs ORDER BY name ASC")
        rows = cursor.fetchall()
        conn.close()
        return [Lab(id=r[0], name=r[1], phone=r[2], email=r[3], price_list_path=r[4], created_at=r[5]) for r in rows]

    def get_by_id(self, lab_id: int) -> Optional[Lab]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, email, price_list_path, created_at FROM labs WHERE id = ?", (lab_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return Lab(id=row[0], name=row[1], phone=row[2], email=row[3], price_list_path=row[4], created_at=row[5])

    def create(self, lab: Lab) -> Lab:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO labs (name, phone, email, price_list_path, created_at) VALUES (?, ?, ?, ?, ?)",
            (lab.name, lab.phone, lab.email, lab.price_list_path, lab.created_at),
        )
        lab.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return lab

    def update(self, lab_id: int, name: str, phone: Optional[str], email: Optional[str]) -> Optional[Lab]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE labs SET name = ?, phone = ?, email = ? WHERE id = ?",
            (name, phone, email, lab_id),
        )
        conn.commit()
        conn.close()
        return self.get_by_id(lab_id)

    def update_price_list(self, lab_id: int, price_list_path: str):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE labs SET price_list_path = ? WHERE id = ?", (price_list_path, lab_id))
        conn.commit()
        conn.close()

    def delete(self, lab_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM labs WHERE id = ?", (lab_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted


class LabJobRepository:
    _SELECT = """
        SELECT lj.id, lj.lab_id, lj.patient_id, lj.professional_id, lj.description, lj.sent_date,
               lj.status, lj.received_date, lj.notes,
               l.name, p.name, COALESCE(NULLIF(u.name,''), u.email)
        FROM lab_jobs lj
        JOIN labs l ON lj.lab_id = l.id
        JOIN patients p ON lj.patient_id = p.id
        LEFT JOIN users u ON lj.professional_id = u.id
    """

    def _row_to_job(self, r) -> LabJob:
        return LabJob(
            id=r[0], lab_id=r[1], patient_id=r[2], professional_id=r[3], description=r[4],
            sent_date=r[5], status=r[6], received_date=r[7], notes=r[8],
            lab_name=r[9], patient_name=r[10], professional_name=r[11],
        )

    def get_all(self) -> List[LabJob]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(self._SELECT + " ORDER BY lj.sent_date DESC, lj.id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_job(r) for r in rows]

    def get_by_lab(self, lab_id: int) -> List[LabJob]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(self._SELECT + " WHERE lj.lab_id = ? ORDER BY lj.sent_date DESC, lj.id DESC", (lab_id,))
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_job(r) for r in rows]

    def get_by_patient(self, patient_id: int) -> List[LabJob]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(self._SELECT + " WHERE lj.patient_id = ? ORDER BY lj.sent_date DESC, lj.id DESC", (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_job(r) for r in rows]

    def get_by_id(self, job_id: int) -> Optional[LabJob]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(self._SELECT + " WHERE lj.id = ?", (job_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_job(row) if row else None

    def create(self, job: LabJob) -> LabJob:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO lab_jobs (lab_id, patient_id, professional_id, description, sent_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (job.lab_id, job.patient_id, job.professional_id, job.description, job.sent_date, job.status, job.notes),
        )
        job.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self.get_by_id(job.id)

    def mark_received(self, job_id: int, received_date: str) -> Optional[LabJob]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE lab_jobs SET status = 'RECEIVED', received_date = ? WHERE id = ?",
            (received_date, job_id),
        )
        conn.commit()
        conn.close()
        return self.get_by_id(job_id)

    def delete(self, job_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM lab_jobs WHERE id = ?", (job_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
