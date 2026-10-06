from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    empId: str
    phone: str = "-"
    branch: str = "Delhi"
    role: Literal["User", "Admin"] = "User"
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    branch: str | None = None
    status: Literal["Active", "Inactive"] | None = None
    role: Literal["User", "Admin"] | None = None


class PasswordUpdate(BaseModel):
    newPassword: str = Field(min_length=6)


class UserOut(BaseModel):
    id: str  # empId is used as the public id, matching the frontend
    name: str
    email: EmailStr
    empId: str
    phone: str
    branch: str
    role: str
    status: str
