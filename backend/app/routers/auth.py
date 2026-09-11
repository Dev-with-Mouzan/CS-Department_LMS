from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
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
from app.services.sms_service import send_otp_sms

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory failed login tracking (resets on server restart)
failed_logins = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


@limiter.limit("10/minute")
@router.get("/user-count")
def get_user_count(request: Request, db: Session = Depends(get_db)):
    """Check if any users exist in the system (public endpoint)."""
    count = db.query(User).count()
    return {"count": count, "has_users": count > 0}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, data: RegisterRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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

    # Generate OTP for verification (defer SMS to background)
    otp_record, otp_code = create_otp(db, user, purpose="registration", send_sms=False)
    if user.phone:
        bg_tasks.add_task(send_otp_sms, user.phone, otp_code)

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
    # Check account lockout
    email = data.email.lower()
    if email in failed_logins:
        info = failed_logins[email]
        if info["count"] >= MAX_FAILED_ATTEMPTS:
            if datetime.now(timezone.utc) < info["locked_until"]:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account temporarily locked due to too many failed login attempts",
                )
            else:
                failed_logins.pop(email, None)

    user = authenticate_user(db, email, data.password)
    if not user:
        # Track failed attempt
        if email in failed_logins:
            failed_logins[email]["count"] += 1
            failed_logins[email]["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        else:
            failed_logins[email] = {
                "count": 1,
                "locked_until": datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES),
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Clear failed attempts on successful login
    failed_logins.pop(email, None)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    role = user.role.name
    token = create_access_token(user.id, role, user.is_verified)

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
        raise HTTPException(status_code=404, detail="Invalid request")

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

    success = verify_otp(db, user, data.otp_code, purpose="registration")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

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
def resend_otp(request: Request, data: OTPResendRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Resend OTP code."""
    user = get_user_by_email(db, data.email)
    if not user:
        return MessageResponse(message="If an account exists, an OTP has been sent")

    if user.is_verified:
        return MessageResponse(message="Account already verified")

    if not can_resend_otp(db, user, purpose="registration"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting a new OTP",
        )

    otp_record, otp_code = create_otp(db, user, purpose="registration", send_sms=False)
    if user.phone:
        bg_tasks.add_task(send_otp_sms, user.phone, otp_code)
    return MessageResponse(message="OTP sent successfully")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def forgot_password(request: Request, data: PasswordResetRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Request password reset via OTP sent to phone."""
    user = get_user_by_phone(db, data.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number. Please register first.",
        )

    otp_record, otp_code = create_otp(db, user, purpose="password_reset", send_sms=False)
    if user.phone:
        bg_tasks.add_task(send_otp_sms, user.phone, otp_code)
    return MessageResponse(message="OTP sent successfully")


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

    success = verify_otp(db, user, data.otp_code, purpose="password_reset")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code",
        )

    update_password(db, user, data.new_password)
    return MessageResponse(message="Password reset successfully")


@limiter.limit("30/minute")
@router.get("/me")
def get_me(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
