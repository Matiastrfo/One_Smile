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
    # Datos filiatorios
    last_name: Optional[str] = None
    social_security: Optional[str] = None
    social_security_number: Optional[str] = None
    address: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[str] = None
    photo_path: Optional[str] = None
