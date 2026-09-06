from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    due_date: datetime
    max_marks: int = 100


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_marks: Optional[int] = None


class AssignmentOut(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    title: str
    description: Optional[str] = None
    due_date: UTCDateTime
    attachment_url: Optional[str] = None
    max_marks: int
    created_at: UTCDateTime
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    submitted: bool = False
    submission_status: Optional[str] = None
    submitted_at: Optional[datetime] = None
    submission_grade: Optional[float] = None
    submission_feedback: Optional[str] = None

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    assignment_id: str


class SubmissionGrade(BaseModel):
    grade: float
    feedback: Optional[str] = None


class SubmissionOut(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    file_url: Optional[str] = None
    submitted_at: UTCDateTime
    grade: Optional[float] = None
    feedback: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
