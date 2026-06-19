from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from domain.user import Token, User
from persistence.user_repository import UserRepository
from services.auth_service import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from api.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=Token)
def login_for_access_token(request: LoginRequest):
    user_repo = UserRepository()
    user_in_db = user_repo.get_by_username(request.username)

    if not user_in_db or not verify_password(request.password, user_in_db.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_in_db.id), "role": user_in_db.role}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer", "role": user_in_db.role, "name": user_in_db.name, "id": user_in_db.id, "email": user_in_db.email}

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

class UpdateProfileRequest(BaseModel):
    name: str

@router.put("/me", response_model=User)
def update_profile(body: UpdateProfileRequest, current_user: User = Depends(get_current_user)):
    user_repo = UserRepository()
    updated = user_repo.update(current_user.id, name=body.name.strip())
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated
