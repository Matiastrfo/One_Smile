from pydantic import BaseModel
from typing import Optional

class Lab(BaseModel):
    id: Optional[int] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    price_list_path: Optional[str] = None
    created_at: str = ""

class LabJob(BaseModel):
    id: Optional[int] = None
    lab_id: int
    patient_id: int
    professional_id: Optional[int] = None
    description: str
    sent_date: str
    status: str = "SENT"  # SENT | RECEIVED
    received_date: Optional[str] = None
    notes: Optional[str] = None
    lab_name: Optional[str] = None
    patient_name: Optional[str] = None
    professional_name: Optional[str] = None
