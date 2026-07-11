from fastapi import APIRouter, Depends
from typing import List
from domain.treatment_price import TreatmentPrice
from domain.user import User
from persistence.treatment_price_repository import TreatmentPriceRepository
from api.dependencies import get_current_user

router = APIRouter()
repo = TreatmentPriceRepository()

@router.get("/", response_model=List[TreatmentPrice])
def get_treatment_prices(current_user: User = Depends(get_current_user)):
    return repo.get_by_professional(current_user.id)

@router.put("/")
def save_treatment_prices(prices: List[TreatmentPrice], current_user: User = Depends(get_current_user)):
    repo.save_all(current_user.id, prices)
    return {"message": "Lista de precios guardada"}
