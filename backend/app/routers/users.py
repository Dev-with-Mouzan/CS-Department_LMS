from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import require_admin
from app.models import User, Role, TeacherProfile, StudentProfile
from app.schemas.user import UserCreate, UserUpdate, UserWithRole

router = APIRouter(prefix="/api/users", tags=["Users"])


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


@router.get("/{user_id}", response_model=UserWithRole)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get user by ID (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserWithRole, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user (admin only)."""
    from app.services.auth_service import create_user as create_user_service
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_data = data.model_dump()
    user = create_user_service(db, user_data)
    return user


@router.put("/{user_id}", response_model=UserWithRole)
def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user details (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a user (admin only — soft delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}


@router.get("/stats/dashboard")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get admin dashboard statistics."""
    total_users = db.query(User).count()
    total_students = db.query(User).join(Role).filter(Role.name == "student").count()
    total_teachers = db.query(User).join(Role).filter(Role.name == "teacher").count()
    pending_verification = db.query(User).filter(User.is_verified == False).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "pending_verification": pending_verification,
    }
