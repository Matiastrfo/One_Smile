from pydantic import BaseModel
from typing import Literal, Optional

class AccountEntry(BaseModel):
    id: Optional[int] = None
    patient_id: int
    professional_id: Optional[int] = None
    date: str
    detail: str
    debe: float = 0.0
    haber: float = 0.0
    currency: Literal["ARS", "USD"] = "ARS"
    professional_name: Optional[str] = None
