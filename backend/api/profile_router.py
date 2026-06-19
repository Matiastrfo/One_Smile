import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from domain.user import User
from api.dependencies import get_current_user
from persistence.user_repository import UserRepository

router = APIRouter()
user_repo = UserRepository()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "avatars")

@router.get("/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    return user_repo.get_by_id(current_user.id)

MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

@router.post("/avatar", response_model=User)
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG o WEBP")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande. Máximo 5MB")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = f"{current_user.id}_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    avatar_path = f"/uploads/avatars/{filename}"
    updated = user_repo.update(current_user.id, avatar_path=avatar_path)
    return updated
