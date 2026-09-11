import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

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

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v

    @field_validator("phone")
    @classmethod
    def phone_must_be_pakistani(cls, v):
        if v is not None and v != "":
            # Auto-prepend +92 if missing and only digits provided
            digits = v.replace(" ", "").replace("-", "")
            if not digits.startswith("+92"):
                # Strip any leading zeros or country codes and prepend +92
                raw = re.sub(r"^\+?92", "", digits)
                raw = re.sub(r"^0+", "", raw)  # remove leading zeros
                if len(raw) == 10:
                    return f"+92{raw}"
            if not re.match(r"^\+92\d{10}$", digits):
                raise ValueError("Phone must be a valid Pakistani number: +92 followed by 10 digits")
            return digits
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    semester: Optional[int] = None

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


# ── Student Profile ───────────────────────────────────
class StudentProfileOut(BaseModel):
    id: str
    user_id: str
    student_id: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    enrollment_year: Optional[int] = None
    session: Optional[str] = None
    roll_number: Optional[str] = None

    class Config:
        from_attributes = True


class UserWithRole(UserOut):
    role: RoleOut
    student_profile: Optional[StudentProfileOut] = None


class PasswordResetBody(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v


class PromotionRequest(BaseModel):
    student_ids: list[str]
    to_semester: int = Field(..., ge=1, le=8)
