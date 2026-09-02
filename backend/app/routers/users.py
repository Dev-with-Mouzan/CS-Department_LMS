from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import require_admin, hash_password
from app.models import User, Role, TeacherProfile, StudentProfile, Course
from app.schemas.user import (
    UserCreate, UserUpdate, UserWithRole, TeacherOut, TeacherCreate,
    TeacherUpdate, SemesterOut, PasswordResetBody,
)
from app.services.auth_service import create_user as create_user_service
from app.services.enrollment_service import auto_enroll_student

router = APIRouter(prefix="/api/users", tags=["Users"])


def _get_user_or_404(db: Session, user_id) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _check_username_available(db: Session, username: str, exclude_user_id=None) -> None:
    if not username:
        return
    query = db.query(User).filter(User.username == username)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Username already taken")


def _check_email_available(db: Session, email: str, exclude_user_id=None) -> None:
    query = db.query(User).filter(User.email == email)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Email already registered")


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


@router.get("/teachers", response_model=List[TeacherOut])
def list_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all teachers with profile info."""
    role = db.query(Role).filter(Role.name == "teacher").first()
    if not role:
        return []
    return db.query(User).filter(User.role_id == role.id).all()


@router.get("/teachers/{teacher_id}", response_model=TeacherOut)
def get_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get a single teacher."""
    user = _get_user_or_404(db, teacher_id)
    if user.role.name != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")
    return user


@router.get("/semesters", response_model=List[SemesterOut])
def list_semesters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List semesters that have courses, with course and student counts."""
    rows = db.query(Course.semester).filter(Course.semester.isnot(None))
    semesters = sorted({r[0] for r in rows.all()})
    result = []
    for sem in semesters:
        course_count = db.query(Course).filter(Course.semester == sem).count()
        student_count = db.query(StudentProfile).filter(StudentProfile.semester == sem).count()
        result.append(SemesterOut(
            semester=sem, course_count=course_count, student_count=student_count
        ))
    return result


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
    _check_username_available(db, data.username)
    if data.phone:
        phone_existing = db.query(User).filter(User.phone == data.phone).first()
        if phone_existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")

    user = create_user_service(db, data.model_dump())
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
    _check_username_available(db, data.username, exclude_user_id=user.id)

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

    db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).delete()
    db.query(StudentProfile).filter(StudentProfile.user_id == user.id).delete()
    from app.models import Enrollment
    db.query(Enrollment).filter(Enrollment.student_id == user.id).delete()

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


# ── Teacher management mutations ──────────────────────
@router.post("/teachers", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a teacher (admin only)."""
    _check_email_available(db, data.email)
    _check_username_available(db, data.username)

    user_data = data.model_dump()
    user_data["role_name"] = "teacher"
    user = create_user_service(db, user_data)
    return user


@router.put("/teachers/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: str,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a teacher and their profile (admin only)."""
    user = _get_user_or_404(db, teacher_id)
    if user.role.name != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")

    _check_email_available(db, data.email, exclude_user_id=user.id)
    _check_username_available(db, data.username, exclude_user_id=user.id)

    update_data = data.model_dump(exclude_unset=True)
    profile_fields = {
        k: update_data.pop(k) for k in
        ["employee_id", "department", "qualification"] if k in update_data
    }

    for field, value in update_data.items():
        setattr(user, field, value)

    if profile_fields:
        profile = user.teacher_profile
        if not profile:
            profile = TeacherProfile(user_id=user.id)
            db.add(profile)
        for field, value in profile_fields.items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a teacher (admin only — soft delete)."""
    user = _get_user_or_404(db, teacher_id)
    if user.role.name != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")
    user.is_active = False
    db.commit()
    return {"message": "Teacher deactivated successfully"}


@router.delete("/teachers/{teacher_id}/hard")
def hard_delete_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Permanently delete a teacher (admin only)."""
    user = _get_user_or_404(db, teacher_id)
    if user.role.name != "teacher":
        raise HTTPException(status_code=400, detail="User is not a teacher")

    db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Teacher deleted permanently"}
