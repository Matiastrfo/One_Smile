from domain.patient import Patient
from persistence.database import get_connection

class PatientRepository:
    def insert(self, patient: Patient) -> Patient:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patients (name, dni, phone, professional_id) VALUES (?, ?, ?, ?)",
            (patient.name, patient.dni, patient.phone, patient.professional_id)
        )
        patient.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return patient

    def get_all(self, search: str = None, professional_id: int = None) -> list[Patient]:
        conn = get_connection()
        cursor = conn.cursor()

        conditions = []
        params = []

        if professional_id is not None:
            conditions.append("professional_id = ?")
            params.append(professional_id)

        if search:
            conditions.append("(name LIKE ? OR dni LIKE ? OR phone LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        cursor.execute(f"SELECT id, name, dni, phone, professional_id FROM patients {where}", params)

        rows = cursor.fetchall()
        conn.close()
        return [Patient(id=row[0], name=row[1], dni=row[2], phone=row[3], professional_id=row[4]) for row in rows]

    def get_by_id(self, patient_id: int) -> Patient | None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, dni, phone, professional_id FROM patients WHERE id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return Patient(id=row[0], name=row[1], dni=row[2], phone=row[3], professional_id=row[4])
        return None

    def update(self, patient: Patient) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE patients SET name = ?, dni = ?, phone = ? WHERE id = ?",
            (patient.name, patient.dni, patient.phone, patient.id)
        )
        conn.commit()
        conn.close()

    def delete(self, patient_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
        conn.close()
