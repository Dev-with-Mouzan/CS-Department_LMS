import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.common import UTCDateTime


# ── Role ──────────────────────────────────────────────
class RoleOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ── User Base ─────────────────────────────────────────
class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role_name: str  # "admin", "teacher", "student"
    employee_id: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    student_id: Optional[str] = None
    semester: Optional[int] = None
    enrollment_year: Optional[int] = None

    @field_validator("email")
    @classmethod
    def email_must_be_gmail(cls, v):
        if not v.lower().endswith("@gmail.com"):
            raise ValueError("Email must be a valid @gmail.com address")
        return v.lower()

    @field_validator("phone")
    @classmethod
    def phone_must_be_pakistani(cls, v):
        if v is not None and v != "":
            if not re.match(r"^\+92\d{10}$", v):
                raise ValueError("Phone must be exactly 13 characters: +92 followed by 10 digits")
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    semester: Optional[int] = None

    @field_validator("email")
    @classmethod
    def email_must_be_gmail(cls, v):
        if v is not None:
            if not v.lower().endswith("@gmail.com"):
                raise ValueError("Email must be a valid @gmail.com address")
            return v.lower()
        return v

    @field_validator("phone")
    @classmethod
    def phone_must_be_pakistani(cls, v):
        if v is not None and v != "":
            if not re.match(r"^\+92\d{10}$", v):
                raise ValueError("Phone must be exactly 13 characters: +92 followed by 10 digits")
        return v


class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_must_be_gmail(cls, v):
        if v is not None:
            if not v.lower().endswith("@gmail.com"):
                raise ValueError("Email must be a valid @gmail.com address")
            return v.lower()
        return v

    @field_validator("phone")
    @classmethod
    def phone_must_be_pakistani(cls, v):
        if v is not None and v != "":
            if not re.match(r"^\+92\d{10}$", v):
                raise ValueError("Phone must be exactly 13 characters: +92 followed by 10 digits")
        return v


class UserOut(UserBase):
    id: str
    role_id: str
    is_verified: bool
    is_active: bool
    created_at: UTCDateTime
    updated_at: UTCDateTime

    class Config:
        from_attributes = True


class UserWithRole(UserOut):
    role: RoleOut


# ── Student Profile ───────────────────────────────────
class StudentProfileOut(BaseModel):
    id: str
    user_id: str
    student_id: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    enrollment_year: Optional[int] = None

    class Config:
        from_attributes = True


class PasswordResetBody(BaseModel):
    new_password: str
