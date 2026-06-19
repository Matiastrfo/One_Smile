from pydantic import BaseModel, EmailStr
from typing import Optional

class User(BaseModel):
    id: Optional[int] = None
    email: EmailStr
    role: str
    name: str = ""
    avatar_path: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "profesional"
    name: str = ""

class UserInDB(User):
    password_hash: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str = ""
    email: str = ""
    id: Optional[int] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
