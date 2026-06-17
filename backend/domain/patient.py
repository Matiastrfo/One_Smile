from pydantic import BaseModel
from typing import Optional

class Patient(BaseModel):
    name: str
    dni: Optional[str] = None
    phone: Optional[str] = None
    id: Optional[int] = None
    professional_id: Optional[int] = None
