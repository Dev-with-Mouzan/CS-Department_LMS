from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.common import UTCDateTime


class QuestionDetailOut(BaseModel):
    id: str
    text: str
    options: List[str]
    order_index: int
    # only populated for the owning teacher (hidden from students)
    correct_index: Optional[int] = None


class QuizOut(BaseModel):
    id: str
    course_id: str
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    title: str
    description: Optional[str] = None
    time_limit: Optional[int] = None
    deadline: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    question_count: int
    is_published: bool
    created_at: UTCDateTime


class QuizDetailOut(QuizOut):
    questions: List[QuestionDetailOut] = []


class QuizAnswerIn(BaseModel):
    question_id: str
    selected_index: int


class QuizSubmitIn(BaseModel):
    answers: List[QuizAnswerIn]


class QuizAnswerResultOut(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    selected_index: int
    correct_index: int
    is_correct: bool


class QuizAttemptOut(BaseModel):
    id: str
    quiz_id: str
    score: int
    total: int
    submission_url: Optional[str] = None
    submission_name: Optional[str] = None
    submitted_at: object
    answers: List[QuizAnswerResultOut] = []


class QuizTeacherAttemptOut(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    student_name: str
    score: int
    total: int
    percentage: float
    submission_url: Optional[str] = None
    submission_name: Optional[str] = None
    submitted_at: object