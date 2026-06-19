import os
import secrets
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional
from domain.user import UserInDB, TokenData
import bcrypt

def _load_secret() -> str:
    key = os.getenv("JWT_SECRET_KEY", "")
    if not key:
        _path = os.path.join(os.path.dirname(__file__), "..", ".jwt_secret")
        if os.path.exists(_path):
            with open(_path) as f:
                key = f.read().strip()
        if not key:
            key = secrets.token_hex(32)
            with open(_path, "w") as f:
                f.write(key)
    return key

SECRET_KEY = _load_secret()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 8)))  # 8 horas

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
