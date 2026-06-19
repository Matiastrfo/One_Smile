from domain.medical_report import MedicalReport
from persistence.database import get_connection

class MedicalReportRepository:
    def insert(self, report: MedicalReport) -> MedicalReport:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medical_reports (patient_id, professional_id, date_time, description) VALUES (?, ?, ?, ?)",
            (report.patient_id, report.professional_id, report.date_time, report.description)
        )
        report.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return report
    
    def get_by_patient(self, patient_id: int) -> list[MedicalReport]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.id, m.patient_id, m.professional_id, m.date_time, m.description, COALESCE(NULLIF(u.name,''), u.email)
            FROM medical_reports m
            LEFT JOIN users u ON m.professional_id = u.id
            WHERE m.patient_id = ?
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        
        reports = []
        for row in rows:
            reports.append(MedicalReport(
                id=row[0], patient_id=row[1], professional_id=row[2], 
                date_time=row[3], description=row[4], professional_email=row[5]
            ))
        return reports
