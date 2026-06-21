from pydantic import BaseModel
from typing import Optional, List

class BudgetItem(BaseModel):
    id: Optional[int] = None
    budget_id: Optional[int] = None
    description: str
    quantity: int = 1
    unit_price: float = 0.0

class Budget(BaseModel):
    id: Optional[int] = None
    patient_id: int
    professional_id: Optional[int] = None
    created_at: Optional[str] = None
    notes: Optional[str] = None
    status: str = "PENDING"
    items: List[BudgetItem] = []
    professional_name: Optional[str] = None
