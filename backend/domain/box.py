from pydantic import BaseModel
from typing import Optional

class BoxBase(BaseModel):
    name: str

class BoxCreate(BoxBase):
    pass

class BoxUpdate(BoxBase):
    pass

class Box(BoxBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True
