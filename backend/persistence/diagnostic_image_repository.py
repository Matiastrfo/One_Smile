from typing import List
from domain.diagnostic_image import DiagnosticImage
from persistence.database import get_connection

class DiagnosticImageRepository:
    def insert(self, image: DiagnosticImage) -> DiagnosticImage:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patient_diagnostic_images (patient_id, professional_id, date, category, description, file_path) VALUES (?, ?, ?, ?, ?, ?)",
            (image.patient_id, image.professional_id, image.date, image.category, image.description, image.file_path)
        )
        image.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return image

    def get_by_patient(self, patient_id: int) -> List[DiagnosticImage]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT di.id, di.patient_id, di.professional_id, di.date, di.category, di.description, di.file_path,
                   COALESCE(NULLIF(u.name,''), u.email)
            FROM patient_diagnostic_images di
            LEFT JOIN users u ON di.professional_id = u.id
            WHERE di.patient_id = ?
            ORDER BY di.category ASC, di.date DESC, di.id DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            DiagnosticImage(id=r[0], patient_id=r[1], professional_id=r[2], date=r[3],
                             category=r[4], description=r[5], file_path=r[6], professional_name=r[7])
            for r in rows
        ]

    def get_by_id(self, image_id: int) -> DiagnosticImage | None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, professional_id, date, category, description, file_path FROM patient_diagnostic_images WHERE id = ?", (image_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return DiagnosticImage(id=row[0], patient_id=row[1], professional_id=row[2], date=row[3], category=row[4], description=row[5], file_path=row[6])

    def delete(self, image_id: int) -> str | None:
        img = self.get_by_id(image_id)
        if not img:
            return None
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patient_diagnostic_images WHERE id = ?", (image_id,))
        conn.commit()
        conn.close()
        return img.file_path
