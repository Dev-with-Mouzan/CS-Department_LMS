from datetime import datetime
from typing import Optional
from pydantic import BaseModel


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
    created_at: datetime

    class Config:
        from_attributes = True
