from domain.patient import Patient
from domain.treatment import Treatment
from domain.medical_report import MedicalReport
from domain.patient_report import PatientReport
from persistence.patient_repository import PatientRepository
from persistence.appointment_repository import AppointmentRepository
from persistence.treatment_repository import TreatmentRepository
from persistence.medical_report_repository import MedicalReportRepository
from typing import List

class PatientService:
    def __init__(self):
        self.repository = PatientRepository()
        self.appointment_repo = AppointmentRepository()
        self.treatment_repo = TreatmentRepository()
        self.medical_report_repo = MedicalReportRepository()

    def create_patient(self, patient: Patient) -> Patient:
        return self.repository.insert(patient)

    def get_all_patients(self, search: str = None, professional_id: int = None) -> List[Patient]:
        return self.repository.get_all(search, professional_id)

    def get_patient_report(self, patient_id: int) -> PatientReport:
        patient = self.repository.get_by_id(patient_id)
        if not patient:
            raise ValueError("Paciente no encontrado")
            
        appointments = self.appointment_repo.get_by_patient(patient_id)
        treatments = self.treatment_repo.get_by_patient(patient_id)
        medical_reports = self.medical_report_repo.get_by_patient(patient_id)
        
        return PatientReport(
            patient=patient,
            appointments=appointments,
            treatments=treatments,
            medical_reports=medical_reports
        )
        
    def add_treatment(self, treatment: Treatment) -> Treatment:
        return self.treatment_repo.insert(treatment)

    def update_treatment(self, treatment_id: int, treatment: Treatment) -> Treatment:
        return self.treatment_repo.update(treatment_id, treatment)
        
    def add_medical_report(self, report: MedicalReport) -> MedicalReport:
        return self.medical_report_repo.insert(report)

    def update_patient(self, id: int, patient: Patient) -> Patient:
        patient.id = id
        self.repository.update(patient)
        return patient

    def delete_patient(self, id: int) -> None:
        self.repository.delete(id)
