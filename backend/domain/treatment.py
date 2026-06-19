from pydantic import BaseModel
from typing import Optional

class Treatment(BaseModel):
    patient_id: int
    professional_id: Optional[int] = None
    professional_email: Optional[str] = None
    date_time: str
    description: str
    price: float = 0.0
    id: Optional[int] = None
    tooth_number: Optional[int] = None
    odontogram_type: Optional[str] = None
    odontogram_color: Optional[str] = None
    odontogram_faces: Optional[str] = None
    arch_teeth: Optional[str] = None
