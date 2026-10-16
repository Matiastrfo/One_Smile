from pydantic import BaseModel
from typing import Optional


class Promotion(BaseModel):
    id: Optional[int] = None
    professional_id: Optional[int] = None
    title: str
    category: str = "General"
    message: Optional[str] = None
    file_path: str = ""
    created_at: str = ""
