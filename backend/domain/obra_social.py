from pydantic import BaseModel
from typing import Optional


class ObraSocial(BaseModel):
    id: Optional[int] = None
    name: str
    professional_id: Optional[int] = None  # None = catálogo global
    is_custom: bool = False
    arancel_path: Optional[str] = None
    norma_path: Optional[str] = None
