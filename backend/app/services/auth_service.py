from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import User, Role, TeacherProfile, StudentProfile
from app.dependencies.auth import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_phone(db: Session, phone: str) -> User | None:
    return db.query(User).filter(User.phone == phone).first()


def get_role_by_name(db: Session, role_name: str) -> Role | None:
    return db.query(Role).filter(Role.name == role_name).first()


def create_user(db: Session, user_data: dict) -> User:
    """Create user with profile based on role."""
    role = get_role_by_name(db, user_data["role_name"])
    if not role:
        raise ValueError(f"Invalid role: {user_data['role_name']}")

    user = User(
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
        email=user_data["email"],
        phone=user_data.get("phone"),
        password_hash=hash_password(user_data["password"]),
        role_id=role.id,
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create profile based on role
    if role.name == "teacher":
        profile = TeacherProfile(
            user_id=user.id,
            employee_id=user_data.get("employee_id"),
            department=user_data.get("department"),
            qualification=user_data.get("qualification"),
        )
        db.add(profile)
    elif role.name == "student":
        profile = StudentProfile(
            user_id=user.id,
            student_id=user_data.get("student_id"),
            department=user_data.get("department"),
            semester=user_data.get("semester"),
            enrollment_year=user_data.get("enrollment_year"),
        )
        db.add(profile)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def update_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    db.commit()


def create_default_roles(db: Session) -> None:
    """Create default roles if they don't exist."""
    defaults = [
        ("admin", "System administrator with full access"),
        ("teacher", "Teacher with course and assignment management access"),
        ("student", "Student with learning and submission access"),
    ]
    for name, desc in defaults:
        if not db.query(Role).filter(Role.name == name).first():
            db.add(Role(name=name, description=desc))
    db.commit()
