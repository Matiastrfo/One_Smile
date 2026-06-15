from typing import List
from persistence.dental_piece_repository import DentalPieceRepository
from domain.dental_piece import DentalPiece, DentalPieceCreate, DentalPieceCondition
from persistence.treatment_repository import TreatmentRepository
from domain.treatment import Treatment
from datetime import datetime

class OdontogramService:
    def __init__(self):
        self.piece_repo = DentalPieceRepository()
        # En la vida real haríamos dependency injection
        from persistence.treatment_repository import TreatmentRepository
        self.treatment_repo = TreatmentRepository()

    def get_odontogram(self, patient_id: int) -> List[DentalPiece]:
        pieces = self.piece_repo.get_by_patient_id(patient_id)
        
        fdi_numbers = [
            18, 17, 16, 15, 14, 13, 12, 11,
            21, 22, 23, 24, 25, 26, 27, 28,
            48, 47, 46, 45, 44, 43, 42, 41,
            31, 32, 33, 34, 35, 36, 37, 38
        ]
        
        existing_numbers = {p.tooth_number for p in pieces}
        
        # Generar los dientes faltantes si no existen todos
        if len(existing_numbers) < 32:
            for number in fdi_numbers:
                if number not in existing_numbers:
                    self.piece_repo.create(DentalPieceCreate(
                        patient_id=patient_id,
                        tooth_number=number,
                        condition=DentalPieceCondition.HEALTHY
                    ))
            pieces = self.piece_repo.get_by_patient_id(patient_id)
            
        return pieces

    def record_tooth_treatment(self, patient_id: int, tooth_number: int, professional_id: int, condition: DentalPieceCondition, description: str, price: float) -> None:
        # 1. Update piece condition
        self.piece_repo.update_condition(patient_id, tooth_number, condition)
        
        # 2. Record treatment
        desc = description.strip() if description else f"Cambio de estado a {condition.value}"
        self.treatment_repo.insert(Treatment(
            patient_id=patient_id,
            professional_id=professional_id,
            tooth_number=tooth_number,
            description=desc,
            price=price,
            date_time=datetime.now().isoformat()
        ))

    def get_tooth_treatments(self, patient_id: int, tooth_number: int):
        treatments = self.treatment_repo.get_by_patient(patient_id)
        return [t for t in treatments if t.tooth_number == tooth_number]
