from pydantic import BaseModel
from typing import Optional

class Patient(BaseModel):
    name: str
    dni: Optional[str] = None
    phone: Optional[str] = None
    id: Optional[int] = None
    professional_id: Optional[int] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    diseases: Optional[str] = None
    medications: Optional[str] = None
    observations: Optional[str] = None
