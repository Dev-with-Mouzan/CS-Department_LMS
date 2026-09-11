from typing import List

from fastapi import Request,  APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models import User, Review, StudentProfile
from app.schemas.review import ReviewCreate, ReviewOut
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


def _review_out(review: Review, users: dict, profiles: dict) -> dict:
    """Build review response with user info."""
    user = users.get(review.user_id)
    profile = profiles.get(review.user_id)
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


def _prefetch_reviews(db: Session, reviews: list) -> tuple:
    """Prefetch users and profiles for a list of reviews."""
    user_ids = list({r.user_id for r in reviews})
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    profiles = {p.user_id: p for p in db.query(StudentProfile).filter(StudentProfile.user_id.in_(user_ids)).all()} if user_ids else {}
    return users, profiles


@limiter.limit("30/minute")
@router.get("/public", response_model=List[ReviewOut])
def list_public_reviews(request: Request, 
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
    user_ids = list({r.user_id for r in reviews})
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    profiles = {p.user_id: p for p in db.query(StudentProfile).filter(StudentProfile.user_id.in_(user_ids)).all()} if user_ids else {}
    return [_review_out(r, users, profiles) for r in reviews]


@limiter.limit("30/minute")
@router.get("/", response_model=List[ReviewOut])
def list_my_reviews(request: Request, 
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
    users, profiles = _prefetch_reviews(db, reviews)
    return [_review_out(r, users, profiles) for r in reviews]


@limiter.limit("30/minute")
@router.post("/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(request: Request, 
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
        is_approved=False,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    users, profiles = _prefetch_reviews(db, [review])
    return _review_out(review, users, profiles)


@limiter.limit("30/minute")
@router.put("/{review_id}", response_model=ReviewOut)
def update_review(request: Request,
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
    db.commit()
    db.refresh(review)
    users, profiles = _prefetch_reviews(db, [review])
    return _review_out(review, users, profiles)


@limiter.limit("30/minute")
@router.delete("/{review_id}")
def delete_review(request: Request, 
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


@limiter.limit("30/minute")
@router.get("/all", response_model=List[ReviewOut])
def list_all_reviews(request: Request,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all reviews for admin moderation."""
    reviews = db.query(Review).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    users, profiles = _prefetch_reviews(db, reviews)
    return [_review_out(r, users, profiles) for r in reviews]


@router.put("/{review_id}/approve")
def approve_review(request: Request,
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Approve or reject a review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = True
    db.commit()
    return {"message": "Review approved"}


@router.put("/{review_id}/reject")
def reject_review(request: Request,
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reject (unapprove) a review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = False
    db.commit()
    return {"message": "Review rejected"}
