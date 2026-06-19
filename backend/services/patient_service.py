from domain.patient import Patient
from domain.treatment import Treatment
from domain.medical_report import MedicalReport
from domain.patient_report import PatientReport
from domain.dental_piece import TreatmentType
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

    def get_patient(self, patient_id: int) -> Patient | None:
        return self.repository.get_by_id(patient_id)

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

    def delete_treatment(self, patient_id: int, treatment_id: int, odontogram_service=None) -> None:
        treatment = self.treatment_repo.get_by_id(treatment_id)
        self.treatment_repo.delete(treatment_id)

        if not treatment or not treatment.tooth_number or not odontogram_service:
            return

        arch_types = {'PROTESIS_PARCIAL', 'PUENTE', 'PROTESIS'}

        # Registros de arcada: el frontend ya resetea los dental_pieces via onArchUpdate
        if treatment.odontogram_type in arch_types or treatment.arch_teeth:
            return

        tooth = treatment.tooth_number
        remaining = self.treatment_repo.get_by_patient(patient_id)

        # No resetear si el diente aún pertenece a una arcada activa (via arch_teeth)
        still_in_arch = any(
            t.arch_teeth and str(tooth) in t.arch_teeth.split(',')
            for t in remaining
        )
        if still_in_arch:
            return

        # No resetear si quedan otros tratamientos directos para este diente
        still_has_direct = any(t.tooth_number == tooth for t in remaining)
        if still_has_direct:
            return

        odontogram_service.update_tooth(patient_id, tooth, TreatmentType.NONE, None, [])
        
    def add_medical_report(self, report: MedicalReport) -> MedicalReport:
        return self.medical_report_repo.insert(report)

    def update_patient(self, id: int, patient: Patient) -> Patient:
        patient.id = id
        self.repository.update(patient)
        return patient

    def delete_patient(self, id: int) -> None:
        self.repository.delete(id)
