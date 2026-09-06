from typing import Optional
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class ResultOut(BaseModel):
    id: str
    title: str
    exam_type: str
    entry_type: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    worst_paper_url: Optional[str] = None
    worst_paper_name: Optional[str] = None
    best_paper_url: Optional[str] = None
    best_paper_name: Optional[str] = None
    course_id: str
    course_name: Optional[str] = None
    uploaded_by: str
    uploader_name: Optional[str] = None
    created_at: UTCDateTime

    class Config:
        from_attributes = True