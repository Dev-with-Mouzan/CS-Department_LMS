import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user
from app.models import User, Review, StudentProfile
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


def _review_out(review: Review, db: Session) -> dict:
    """Build review response with user info."""
    user = db.query(User).filter(User.id == review.user_id).first()
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == review.user_id
    ).first() if user else None
    return {
        "id": review.id,
        "user_id": review.user_id,
        "user_name": f"{user.first_name} {user.last_name}" if user else None,
        "user_semester": profile.semester if profile else None,
        "rating": review.rating,
        "text": review.text,
        "is_approved": review.is_approved,
        "created_at": review.created_at,
    }


@router.get("/public", response_model=List[ReviewOut])
def list_public_reviews(
    limit: int = 6,
    db: Session = Depends(get_db),
):
    """List approved reviews for the public landing page (no auth required)."""
    reviews = (
        db.query(Review)
        .filter(Review.is_approved == True)
        .order_by(func.random())
        .limit(limit)
        .all()
    )
    return [_review_out(r, db) for r in reviews]


@router.get("/", response_model=List[ReviewOut])
def list_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's reviews."""
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [_review_out(r, db) for r in reviews]


@router.post("/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new review. Only students can submit reviews."""
    role = current_user.role.name
    if role != "student":
        raise HTTPException(
            status_code=403, detail="Only students can submit reviews"
        )

    # Check if user already has a pending or approved review
    existing = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="You have already submitted a review. You can edit it instead."
        )

    review = Review(
        user_id=current_user.id,
        rating=data.rating,
        text=data.text,
        is_approved=True,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _review_out(review, db)


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: str,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update your own review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own review")

    review.rating = data.rating
    review.text = data.text
    review.is_approved = True
    db.commit()
    db.refresh(review)
    return _review_out(review, db)


@router.delete("/{review_id}")
def delete_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete your own review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own review")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}
