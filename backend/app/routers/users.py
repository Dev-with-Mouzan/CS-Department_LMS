from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import require_admin, hash_password
from app.models import User, Role, TeacherProfile, StudentProfile, Course
from app.schemas.user import (
    UserCreate, UserUpdate, UserWithRole, PasswordResetBody,
)
from app.services.auth_service import create_user as create_user_service
from app.services.email_service import send_credentials_email
from app.services.enrollment_service import auto_enroll_student
from app.services.otp_service import create_otp

router = APIRouter(prefix="/api/users", tags=["Users"])


def _get_user_or_404(db: Session, user_id) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _check_email_available(db: Session, email: str, exclude_user_id=None) -> None:
    query = db.query(User).filter(User.email == email)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Email already registered")


def _delete_user_dependencies(db: Session, user: User) -> None:
    """Hard-delete a user and every row that references them (dependency order).

    Covers submissions, attendance, enrollments, OTP/notification records,
    profiles, and — for teachers — their assignments, materials and
    taught courses (with each course's own children).
    """
    from app.models import (
        Submission, AttendanceRecord, Enrollment, OTPVerification,
        Notification, Assignment, StudyMaterial,
        AttendanceSession, Quiz, QuizQuestion, Result, Review,
    )

    user_id = user.id

    # Course children for every course this user teaches (teacher case)
    taught_course_ids = [
        cid for (cid,) in db.query(Course.id).filter(Course.teacher_id == user_id).all()
    ]
    for course_id in taught_course_ids:
        db.query(Submission).filter(
            Submission.assignment_id.in_(
                db.query(Assignment.id).filter(Assignment.course_id == course_id)
            )
        ).delete(synchronize_session=False)
        db.query(Assignment).filter(Assignment.course_id == course_id).delete()
        db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id.in_(
                db.query(AttendanceSession.id).filter(AttendanceSession.course_id == course_id)
            )
        ).delete(synchronize_session=False)
        db.query(AttendanceSession).filter(AttendanceSession.course_id == course_id).delete()
        db.query(StudyMaterial).filter(StudyMaterial.course_id == course_id).delete()
        db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
        db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id.in_(
                db.query(Quiz.id).filter(Quiz.course_id == course_id)
            )
        ).delete(synchronize_session=False)
        db.query(Quiz).filter(Quiz.course_id == course_id).delete()
        db.query(Result).filter(Result.course_id == course_id).delete()
    db.query(Course).filter(Course.teacher_id == user_id).delete()

    # Direct user references
    db.query(Submission).filter(Submission.student_id == user_id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == user_id).delete()
    db.query(Enrollment).filter(Enrollment.student_id == user_id).delete()
    db.query(Assignment).filter(Assignment.teacher_id == user_id).delete()
    db.query(StudyMaterial).filter(StudyMaterial.uploaded_by == user_id).delete()
    db.query(OTPVerification).filter(OTPVerification.user_id == user_id).delete()
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id.in_(
            db.query(Quiz.id).filter(Quiz.teacher_id == user_id)
        )
    ).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.teacher_id == user_id).delete()
    db.query(Result).filter(Result.uploaded_by == user_id).delete()
    db.query(Review).filter(Review.user_id == user_id).delete()
    db.query(TeacherProfile).filter(TeacherProfile.user_id == user_id).delete()
    db.query(StudentProfile).filter(StudentProfile.user_id == user_id).delete()


# ── Static routes (must precede dynamic /{user_id}) ───
@router.get("/", response_model=List[UserWithRole])
def list_users(
    role: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users (admin only). Optional role filter."""
    query = db.query(User)
    if role:
        role_obj = db.query(Role).filter(Role.name == role).first()
        if role_obj:
            query = query.filter(User.role_id == role_obj.id)
    return query.offset(skip).limit(limit).all()


@router.get("/stats/dashboard")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get admin dashboard statistics."""
    total_users = db.query(User).count()
    total_students = db.query(User).join(Role).filter(Role.name == "student").count()
    total_teachers = db.query(User).join(Role).filter(Role.name == "teacher").count()
    pending_verification = db.query(User).filter(User.is_verified == False).count()  # noqa: E712
    active_users = db.query(User).filter(User.is_active == True).count()  # noqa: E712

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "pending_verification": pending_verification,
    }


# ── Dynamic routes ────────────────────────────────────
@router.get("/{user_id}", response_model=UserWithRole)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get user by ID (admin only)."""
    return _get_user_or_404(db, user_id)


@router.post("/", response_model=UserWithRole, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user (admin only)."""
    _check_email_available(db, data.email)
    if data.phone:
        phone_existing = db.query(User).filter(User.phone == data.phone).first()
        if phone_existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")

    user = create_user_service(db, data.model_dump())

    # Students created by admin: send an OTP to the phone number so the
    # account can be verified (same SMS flow as public registration).
    if user.role.name == "student" and user.phone:
        create_otp(db, user)

    # Teachers created by admin: auto-verify so they can login immediately,
    # and email the credentials (email, phone, password) to the teacher.
    if user.role.name == "teacher":
        user.is_verified = True
        db.commit()
        db.refresh(user)
        send_credentials_email(
            user.email,
            f"{user.first_name} {user.last_name}",
            user.phone,
            data.password,
        )

    return user


@router.put("/{user_id}", response_model=UserWithRole)
def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user details (admin only)."""
    user = _get_user_or_404(db, user_id)
    _check_email_available(db, data.email, exclude_user_id=user.id)

    update_data = data.model_dump(exclude_unset=True)
    semester = update_data.pop("semester", None)

    for field, value in update_data.items():
        setattr(user, field, value)

    if semester is not None:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile:
            profile.semester = semester
        else:
            db.add(StudentProfile(user_id=user.id, semester=semester))

    db.commit()
    db.refresh(user)

    # Auto-enroll student in their semester courses when verified or semester changes
    if user.role.name == "student" and (user.is_verified or semester is not None):
        auto_enroll_student(db, user)

    return user


@router.put("/{user_id}/password")
def set_password(
    user_id: str,
    data: PasswordResetBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Set a new password for a user (admin only)."""
    user = _get_user_or_404(db, user_id)
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/{user_id}/hard")
def hard_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Permanently delete a user (admin only — hard delete)."""
    user = _get_user_or_404(db, user_id)

    _delete_user_dependencies(db, user)
    db.delete(user)
    db.commit()
    return {"message": "User deleted permanently"}


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a user (admin only — soft delete)."""
    user = _get_user_or_404(db, user_id)
    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}
