from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class StudyMaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Literal["notes", "slides", "assignment", "reference", "other"] = "notes"


class StudyMaterialOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    file_url: str
    file_name: Optional[str] = None
    course_id: str
    course_name: Optional[str] = None
    uploaded_by: str
    uploader_name: Optional[str] = None
    created_at: UTCDateTime

    class Config:
        from_attributes = True
