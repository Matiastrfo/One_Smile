from pydantic import BaseModel
from typing import Optional

class PatientPayment(BaseModel):
    id: Optional[int] = None
    patient_id: int
    professional_id: Optional[int] = None
    date: str
    amount: float
    description: str = "Pago"
    professional_name: Optional[str] = None
