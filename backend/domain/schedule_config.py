from pydantic import BaseModel
from typing import Optional

DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

class DaySchedule(BaseModel):
    day_of_week: str
    enabled: bool = False
    start_time: str = "09:00"
    end_time: str = "18:00"
    slot_duration: int = 60  # minutos

class ScheduleConfig(BaseModel):
    professional_id: Optional[int] = None
    days: list[DaySchedule] = []
