from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    email: str
    phone: str


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
    semester: int  # required — auto-enrollment target
    department: Optional[str] = None
    student_id: Optional[str] = None
    roll_number: str  # required — student roll number
    enrollment_year: int  # required — enrollment year


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str


class OTPResendRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    phone: str


class PasswordResetConfirm(BaseModel):
    phone: str
    otp_code: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
