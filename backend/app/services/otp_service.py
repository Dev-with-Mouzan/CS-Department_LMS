import secrets
import string
from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import settings
from app.models import OTPVerification, User, utcnow
from app.dependencies.auth import hash_password, verify_password
from app.services.sms_service import send_otp_sms


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP code."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def create_otp(db: Session, user: User, purpose: str = "registration", send_sms: bool = True):
    """Create a new OTP record for a user and optionally send it via SMS."""
    # Invalidate any existing unused OTPs for this user with the same purpose
    db.query(OTPVerification).filter(
        OTPVerification.user_id == user.id,
        OTPVerification.is_used == False,
        OTPVerification.purpose == purpose,
    ).update({"is_used": True})
    db.flush()

    otp_code = generate_otp()
    otp_record = OTPVerification(
        user_id=user.id,
        otp_hash=hash_password(otp_code),
        expires_at=utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        attempts=0,
        is_used=False,
        purpose=purpose,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    # Send OTP via SMS to the user's phone number (caller can defer via BackgroundTasks)
    if send_sms and user.phone:
        send_otp_sms(user.phone, otp_code)

    return otp_record, otp_code


def verify_otp(db: Session, user: User, otp_code: str, purpose: str = "registration") -> bool:
    """Verify an OTP code for a user."""
    otp_record = db.query(OTPVerification).filter(
        OTPVerification.user_id == user.id,
        OTPVerification.is_used == False,
        OTPVerification.purpose == purpose,
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_record:
        return False

    # Check expiration
    if utcnow() > otp_record.expires_at:
        otp_record.is_used = True
        db.commit()
        return False

    # Check attempts
    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_used = True
        db.commit()
        return False

    # Increment attempts
    otp_record.attempts += 1
    db.commit()

    # Verify code
    if verify_password(otp_code, otp_record.otp_hash):
        otp_record.is_used = True
        otp_record.verified_at = utcnow()
        user.is_verified = True
        db.commit()
        return True

    return False


def can_resend_otp(db: Session, user: User, purpose: str = "registration") -> bool:
    """Check if user can request a new OTP (cooldown check)."""
    recent = db.query(OTPVerification).filter(
        OTPVerification.user_id == user.id,
        OTPVerification.created_at >= utcnow() - timedelta(minutes=2),
        OTPVerification.purpose == purpose,
    ).first()
    return recent is None
