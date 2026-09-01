from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    is_verified: bool


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str  # required — OTP verification destination
    password: str
    role_name: str  # "admin", "teacher", "student"
    # Teacher profile
    employee_id: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    # Student profile
    student_id: Optional[str] = None
    semester: Optional[int] = None
    enrollment_year: Optional[int] = None


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str


class OTPResendRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
