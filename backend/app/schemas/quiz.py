from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator

from app.schemas.common import UTCDateTime


class QuestionIn(BaseModel):
    text: str
    options: List[str]
    correct: int  # index of correct option

    @field_validator("options")
    @classmethod
    def validate_options(cls, v):
        if len([o for o in v if o and o.strip()]) < 2:
            raise ValueError("Each question needs at least 2 options")
        return v


class QuizCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    time_limit: Optional[int] = None  # minutes
    deadline: Optional[datetime] = None  # deadline to attempt
    questions: List[QuestionIn]


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_limit: Optional[int] = None
    deadline: Optional[datetime] = None
    is_published: Optional[bool] = None
    questions: Optional[List[QuestionIn]] = None


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
    submitted_at: object
    answers: List[QuizAnswerResultOut] = []