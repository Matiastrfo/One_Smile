from pydantic import BaseModel
from typing import Optional

class DiagnosticImage(BaseModel):
    id: Optional[int] = None
    patient_id: int
    professional_id: Optional[int] = None
    date: str
    category: str = "Radiografía"
    description: Optional[str] = None
    file_path: str = ""
    professional_name: Optional[str] = None
