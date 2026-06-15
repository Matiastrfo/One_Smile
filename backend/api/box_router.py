from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from domain.box import Box, BoxCreate, BoxUpdate
from persistence.box_repository import BoxRepository
from api.dependencies import require_admin
from domain.user import User

router = APIRouter()
box_repo = BoxRepository()

@router.post("/", response_model=Box, status_code=status.HTTP_201_CREATED)
def create_box(box: BoxCreate, current_user: User = Depends(require_admin)):
    return box_repo.create(box)

@router.get("/", response_model=List[Box])
def get_boxes(current_user: User = Depends(require_admin)):
    return box_repo.get_all()

@router.get("/{box_id}", response_model=Box)
def get_box(box_id: int, current_user: User = Depends(require_admin)):
    box = box_repo.get_by_id(box_id)
    if not box:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    return box

@router.put("/{box_id}", response_model=Box)
def update_box(box_id: int, box: BoxUpdate, current_user: User = Depends(require_admin)):
    updated_box = box_repo.update(box_id, box)
    if not updated_box:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    return updated_box

@router.delete("/{box_id}")
def delete_box(box_id: int, current_user: User = Depends(require_admin)):
    deleted = box_repo.delete(box_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    return {"detail": "Box eliminado correctamente"}
