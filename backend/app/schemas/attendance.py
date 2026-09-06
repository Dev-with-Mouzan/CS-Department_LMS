from datetime import date, time, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class AttendanceSessionCreate(BaseModel):
    course_id: str
    session_date: date
    start_time: time
    topic: Optional[str] = None


class AttendanceSessionOut(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    session_date: date
    start_time: time
    topic: Optional[str] = None
    created_at: UTCDateTime

    class Config:
        from_attributes = True


class AttendanceRecordCreate(BaseModel):
    student_id: str
    status: Literal["present", "absent", "late", "excused"]


class AttendanceRecordBulk(BaseModel):
    records: List[AttendanceRecordCreate]


class AttendanceRecordOut(BaseModel):
    id: str
    session_id: str
    student_id: str
    status: str
    marked_at: UTCDateTime

    class Config:
        from_attributes = True


class AttendancePercentageOut(BaseModel):
    student_id: str
    course_id: str
    total_sessions: int
    present_count: int
    percentage: float
