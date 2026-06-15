from pydantic import BaseModel
from typing import Optional

class MedicalReport(BaseModel):
    patient_id: int
    professional_id: Optional[int] = None
    professional_email: Optional[str] = None
    date_time: str
    description: str
    id: Optional[int] = None
