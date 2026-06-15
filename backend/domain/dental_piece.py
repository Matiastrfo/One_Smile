from pydantic import BaseModel
from enum import Enum
from typing import Optional

class DentalPieceCondition(str, Enum):
    HEALTHY = "HEALTHY"
    CARIES = "CARIES"
    FILLED = "FILLED"
    EXTRACTED = "EXTRACTED"
    CROWN = "CROWN"
    IMPLANT = "IMPLANT"

class DentalPieceBase(BaseModel):
    patient_id: int
    tooth_number: int
    condition: DentalPieceCondition = DentalPieceCondition.HEALTHY

class DentalPieceCreate(DentalPieceBase):
    pass

class DentalPieceUpdate(BaseModel):
    condition: DentalPieceCondition

class DentalPiece(DentalPieceBase):
    id: int

    class Config:
        from_attributes = True

class ToothTreatmentCreate(BaseModel):
    condition: DentalPieceCondition
    description: Optional[str] = ""
    price: float = 0.0
