import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, Quiz, QuizQuestion, Course, Enrollment
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizOut, QuizDetailOut, QuestionDetailOut,
)

router = APIRouter(prefix="/api", tags=["Quizzes"])


def _parse_options(quiz_question: QuizQuestion) -> List[str]:
    if not quiz_question.options:
        return []
    try:
        parsed = json.loads(quiz_question.options)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


def _question_out(q: QuizQuestion, include_correct: bool) -> QuestionDetailOut:
    return QuestionDetailOut(
        id=q.id,
        text=q.text,
        options=_parse_options(q),
        order_index=q.order_index,
        correct_index=q.correct_index if include_correct else None,
    )


def _quiz_out(q: Quiz) -> QuizOut:
    course = q.course
    return QuizOut(
        id=q.id,
        course_id=q.course_id,
        course_title=course.title if course else None,
        course_code=course.course_code if course else None,
        title=q.title,
        description=q.description,
        time_limit=q.time_limit,
        question_count=len(q.questions),
        is_published=q.is_published,
        created_at=q.created_at,
    )


def _validate_questions(questions, quiz_title: str):
    """Validate question payload and return QuizQuestion objects (uncommitted)."""
    validated = []
    for i, q in enumerate(questions):
        options = [o.strip() for o in q.options if o and o.strip()]
        if len(options) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Quiz '{quiz_title}' question {i + 1} needs at least 2 options",
            )
        if q.correct < 0 or q.correct >= len(options):
            raise HTTPException(
                status_code=400,
                detail=f"Quiz '{quiz_title}' question {i + 1} has an invalid correct answer",
            )
        validated.append(QuizQuestion(
            text=q.text,
            options=json.dumps(options),
            correct_index=q.correct,
            order_index=i,
        ))
    return validated


@router.get("/quizzes", response_model=List[QuizOut])
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List quizzes scoped to the current user (teacher = their courses)."""
    role = current_user.role.name
    query = db.query(Quiz)

    if role == "teacher":
        query = query.filter(Quiz.teacher_id == current_user.id)
    elif role == "student":
        enrolled_ids = select(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        )
        query = query.filter(Quiz.course_id.in_(enrolled_ids))
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    quizzes = query.order_by(Quiz.created_at.desc()).all()
    return [_quiz_out(q) for q in quizzes]


@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(
    data: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Create a quiz with its questions (teacher only, must own the course)."""
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create quizzes for your courses")
    if not data.questions:
        raise HTTPException(status_code=400, detail="A quiz needs at least one question")

    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Quiz title is required")

    quiz = Quiz(
        course_id=data.course_id,
        teacher_id=current_user.id,
        title=data.title.strip(),
        description=data.description,
        time_limit=data.time_limit,
    )
    db.add(quiz)
    db.flush()

    for q in _validate_questions(data.questions, quiz.title):
        q.quiz_id = quiz.id
        db.add(q)

    db.commit()
    db.refresh(quiz)
    return _quiz_out(quiz)


@router.get("/quizzes/{quiz_id}", response_model=QuizDetailOut)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a quiz with its questions. Correct answers are hidden from students."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    role = current_user.role.name
    include_correct = False
    if role == "teacher":
        if quiz.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        include_correct = True
    elif role == "student":
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == quiz.course_id,
            Enrollment.status == "active",
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    out = _quiz_out(quiz)
    return QuizDetailOut(
        **out.model_dump(),
        questions=[_question_out(q, include_correct) for q in quiz.questions],
    )


@router.put("/quizzes/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: str,
    data: QuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Update a quiz and optionally replace its questions (teacher only, must own)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)
    questions_payload = update_data.pop("questions", None)

    for field, value in update_data.items():
        setattr(quiz, field, value)

    if questions_payload is not None:
        if not questions_payload:
            raise HTTPException(status_code=400, detail="A quiz needs at least one question")
        for old in quiz.questions:
            db.delete(old)
        for q in _validate_questions(questions_payload, quiz.title):
            q.quiz_id = quiz.id
            db.add(q)

    db.commit()
    db.refresh(quiz)
    return _quiz_out(quiz)


@router.delete("/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Delete a quiz and its questions (teacher only, must own)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}