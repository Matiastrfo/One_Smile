from pydantic import BaseModel
from typing import Optional

DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

class ContractBase(BaseModel):
    professional_id: int
    box_id: int
    shift: str        # 'MORNING' or 'AFTERNOON'
    day_of_week: str  # 'MONDAY'..'FRIDAY'
    start_month_year: str
    duration_months: int
    status: str = "ACTIVE"  # ACTIVE, TRANSFERRED, FINISHED
    previous_contract_id: Optional[int] = None

class ContractCreate(ContractBase):
    pass

class ContractAssign(BaseModel):
    professional_id: int
    box_id: int
    shift: str
    day_of_week: str
    duration_months: int

class Contract(ContractBase):
    id: int
    professional_email: Optional[str] = None
    box_name: Optional[str] = None
    months_generated: Optional[int] = None

    class Config:
        from_attributes = True

class TransferRequest(BaseModel):
    new_box_id: int
    new_shift: str
    new_day_of_week: str
    swap: bool = False
