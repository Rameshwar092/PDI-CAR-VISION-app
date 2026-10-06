from pydantic import BaseModel, EmailStr
from .user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str | None = None  # which login tab was used; informational only


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
