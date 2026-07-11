from pydantic import BaseModel

class TreatmentPrice(BaseModel):
    treatment_type: str
    price: float = 0.0
