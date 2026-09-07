from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import (
    create_access_token, get_current_user, hash_password
)
from app.dependencies.ratelimit import limiter
from app.models import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    OTPVerifyRequest, OTPResendRequest,
    PasswordResetRequest, PasswordResetConfirm,
    MessageResponse, RegisterResponse,
)
from app.services.auth_service import (
    get_user_by_email, get_user_by_phone, create_user, authenticate_user, update_password,
    get_student_by_roll_number,
)
from app.services.otp_service import (
    create_otp, verify_otp, can_resend_otp
)
from app.services.enrollment_service import auto_enroll_student

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get("/user-count")
def get_user_count(db: Session = Depends(get_db)):
    """Check if any users exist in the system (public endpoint)."""
    count = db.query(User).count()
    return {"count": count, "has_users": count > 0}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new student account (teachers are created by admin only)."""
    existing = get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    phone_existing = get_user_by_phone(db, data.phone)
    if phone_existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    roll_existing = get_student_by_roll_number(db, data.roll_number)
    if roll_existing:
        raise HTTPException(status_code=400, detail="Roll number already registered")

    user_data = data.model_dump()
    user_data["role_name"] = "student"
    user = create_user(db, user_data)

    # Generate OTP for verification
    otp_record, otp_code = create_otp(db, user)

    # Don't auto-login — let the user verify OTP first
    return RegisterResponse(
        message="Registration successful. Please verify your OTP.",
        email=data.email,
        phone=data.phone,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    role = user.role.name
    token = create_access_token(user.id, role, user.is_verified)

    # Ensure verified students stay enrolled in their semester courses (idempotent)
    if role == "student" and user.is_verified:
        auto_enroll_student(db, user)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        role=role,
        is_verified=user.is_verified,
    )


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("15/minute")
def verify_otp_code(request: Request, data: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP code for account activation and return a login token."""
    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        # Already verified — just return a token
        role = user.role.name
        token = create_access_token(user.id, role, True)
        return TokenResponse(
            access_token=token,
            user_id=str(user.id),
            role=role,
            is_verified=True,
        )

    success = verify_otp(db, user, data.otp_code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

    # Auto-enroll student in all courses for their semester
    auto_enroll_student(db, user)

    # Return a token so the frontend can log the user in
    role = user.role.name
    token = create_access_token(user.id, role, True)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        role=role,
        is_verified=True,
    )


@router.post("/resend-otp", response_model=MessageResponse)
@limiter.limit("5/minute")
def resend_otp(request: Request, data: OTPResendRequest, db: Session = Depends(get_db)):
    """Resend OTP code."""
    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return MessageResponse(message="Account already verified")

    if not can_resend_otp(db, user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting a new OTP",
        )

    create_otp(db, user)
    return MessageResponse(message="OTP sent successfully")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def forgot_password(request: Request, data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset via OTP sent to phone."""
    user = get_user_by_phone(db, data.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number. Please sign up first.",
        )

    create_otp(db, user)
    return MessageResponse(message="OTP has been sent to your phone number")


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(request: Request, data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using OTP."""
    user = get_user_by_phone(db, data.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number.",
        )

    success = verify_otp(db, user, data.otp_code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

    update_password(db, user, data.new_password)
    return MessageResponse(message="Password reset successfully")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile."""
    from app.models import StudentProfile
    semester = None
    if current_user.role.name == "student":
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        semester = profile.semester if profile else None
    return {
        "id": str(current_user.id),
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.name,
        "is_verified": current_user.is_verified,
        "is_active": current_user.is_active,
        "semester": semester,
    }
