from pydantic import BaseModel
from typing import Optional

class Patient(BaseModel):
    name: str
    dni: str
    id: Optional[int] = None
