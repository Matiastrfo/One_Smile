from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
import secrets
from domain.user import Token, User, UserInDB
from persistence.user_repository import UserRepository
from persistence.database import get_connection
from services.auth_service import verify_password, create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from api.dependencies import get_current_user
from pydantic import BaseModel, EmailStr
from services.rate_limit import check_lockout, register_failed_attempt, clear_failed_attempts

router = APIRouter()

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

MAX_RECOVER_ATTEMPTS = 5
RECOVER_LOCKOUT_MINUTES = 15


def _check_lockout(cursor, username: str):
    key = f"login:{username}"
    cursor.execute("SELECT locked_until FROM rate_limit_attempts WHERE key = ?", (key,))
    row = cursor.fetchone()
    if row and row[0]:
        locked_until = datetime.fromisoformat(row[0])
        if datetime.utcnow() < locked_until:
            remaining = int((locked_until - datetime.utcnow()).total_seconds() // 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Probá de nuevo en {remaining} minuto(s).",
            )
        cursor.execute("DELETE FROM rate_limit_attempts WHERE key = ?", (key,))


def _register_failed_attempt(cursor, username: str):
    register_failed_attempt(cursor, f"login:{username}", MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES)


def _clear_failed_attempts(cursor, username: str):
    clear_failed_attempts(cursor, f"login:{username}")


class LoginRequest(BaseModel):
    username: str
    password: str

class SetupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class RecoverRequest(BaseModel):
    email: EmailStr
    recovery_code: str
    new_password: str

@router.post("/login", response_model=Token)
def login_for_access_token(request: LoginRequest):
    username = request.username.strip().lower()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        _check_lockout(cursor, username)

        user_repo = UserRepository()
        user_in_db = user_repo.get_by_username(request.username)

        if not user_in_db or not verify_password(request.password, user_in_db.password_hash):
            _register_failed_attempt(cursor, username)
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        _clear_failed_attempts(cursor, username)
        conn.commit()
    finally:
        conn.close()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_in_db.id), "role": user_in_db.role}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer", "role": user_in_db.role, "name": user_in_db.name, "id": user_in_db.id, "email": user_in_db.email}

@router.get("/needs-setup")
def needs_setup():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()
    return {"needs_setup": count == 0}

@router.post("/setup")
def setup_first_admin(body: SetupRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        conn.close()
        raise HTTPException(status_code=400, detail="El sistema ya fue configurado")
    conn.close()

    recovery_code = secrets.token_hex(8).upper()
    recovery_code_fmt = '-'.join([recovery_code[i:i+4] for i in range(0, 16, 4)])
    recovery_hash = get_password_hash(recovery_code)

    user_repo = UserRepository()
    user_in_db = UserInDB(
        email=body.email,
        password_hash=get_password_hash(body.password),
        role="admin",
        name=body.name,
    )
    new_user = user_repo.create(user_in_db, recovery_code_hash=recovery_hash)

    token = create_access_token(
        data={"sub": str(new_user.id), "role": "admin"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "admin",
        "name": new_user.name,
        "id": new_user.id,
        "email": new_user.email,
        "recovery_code": recovery_code_fmt,
    }

@router.post("/recover")
def recover_password(body: RecoverRequest):
    key = f"recover:{body.email.strip().lower()}"
    conn = get_connection()
    try:
        cursor = conn.cursor()
        check_lockout(cursor, key)

        cursor.execute("SELECT id, recovery_code_hash FROM users WHERE LOWER(email) = LOWER(?)", (body.email,))
        row = cursor.fetchone()
        if not row or not row[1]:
            register_failed_attempt(cursor, key, MAX_RECOVER_ATTEMPTS, RECOVER_LOCKOUT_MINUTES)
            conn.commit()
            raise HTTPException(status_code=400, detail="Email no encontrado o sin código de recuperación")

        user_id, recovery_hash = row
        code_clean = body.recovery_code.replace('-', '').replace(' ', '')
        if not verify_password(code_clean, recovery_hash):
            register_failed_attempt(cursor, key, MAX_RECOVER_ATTEMPTS, RECOVER_LOCKOUT_MINUTES)
            conn.commit()
            raise HTTPException(status_code=400, detail="Código de recuperación incorrecto")

        clear_failed_attempts(cursor, key)
        conn.commit()
    finally:
        conn.close()

    user_repo = UserRepository()
    user_repo.update(user_id, password_hash=get_password_hash(body.new_password))
    return {"detail": "Contraseña actualizada correctamente"}

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
