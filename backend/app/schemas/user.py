from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


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


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserOut(UserBase):
    id: str
    role_id: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithRole(UserOut):
    role: RoleOut


# ── Teacher Profile ───────────────────────────────────
class TeacherProfileOut(BaseModel):
    id: str
    user_id: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None

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

    class Config:
        from_attributes = True
