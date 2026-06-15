from pydantic import BaseModel
from typing import Optional

class BoxBase(BaseModel):
    name: str
    professional_morning_id: Optional[int] = None
    professional_afternoon_id: Optional[int] = None
    contract_duration_morning: int = 1
    contract_duration_afternoon: int = 1
    specialty_morning: Optional[str] = None
    specialty_afternoon: Optional[str] = None

class BoxCreate(BoxBase):
    pass

class BoxUpdate(BoxBase):
    pass

class Box(BoxBase):
    id: int
    professional_morning_email: Optional[str] = None
    professional_afternoon_email: Optional[str] = None

    class Config:
        from_attributes = True
