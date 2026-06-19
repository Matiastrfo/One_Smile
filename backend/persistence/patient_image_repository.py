from typing import List
from domain.patient_image import PatientImage
from persistence.database import get_connection

class PatientImageRepository:
    def insert(self, image: PatientImage) -> PatientImage:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patient_images (patient_id, professional_id, date, treatment_type, description, file_path) VALUES (?, ?, ?, ?, ?, ?)",
            (image.patient_id, image.professional_id, image.date, image.treatment_type, image.description, image.file_path)
        )
        image.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return image

    def get_by_patient(self, patient_id: int) -> List[PatientImage]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pi.id, pi.patient_id, pi.professional_id, pi.date, pi.treatment_type, pi.description, pi.file_path,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM patient_images pi
            LEFT JOIN users u ON pi.professional_id = u.id
            WHERE pi.patient_id = ?
            ORDER BY pi.treatment_type ASC, pi.date DESC, pi.id DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            PatientImage(id=r[0], patient_id=r[1], professional_id=r[2], date=r[3],
                         treatment_type=r[4], description=r[5], file_path=r[6], professional_name=r[7])
            for r in rows
        ]

    def get_by_id(self, image_id: int) -> PatientImage | None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, professional_id, date, treatment_type, description, file_path FROM patient_images WHERE id = ?", (image_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return PatientImage(id=row[0], patient_id=row[1], professional_id=row[2], date=row[3], treatment_type=row[4], description=row[5], file_path=row[6])

    def delete(self, image_id: int) -> str | None:
        img = self.get_by_id(image_id)
        if not img:
            return None
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patient_images WHERE id = ?", (image_id,))
        conn.commit()
        conn.close()
        return img.file_path
