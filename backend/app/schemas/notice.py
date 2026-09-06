from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class NoticeCreate(BaseModel):
    title: str
    content: Optional[str] = None
    category: Literal["news", "photo", "document"] = "news"
    is_pinned: bool = False


class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[Literal["news", "photo", "document"]] = None
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
    target_semester: Optional[int] = None
    is_pinned: bool
    expires_at: Optional[UTCDateTime] = None
    created_at: UTCDateTime
    updated_at: UTCDateTime

    class Config:
        from_attributes = True
