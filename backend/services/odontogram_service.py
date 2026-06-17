from typing import List, Optional
from persistence.dental_piece_repository import DentalPieceRepository
from domain.dental_piece import DentalPiece, TreatmentType, TreatmentColor

FDI_NUMBERS = [
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41,
    31, 32, 33, 34, 35, 36, 37, 38,
]


class OdontogramService:
    def __init__(self):
        self.repo = DentalPieceRepository()

    def get_odontogram(self, patient_id: int) -> List[DentalPiece]:
        pieces = self.repo.get_by_patient_id(patient_id)
        existing = {p.tooth_number for p in pieces}
        for number in FDI_NUMBERS:
            if number not in existing:
                self.repo.create(patient_id, number)
        if len(existing) < 32:
            pieces = self.repo.get_by_patient_id(patient_id)
        return pieces

    def update_tooth(self, patient_id: int, tooth_number: int, treatment_type: TreatmentType, color: Optional[TreatmentColor], faces: List[str]) -> None:
        self.repo.update_tooth(patient_id, tooth_number, treatment_type, color, faces)
