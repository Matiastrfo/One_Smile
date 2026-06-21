from pydantic import BaseModel
from typing import Optional

class Appointment(BaseModel):
    patient_id: int
    date_time: str
    reason: str
    status: str = "PENDING"
    professional_id: Optional[int] = None
    id: Optional[int] = None
    notes: Optional[str] = None

    def change_status(self, new_status: str):
        valid_statuses = ["PENDING", "ATTENDED", "ABSENT", "CANCELLED"]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of {valid_statuses}")
        self.status = new_status
