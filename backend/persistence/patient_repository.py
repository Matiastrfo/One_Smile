from domain.patient import Patient
from persistence.database import get_connection

class PatientRepository:
    def insert(self, patient: Patient) -> Patient:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patients (name, dni) VALUES (?, ?)",
            (patient.name, patient.dni)
        )
        patient.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return patient
    
    def get_all(self, search: str = None) -> list[Patient]:
        conn = get_connection()
        cursor = conn.cursor()
        
        if search:
            search_term = f"%{search}%"
            cursor.execute("SELECT id, name, dni FROM patients WHERE name LIKE ? OR dni LIKE ?", (search_term, search_term))
        else:
            cursor.execute("SELECT id, name, dni FROM patients")
            
        rows = cursor.fetchall()
        conn.close()
        
        patients = []
        for row in rows:
            patients.append(Patient(id=row[0], name=row[1], dni=row[2]))
        return patients

    def get_by_id(self, patient_id: int) -> Patient | None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, dni FROM patients WHERE id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Patient(id=row[0], name=row[1], dni=row[2])
        return None

    def update(self, patient: Patient) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE patients SET name = ?, dni = ? WHERE id = ?",
            (patient.name, patient.dni, patient.id)
        )
        conn.commit()
        conn.close()

    def delete(self, patient_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
        conn.close()
