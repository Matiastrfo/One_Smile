from fastapi import APIRouter, Depends
from domain.schedule_config import ScheduleConfig
from domain.user import User
from api.dependencies import get_current_user
from persistence.schedule_config_repository import ScheduleConfigRepository

router = APIRouter()
repo = ScheduleConfigRepository()

@router.get("/", response_model=ScheduleConfig)
def get_schedule_config(current_user: User = Depends(get_current_user)):
    return repo.get_by_professional(current_user.id)

@router.put("/", response_model=ScheduleConfig)
def save_schedule_config(config: ScheduleConfig, current_user: User = Depends(get_current_user)):
    config.professional_id = current_user.id
    repo.save(current_user.id, config)
    return repo.get_by_professional(current_user.id)
