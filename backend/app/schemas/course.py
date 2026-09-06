from datetime import date
from typing import Optional
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class CourseCreate(BaseModel):
    course_code: str
    title: str
    description: Optional[str] = None
    semester: Optional[int] = None
    teacher_id: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[int] = None
    teacher_id: Optional[str] = None
    is_active: Optional[bool] = None


class CourseOut(BaseModel):
    id: str
    course_code: str
    title: str
    description: Optional[str] = None
    semester: Optional[int] = None
    teacher_id: str
    is_active: bool
    session: Optional[str] = None
    created_at: UTCDateTime

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: str
    course_id: str


class EnrollmentOut(BaseModel):
    id: str
    student_id: str
    course_id: str
    enrollment_date: date
    status: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None

    class Config:
        from_attributes = True
