from domain.patient import Patient
from domain.treatment import Treatment
from domain.medical_report import MedicalReport
from domain.patient_report import PatientReport
from domain.dental_piece import TreatmentType, TreatmentColor
import json
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

    def get_all_patients(self, search: str = None, professional_id: int = None, page: int = 1, page_size: int = 50) -> dict:
        items = self.repository.get_all(search, professional_id, page, page_size)
        total = self.repository.count_all(search, professional_id)
        return {"items": items, "total": total, "page": page, "page_size": page_size}

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

        # Si el tratamiento borrado no era el que representaba el estado activo de la pieza
        # (mismo tipo y color), no hay nada que recalcular: la pieza sigue reflejando otro
        # tratamiento y este solo desaparece del historial.
        piece = odontogram_service.get_piece(patient_id, tooth)
        piece_color = piece.color.value if piece and piece.color else None
        if not piece or piece.treatment_type.value != treatment.odontogram_type or piece_color != treatment.odontogram_color:
            return

        remaining = self.treatment_repo.get_by_patient(patient_id)

        # No resetear si el diente aún pertenece a una arcada activa (via arch_teeth)
        still_in_arch = any(
            t.arch_teeth and str(tooth) in t.arch_teeth.split(',')
            for t in remaining
        )
        if still_in_arch:
            return

        # El tratamiento borrado ERA el estado activo de la pieza: buscar el tratamiento
        # directo mas reciente que quede para este diente y que la pieza lo herede, o
        # resetear a NONE si no queda ninguno.
        direct_remaining = [
            t for t in remaining
            if t.tooth_number == tooth and not t.arch_teeth and t.odontogram_type and t.odontogram_type != 'NONE'
        ]
        if direct_remaining:
            latest = max(direct_remaining, key=lambda t: (t.date_time or '', t.id or 0))
            try:
                faces = json.loads(latest.odontogram_faces or '[]')
            except (TypeError, ValueError):
                faces = []
            latest_color = TreatmentColor(latest.odontogram_color) if latest.odontogram_color else None
            odontogram_service.update_tooth(patient_id, tooth, TreatmentType(latest.odontogram_type), latest_color, faces)
        else:
            odontogram_service.update_tooth(patient_id, tooth, TreatmentType.NONE, None, [])
        
    def add_medical_report(self, report: MedicalReport) -> MedicalReport:
        return self.medical_report_repo.insert(report)

    def delete_medical_report(self, report_id: int) -> None:
        self.medical_report_repo.delete(report_id)

    def update_patient(self, id: int, patient: Patient) -> Patient:
        patient.id = id
        self.repository.update(patient)
        return patient

    def delete_patient(self, id: int) -> None:
        self.repository.delete(id)

    def update_dentition_mode(self, id: int, mode: str) -> Patient:
        self.repository.update_dentition_mode(id, mode)
        return self.repository.get_by_id(id)
