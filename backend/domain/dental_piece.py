from pydantic import BaseModel
from enum import Enum
from typing import Optional, List


class TreatmentType(str, Enum):
    NONE = "NONE"
    CARIES = "CARIES"
    FILLING = "FILLING"
    EXTRACTION_PENDING = "EXTRACTION_PENDING"
    EXTRACTED = "EXTRACTED"
    ABSENT = "ABSENT"
    CROWN = "CROWN"
    RX = "RX"
    IMPLANT = "IMPLANT"
    PERNO = "PERNO"
    ENDODONCIA = "ENDODONCIA"
    PROTESIS = "PROTESIS"
    PROTESIS_PARCIAL = "PROTESIS_PARCIAL"
    PUENTE = "PUENTE"


class TreatmentColor(str, Enum):
    BLUE = "BLUE"
    RED = "RED"
    GREEN = "GREEN"


class DentalPiece(BaseModel):
    id: int
    patient_id: int
    tooth_number: int
    treatment_type: TreatmentType = TreatmentType.NONE
    color: Optional[TreatmentColor] = None
    faces: List[str] = []

    class Config:
        from_attributes = True


class ToothUpdate(BaseModel):
    treatment_type: TreatmentType
    color: Optional[TreatmentColor] = None
    faces: List[str] = []


# Legacy aliases — kept for compatibility with treatment history endpoints
class DentalPieceCondition(str, Enum):
    HEALTHY = "HEALTHY"
    CARIES = "CARIES"
    FILLED = "FILLED"
    EXTRACTED = "EXTRACTED"
    CROWN = "CROWN"
    IMPLANT = "IMPLANT"


class ToothTreatmentCreate(BaseModel):
    condition: DentalPieceCondition
    description: Optional[str] = ""
    price: float = 0.0
