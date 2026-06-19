from pydantic import BaseModel
from typing import Optional

class PatientImage(BaseModel):
    id: Optional[int] = None
    patient_id: int
    professional_id: Optional[int] = None
    date: str
    treatment_type: str = "GENERAL"
    description: Optional[str] = None
    file_path: str = ""
    professional_name: Optional[str] = None
