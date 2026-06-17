from pydantic import BaseModel
from typing import Optional

class BoxPaymentBase(BaseModel):
    professional_id: int
    box_id: int
    shift: str  # 'MORNING' or 'AFTERNOON'
    month_year: str  # 'YYYY-MM'
    status: str = "PENDING"
    payment_date: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    contract_id: Optional[int] = None

class BoxPaymentCreate(BoxPaymentBase):
    pass

class BoxPaymentUpdate(BaseModel):
    status: Optional[str] = None
    payment_date: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None

class BoxPayment(BoxPaymentBase):
    id: int
    professional_email: Optional[str] = None
    box_name: Optional[str] = None
    contract_duration: Optional[int] = None

    class Config:
        from_attributes = True
