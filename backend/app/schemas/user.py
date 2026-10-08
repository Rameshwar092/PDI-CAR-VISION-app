from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    empId: str = Field(..., min_length=1)

    phone: str = Field(
        ...,
        min_length=10,
        max_length=10,
        pattern=r"^[0-9]{10}$",
    )

    branch: str = "Delhi"
    role: Literal["User", "Admin"] = "User"

    password: str = Field(
        ...,
        min_length=6,
    )


class UserUpdate(BaseModel):
    name: str | None = None

    phone: str | None = Field(
        default=None,
        min_length=10,
        max_length=10,
        pattern=r"^[0-9]{10}$",
    )

    branch: str | None = None
    status: Literal["Active", "Inactive"] | None = None
    role: Literal["User", "Admin"] | None = None


class PasswordUpdate(BaseModel):
    newPassword: str = Field(
        min_length=6
    )


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    empId: str
    phone: str
    branch: str
    role: str
    status: str