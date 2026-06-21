from domain.patient import Patient
from persistence.database import get_connection

_COLS = "id, name, dni, phone, professional_id, blood_type, allergies, diseases, medications, observations, last_name, social_security, social_security_number, address, province, city, email, birth_date, photo_path"

def _map(r) -> Patient:
    return Patient(
        id=r[0], name=r[1], dni=r[2], phone=r[3], professional_id=r[4],
        blood_type=r[5], allergies=r[6], diseases=r[7], medications=r[8], observations=r[9],
        last_name=r[10], social_security=r[11], social_security_number=r[12],
        address=r[13], province=r[14], city=r[15], email=r[16], birth_date=r[17], photo_path=r[18],
    )

class PatientRepository:
    def insert(self, patient: Patient) -> Patient:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO patients (name, dni, phone, professional_id, email) VALUES (?, ?, ?, ?, ?)",
            (patient.name, patient.dni, patient.phone, patient.professional_id, patient.email)
        )
        patient.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return patient

    def get_all(self, search: str = None, professional_id: int = None) -> list[Patient]:
        conn = get_connection()
        cursor = conn.cursor()
        conditions, params = [], []
        if professional_id is not None:
            conditions.append("professional_id = ?"); params.append(professional_id)
        if search:
            conditions.append("(name LIKE ? OR last_name LIKE ? OR dni LIKE ? OR phone LIKE ?)")
            params.extend([f"%{search}%"] * 4)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        cursor.execute(f"SELECT {_COLS} FROM patients {where}", params)
        rows = cursor.fetchall()
        conn.close()
        return [_map(r) for r in rows]

    def get_by_id(self, patient_id: int) -> Patient | None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT {_COLS} FROM patients WHERE id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()
        return _map(row) if row else None

    def update(self, patient: Patient) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE patients SET
                name=?, dni=?, phone=?, blood_type=?, allergies=?, diseases=?, medications=?, observations=?,
                last_name=?, social_security=?, social_security_number=?, address=?, province=?, city=?,
                email=?, birth_date=?, photo_path=?
               WHERE id=?""",
            (patient.name, patient.dni, patient.phone, patient.blood_type, patient.allergies,
             patient.diseases, patient.medications, patient.observations,
             patient.last_name, patient.social_security, patient.social_security_number,
             patient.address, patient.province, patient.city,
             patient.email, patient.birth_date, patient.photo_path,
             patient.id)
        )
        conn.commit()
        conn.close()

    def delete(self, patient_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
        conn.close()
