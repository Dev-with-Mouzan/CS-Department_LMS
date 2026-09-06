from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.schemas.common import UTCDateTime


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    text: str = Field(..., min_length=10, max_length=1000, description="Review text")


class ReviewOut(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_semester: Optional[int] = None
    rating: int
    text: str
    is_approved: bool
    created_at: UTCDateTime

    class Config:
        from_attributes = True
