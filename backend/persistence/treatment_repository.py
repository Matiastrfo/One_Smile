from domain.treatment import Treatment
from persistence.database import get_connection

class TreatmentRepository:
    def insert(self, treatment: Treatment) -> Treatment:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO treatments (patient_id, professional_id, date_time, description, price, tooth_number) VALUES (?, ?, ?, ?, ?, ?)",
            (treatment.patient_id, treatment.professional_id, treatment.date_time, treatment.description, treatment.price, treatment.tooth_number)
        )
        treatment.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return treatment
    
    def update(self, treatment_id: int, treatment: Treatment) -> Treatment:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE treatments SET date_time = ?, description = ?, price = ? WHERE id = ?",
            (treatment.date_time, treatment.description, treatment.price, treatment_id)
        )
        conn.commit()
        conn.close()
        treatment.id = treatment_id
        return treatment

    def get_by_patient(self, patient_id: int) -> list[Treatment]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.id, t.patient_id, t.professional_id, t.date_time, t.description, t.price, t.tooth_number, u.email 
            FROM treatments t
            LEFT JOIN users u ON t.professional_id = u.id
            WHERE t.patient_id = ?
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        
        treatments = []
        for row in rows:
            treatments.append(Treatment(
                id=row[0], patient_id=row[1], professional_id=row[2], 
                date_time=row[3], description=row[4], price=row[5],
                tooth_number=row[6], professional_email=row[7]
            ))
        return treatments
