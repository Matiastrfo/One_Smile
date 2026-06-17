from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from domain.user import User, UserCreate, UserInDB
from persistence.user_repository import UserRepository
from services.auth_service import get_password_hash
from api.dependencies import require_admin


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None

router = APIRouter()

@router.post("/users", response_model=User)
def create_professional(user: UserCreate, current_user: User = Depends(require_admin)):
    user_repo = UserRepository()
    hashed_password = get_password_hash(user.password)
    user_in_db = UserInDB(
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        name=user.name,
    )
    try:
        new_user = user_repo.create(user_in_db)
        return new_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users", response_model=List[User])
def list_users(current_user: User = Depends(require_admin)):
    user_repo = UserRepository()
    return user_repo.get_all()

@router.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, body: UserUpdate, current_user: User = Depends(require_admin)):
    user_repo = UserRepository()
    updated = user_repo.update(user_id, body.email, body.role, get_password_hash(body.password) if body.password else None, body.name)
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
    user_repo = UserRepository()
    deleted = user_repo.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"detail": "Usuario eliminado correctamente"}
