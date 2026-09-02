from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NoticeCreate(BaseModel):
    title: str
    content: Optional[str] = None
    category: str = "news"  # news, photo, document
    is_pinned: bool = False


class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None


class NoticeOut(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    category: str
    file_url: Optional[str] = None
    posted_by: str
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    is_pinned: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
