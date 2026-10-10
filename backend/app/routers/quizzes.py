import io
import json
import random
import re
from typing import List, Optional

from datetime import datetime, timedelta, timezone

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.database.database import get_db
from app.services.file_service import delete_file, save_file
from app.services.question_bank import parse_question_file
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, Quiz, QuizQuestion, QuizAttempt, QuizAttemptAnswer, QuizTimer, Course, StudentProfile
from app.schemas.quiz import (
    QuizOut, QuizDetailOut, QuestionDetailOut,
    QuizSubmitIn, QuizAttemptOut, QuizAnswerResultOut,
    QuizTeacherAttemptOut, QuizAttemptGrade,
    ParseFileOut, QuizPublishIn,
)
from app.routers.courses import student_has_access, get_student_courses, get_course_students
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api", tags=["Quizzes"])


def _parse_options(quiz_question: QuizQuestion) -> List[str]:
    if not quiz_question.options:
        return []
    try:
        parsed = json.loads(quiz_question.options)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


def _question_out(q: QuizQuestion, include_correct: bool, order: int = None) -> QuestionDetailOut:
    return QuestionDetailOut(
        id=q.id,
        text=q.text,
        options=_parse_options(q),
        order_index=q.order_index if order is None else order,
        correct_index=q.correct_index if include_correct else None,
    )


def _assigned_questions(quiz: Quiz, student_id: str) -> List[QuizQuestion]:
    """Deterministically pick + shuffle the questions assigned to a student.

    Seeded by quiz id + student id so every fetch and the final submission
    see the exact same set/order, while each student gets a different mix.
    """
    bank = list(quiz.questions)
    rng = random.Random(f"{quiz.id}:{student_id}")
    target = quiz.total_questions
    if target is not None and 0 < target < len(bank):
        assigned = rng.sample(bank, target)
    else:
        assigned = list(bank)
    rng.shuffle(assigned)
    return assigned


# Timed quizzes only: server-side look past the countdown absorbs network latency
TIMER_GRACE_SECONDS = 30


def _is_timed_mcq_quiz(quiz: Quiz) -> bool:
    """Timers apply to MCQ quizzes with a time limit (not legacy document quizzes)."""
    return bool(quiz.time_limit) and not quiz.attachment_url


def _ensure_quiz_timer(db: Session, quiz: Quiz, student_id: str) -> datetime:
    """Return this student's start time, recording it on first open.

    Re-opening the quiz resumes the same countdown instead of resetting it.
    """
    timer = db.query(QuizTimer).filter(
        QuizTimer.quiz_id == quiz.id,
        QuizTimer.student_id == student_id,
    ).first()
    if timer:
        return timer.started_at
    timer = QuizTimer(quiz_id=quiz.id, student_id=student_id)
    db.add(timer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        timer = db.query(QuizTimer).filter(
            QuizTimer.quiz_id == quiz.id,
            QuizTimer.student_id == student_id,
        ).one()
        return timer.started_at
    db.refresh(timer)
    return timer.started_at


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
        deadline=q.deadline,
        total_questions=q.total_questions,
        attachment_url=q.attachment_url,
        attachment_name=q.attachment_name,
        max_marks=_quiz_max_marks(q),
        question_count=len(q.questions),
        is_published=q.is_published,
        created_at=q.created_at,
    )


def _quiz_max_marks(quiz: Quiz) -> Optional[int]:
    if quiz.max_marks is not None:
        return quiz.max_marks
    return 100 if quiz.attachment_url else None


def _score_answers(questions: List[QuizQuestion], answers, require_all: bool = True):
    """Grade the student's answers against the questions they were assigned.

    require_all=False is used for countdown auto-submits: unanswered
    questions are simply not counted as correct.
    """
    allowed = {question.id: question for question in questions}
    validated_answers = []
    seen_questions = set()
    for answer in answers:
        question = allowed.get(answer.question_id)
        if not question or answer.question_id in seen_questions:
            raise HTTPException(status_code=400, detail="Each assigned question must be answered exactly once")
        options = _parse_options(question)
        if answer.selected_index < 0 or answer.selected_index >= len(options):
            raise HTTPException(status_code=400, detail="Invalid answer selected")
        seen_questions.add(answer.question_id)
        validated_answers.append((answer, question))
    if require_all and len(seen_questions) != len(allowed):
        raise HTTPException(status_code=400, detail="Please answer all quiz questions")

    score = 0
    answer_results = []
    answer_records = []
    for answer, question in validated_answers:
        is_correct = answer.selected_index == question.correct_index
        if is_correct:
            score += 1
        answer_results.append({
            "question_id": question.id,
            "question_text": question.text,
            "options": _parse_options(question),
            "selected_index": answer.selected_index,
            "correct_index": question.correct_index,
            "is_correct": is_correct,
        })
        answer_records.append(QuizAttemptAnswer(
            question_id=question.id,
            selected_index=answer.selected_index,
            is_correct=is_correct,
        ))
    # Timed-out/partial submits: include unanswered questions too (selected_index=-1)
    # so the student can review every question and its correct answer.
    if not require_all:
        for question in questions:
            if question.id in seen_questions:
                continue
            answer_results.append({
                "question_id": question.id,
                "question_text": question.text,
                "options": _parse_options(question),
                "selected_index": -1,
                "correct_index": question.correct_index,
                "is_correct": False,
            })
            answer_records.append(QuizAttemptAnswer(
                question_id=question.id,
                selected_index=-1,
                is_correct=False,
            ))
    return score, len(allowed), answer_results, answer_records


def _attempt_out(attempt: QuizAttempt, answers=None) -> QuizAttemptOut:
    status = attempt.grading_status or ("submitted" if attempt.submission_url else "graded")
    return QuizAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        score=attempt.score,
        total=attempt.total,
        submission_url=attempt.submission_url,
        submission_name=attempt.submission_name,
        grade=attempt.grade,
        feedback=attempt.feedback,
        grading_status=status,
        max_marks=_quiz_max_marks(attempt.quiz),
        submitted_at=attempt.submitted_at,
        answers=[a if isinstance(a, QuizAnswerResultOut) else QuizAnswerResultOut(**a) for a in (answers or [])],
    )


def _teacher_attempt_out(attempt: QuizAttempt, quiz: Quiz, student: Optional[User]) -> QuizTeacherAttemptOut:
    max_marks = _quiz_max_marks(quiz)
    if attempt.submission_url and attempt.grade is not None and max_marks:
        percentage = attempt.grade / max_marks * 100
    elif attempt.total > 0:
        percentage = attempt.score / attempt.total * 100
    else:
        percentage = 0
    status = attempt.grading_status or ("submitted" if attempt.submission_url else "graded")
    student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
    return QuizTeacherAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        student_id=attempt.student_id,
        student_name=student_name,
        score=attempt.score,
        total=attempt.total,
        percentage=round(percentage, 1),
        submission_url=attempt.submission_url,
        submission_name=attempt.submission_name,
        grade=attempt.grade,
        feedback=attempt.feedback,
        grading_status=status,
        max_marks=max_marks,
        submitted_at=attempt.submitted_at,
    )


def _deadline_passed(quiz: Quiz) -> bool:
    return bool(quiz.deadline) and datetime.now(timezone.utc).replace(tzinfo=None) > quiz.deadline


def _not_attempted_out(quiz_id: str, student: User) -> QuizTeacherAttemptOut:
    return QuizTeacherAttemptOut(
        id=f"none-{student.id}",
        quiz_id=quiz_id,
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        grading_status="not_attempted",
        not_attempted=True,
    )


def _validate_questions(questions, quiz_title: str):
    """Validate question payload and return QuizQuestion objects (uncommitted)."""
    validated = []
    for i, q in enumerate(questions):
        text = q.get('text', '').strip()
        options = [o.strip() for o in q.get('options', []) if o and o.strip()]
        if not text and len(options) < 2:
            continue
        if len(options) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Quiz '{quiz_title}' question {i + 1} needs at least 2 options",
            )
        correct = q.get('correct', 0)
        if correct < 0 or correct >= len(options):
            raise HTTPException(
                status_code=400,
                detail=f"Quiz '{quiz_title}' question {i + 1} has an invalid correct answer",
            )
        validated.append(QuizQuestion(
            text=text,
            options=json.dumps(options),
            correct_index=correct,
            order_index=len(validated),
        ))
    return validated


@limiter.limit("30/minute")
@router.get("/quizzes", response_model=List[QuizOut])
def list_quizzes(request: Request, 
    course_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List quizzes scoped to the current user (teacher = their courses)."""
    role = current_user.role.name
    query = db.query(Quiz)

    if role == "teacher":
        from app.routers.courses import get_teacher_course_ids
        teacher_course_ids = get_teacher_course_ids(db, current_user.id, include_inactive=bool(course_id))
        if not teacher_course_ids:
            return []
        query = query.filter(Quiz.course_id.in_(teacher_course_ids))
    elif role == "student":
        student_course_ids = [c.id for c in get_student_courses(db, current_user)]
        query = query.filter(
            Quiz.course_id.in_(student_course_ids),
            Quiz.is_published == True,  # noqa: E712
        )
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if course_id:
        query = query.filter(Quiz.course_id == course_id)

    quizzes = query.order_by(Quiz.created_at.desc()).offset(skip).limit(limit).all()
    return [_quiz_out(q) for q in quizzes]


@limiter.limit("30/minute")
@router.post("/quizzes/parse-file", response_model=ParseFileOut, status_code=status.HTTP_200_OK)
async def parse_quiz_file(request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_teacher),
):
    """Preview-parse a question-bank file (docx/csv/xlsx) without creating a quiz."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    questions = parse_question_file(file.filename, content)
    return ParseFileOut(questions=questions, count=len(questions))


@limiter.limit("30/minute")
@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(request: Request, 
    course_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    time_limit: Optional[int] = Form(None),
    deadline: Optional[str] = Form(None),
    total_questions: Optional[int] = Form(None),
    max_marks: Optional[int] = Form(None),
    questions: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Create a quiz with its questions and optional attachment (teacher only)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create quizzes for your courses")
    if not course.is_active:
        raise HTTPException(status_code=400, detail="Cannot create quizzes for an archived course")

    parsed_questions = json.loads(questions) if questions else []

    # Quiz section is MCQ-only — document/attachment quizzes are no longer created
    if attachment and attachment.filename:
        raise HTTPException(
            status_code=400,
            detail="This quiz section is MCQ-only — attachments are no longer accepted",
        )

    if not parsed_questions:
        raise HTTPException(status_code=400, detail="A quiz needs at least one question")
    if max_marks is not None and max_marks <= 0:
        raise HTTPException(status_code=400, detail="Maximum marks must be greater than zero")
    if total_questions is not None and total_questions <= 0:
        raise HTTPException(status_code=400, detail="Questions per student must be greater than zero")

    if not title.strip():
        raise HTTPException(status_code=400, detail="Quiz title is required")

    from datetime import datetime as dt
    parsed_deadline = None
    if deadline:
        parsed_deadline = dt.fromisoformat(deadline.replace("Z", "+00:00")).replace(tzinfo=None)

    quiz = Quiz(
        course_id=course_id,
        teacher_id=current_user.id,
        title=title.strip(),
        description=description,
        time_limit=time_limit,
        deadline=parsed_deadline,
        total_questions=total_questions,
        max_marks=max_marks,
    )
    db.add(quiz)
    db.flush()

    validated = _validate_questions(parsed_questions, quiz.title)
    if not validated:
        raise HTTPException(status_code=400, detail="No valid questions found")
    if total_questions is not None and total_questions > len(validated):
        raise HTTPException(
            status_code=400,
            detail=f"Questions per student ({total_questions}) exceeds the question bank size ({len(validated)})",
        )
    for q in validated:
        q.quiz_id = quiz.id
        db.add(q)

    db.commit()
    db.refresh(quiz)
    return _quiz_out(quiz)


@limiter.limit("30/minute")
@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptOut)
def submit_quiz(request: Request, 
    quiz_id: str,
    data: QuizSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit quiz answers and return the graded result."""
    if current_user.role.name != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quizzes")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.is_published:
        raise HTTPException(status_code=400, detail="Quiz is not published yet")
    if quiz.deadline and datetime.now(timezone.utc).replace(tzinfo=None) > quiz.deadline:
        raise HTTPException(status_code=400, detail="Quiz deadline has passed")

    # Check access via session+semester
    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or not student_has_access(db, current_user, course):
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    # Check if already attempted
    existing = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")

    if quiz.attachment_url:
        raise HTTPException(status_code=400, detail="This quiz requires a file submission")

    # Enforce the countdown server-side (grace absorbs network latency)
    if _is_timed_mcq_quiz(quiz):
        timer = db.query(QuizTimer).filter(
            QuizTimer.quiz_id == quiz_id,
            QuizTimer.student_id == current_user.id,
        ).first()
        if timer:
            expires = timer.started_at + timedelta(
                minutes=quiz.time_limit, seconds=TIMER_GRACE_SECONDS
            )
            if datetime.now(timezone.utc).replace(tzinfo=None) > expires:
                raise HTTPException(status_code=400, detail="Time is up — the quiz timer has expired")

    score, total, answer_results, answer_records = _score_answers(
        _assigned_questions(quiz, current_user.id), data.answers,
        require_all=not data.timed_out,
    )

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score,
        total=total,
        grading_status="graded",
    )
    db.add(attempt)
    try:
        db.flush()
        for answer in answer_records:
            answer.attempt_id = attempt.id
            db.add(answer)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")
    db.refresh(attempt)

    return _attempt_out(attempt, answer_results)


@limiter.limit("30/minute")
@router.post("/quizzes/{quiz_id}/submit-file", response_model=QuizAttemptOut)
def submit_quiz_file(request: Request,
    quiz_id: str,
    file: UploadFile = File(...),
    answers: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a file for a document-attached quiz."""
    if current_user.role.name != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quizzes")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.attachment_url:
        raise HTTPException(status_code=400, detail="This quiz does not accept file submissions")
    if not quiz.is_published:
        raise HTTPException(status_code=400, detail="Quiz is not published yet")
    if quiz.deadline and datetime.now(timezone.utc).replace(tzinfo=None) > quiz.deadline:
        raise HTTPException(status_code=400, detail="Quiz deadline has passed")

    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or not student_has_access(db, current_user, course):
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    existing = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")

    answer_data = []
    if answers:
        try:
            parsed_answers = json.loads(answers)
            if not isinstance(parsed_answers, list):
                raise ValueError
            answer_data = QuizSubmitIn(answers=parsed_answers).answers
        except (TypeError, ValueError, ValidationError):
            raise HTTPException(status_code=400, detail="Invalid quiz answers")

    score, total, answer_results, answer_records = _score_answers(
        _assigned_questions(quiz, current_user.id), answer_data
    )
    submission_url = save_file(file, subdirectory="quiz_submissions")
    submission_name = file.filename

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score,
        total=total,
        submission_url=submission_url,
        submission_name=submission_name,
        grading_status="submitted",
    )
    db.add(attempt)
    try:
        db.flush()
        for answer in answer_records:
            answer.attempt_id = attempt.id
            db.add(answer)
        db.commit()
    except IntegrityError:
        db.rollback()
        delete_file(submission_url)
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")
    db.refresh(attempt)

    return _attempt_out(attempt, answer_results)


@limiter.limit("30/minute")
@router.get("/quizzes/{quiz_id}/attempts", response_model=Optional[QuizAttemptOut])
def get_my_attempt(request: Request, 
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current student's attempt result for a quiz."""
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == current_user.id,
    ).first()
    if not attempt:
        return None

    # Rebuild answer details from stored answers
    answers_out = []
    question_ids = list({aa.question_id for aa in attempt.answers})
    questions = {q.id: q for q in db.query(QuizQuestion).filter(QuizQuestion.id.in_(question_ids)).all()} if question_ids else {}
    for aa in attempt.answers:
        q = questions.get(aa.question_id)
        if q:
            answers_out.append(QuizAnswerResultOut(
                question_id=q.id,
                question_text=q.text,
                options=_parse_options(q),
                selected_index=aa.selected_index,
                correct_index=q.correct_index,
                is_correct=aa.is_correct,
            ))

    return _attempt_out(attempt, answers_out)


@limiter.limit("30/minute")
@router.get("/quizzes/{quiz_id}/all-attempts", response_model=List[QuizTeacherAttemptOut])
def get_all_attempts(request: Request, 
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Get all student attempts for a quiz (teacher only)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    student_ids = list({a.student_id for a in attempts})
    students = {u.id: u for u in db.query(User).filter(User.id.in_(student_ids)).all()} if student_ids else {}
    result = []
    for attempt in attempts:
        result.append(_teacher_attempt_out(attempt, quiz, students.get(attempt.student_id)))
    if _deadline_passed(quiz):
        attempted = {a.student_id for a in attempts}
        for user, _profile in get_course_students(db, course):
            if user.id not in attempted:
                result.append(_not_attempted_out(quiz_id, user))
    return result


@limiter.limit("30/minute")
@router.put("/quiz-attempts/{attempt_id}/grade", response_model=QuizTeacherAttemptOut)
def grade_quiz_attempt(request: Request,
    attempt_id: str,
    data: QuizAttemptGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not quiz.attachment_url:
        raise HTTPException(status_code=400, detail="Only document-attached quizzes require teacher grading")

    max_marks = _quiz_max_marks(quiz)
    if max_marks is not None and data.grade > max_marks:
        raise HTTPException(status_code=400, detail=f"Grade cannot exceed maximum marks ({max_marks})")

    attempt.grade = data.grade
    attempt.feedback = data.feedback
    attempt.grading_status = "graded"
    db.commit()
    db.refresh(attempt)

    student = db.query(User).filter(User.id == attempt.student_id).first()
    return _teacher_attempt_out(attempt, quiz, student)


@limiter.limit("30/minute")
@router.get("/quizzes/{quiz_id}", response_model=QuizDetailOut)
def get_quiz(request: Request, 
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
    student_questions = None
    started_at = None
    if role == "teacher":
        if not quiz.course or quiz.course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        include_correct = True
    elif role == "student":
        if not quiz.is_published:
            raise HTTPException(status_code=404, detail="Quiz not found")
        course = db.query(Course).filter(Course.id == quiz.course_id).first()
        if not course or not student_has_access(db, current_user, course):
            raise HTTPException(status_code=403, detail="Access denied")
        student_questions = _assigned_questions(quiz, current_user.id)
        if _is_timed_mcq_quiz(quiz):
            started_at = _ensure_quiz_timer(db, quiz, current_user.id)
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    out = _quiz_out(quiz)
    questions_out = (
        [_question_out(q, include_correct=False, order=i) for i, q in enumerate(student_questions)]
        if student_questions is not None
        else [_question_out(q, include_correct) for q in quiz.questions]
    )
    return QuizDetailOut(
        **out.model_dump(),
        questions=questions_out,
        started_at=started_at,
    )


@limiter.limit("30/minute")
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(request: Request, 
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Delete a quiz and its questions (teacher only, must own)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.course or quiz.course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}


@limiter.limit("30/minute")
@router.put("/quizzes/{quiz_id}/publish")
def set_quiz_published(request: Request,
    quiz_id: str,
    data: QuizPublishIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Publish or unpublish a quiz (teacher only, must own)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.course or quiz.course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    quiz.is_published = data.is_published
    db.commit()
    db.refresh(quiz)
    return _quiz_out(quiz)


def _export_filename(quiz: Quiz) -> str:
    course = quiz.course
    raw = f"{(course.course_code if course else '') or 'quiz'}_{quiz.title or 'results'}_results.xlsx"
    return re.sub(r"[^\w\-. ]+", "_", raw)[:100]


@limiter.limit("30/minute")
@router.get("/quizzes/{quiz_id}/export")
def export_quiz_results(request: Request,
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Download all results for a quiz as an Excel file (owner teacher only)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.course or quiz.course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    attempts = (db.query(QuizAttempt)
                 .filter(QuizAttempt.quiz_id == quiz_id)
                 .order_by(QuizAttempt.submitted_at)
                 .all())
    student_ids = list({a.student_id for a in attempts})
    students = {u.id: u for u in db.query(User).filter(User.id.in_(student_ids)).all()} if student_ids else {}
    profiles = ({p.user_id: p for p in db.query(StudentProfile).filter(StudentProfile.user_id.in_(student_ids)).all()}
                if student_ids else {})

    course = quiz.course
    not_attempted_users = []
    if _deadline_passed(quiz):
        attempted = {a.student_id for a in attempts}
        for u, p in get_course_students(db, course):
            if u.id not in attempted:
                not_attempted_users.append((u, p))
                students[u.id] = u
                profiles[u.id] = p

    amber_fill = PatternFill("solid", fgColor="F59E0B")
    navy_fill = PatternFill("solid", fgColor="1F2A44")
    light_fill = PatternFill("solid", fgColor="E9EEF6")
    band_fill = PatternFill("solid", fgColor="F7F9FC")
    thin = Side(style="thin", color="D3DCE8")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")

    wb = Workbook()
    ws = wb.active
    ws.title = "Results"

    for i, w in enumerate([6, 26, 15, 30, 9, 9, 13, 11, 14, 21], 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    def styled_merged_row(row, value, fill, font, height=None):
        for c in range(1, 11):
            ws.cell(row=row, column=c).fill = fill
        cell = ws.cell(row=row, column=1, value=value)
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=10)
        cell.font = font
        cell.alignment = left_align
        if height:
            ws.row_dimensions[row].height = height

    max_marks = _quiz_max_marks(quiz)
    styled_merged_row(1, None, amber_fill, Font(size=6), height=6)
    styled_merged_row(2, f"Quiz Results — {quiz.title}", navy_fill,
                      Font(bold=True, size=14, color="FFFFFF"), height=26)
    styled_merged_row(3, f"Course: {f'{course.course_code} — {course.title}' if course else ''}",
                      light_fill, Font(bold=True, size=11, color="1F2A44"), height=18)
    summary = (
        f"Time limit: {quiz.time_limit or 'No limit'} min | Deadline: {quiz.deadline or 'None'} "
        f"| Max marks: {max_marks or '—'} | Attempts: {len(attempts)}"
    )
    if not_attempted_users:
        summary += f" | Not attempted: {len(not_attempted_users)}"
    styled_merged_row(4, summary, light_fill, Font(italic=True, size=10, color="475569"), height=16)
    ws.row_dimensions[5].height = 6

    headers = ["#", "Student", "Roll Number", "Email", "Score", "Total",
               "Percentage", "Grade", "Status", "Submitted At"]
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=6, column=c, value=h)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = navy_fill
        cell.alignment = center
        cell.border = border
    ws.row_dimensions[6].height = 20

    r = 7

    def write_result_row(i, u, p, score, total, pct, grade, status_label, submitted):
        nonlocal r
        values = [
            i,
            f"{u.first_name} {u.last_name}".strip() if u else "Unknown",
            (p.roll_number if p and p.roll_number else ""),
            (u.email if u else ""),
            score,
            total,
            pct,
            grade,
            status_label,
            submitted if isinstance(submitted, datetime) else str(submitted or ""),
        ]
        for c, v in enumerate(values, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.border = border
            cell.alignment = left_align if c in (2, 4) else center
            if i % 2 == 0:
                cell.fill = band_fill
        if isinstance(submitted, datetime):
            ws.cell(row=r, column=10).number_format = "yyyy-mm-dd hh:mm"
        if isinstance(pct, (int, float)):
            pct_color = "059669" if pct >= 70 else "D97706" if pct >= 40 else "DC2626"
            ws.cell(row=r, column=7).font = Font(bold=True, color=pct_color)
        r += 1

    for i, a in enumerate(attempts, 1):
        u = students.get(a.student_id)
        p = profiles.get(a.student_id)
        if a.submission_url and a.grade is not None and max_marks:
            pct = round(a.grade / max_marks * 100, 1)
        else:
            pct = round(a.score / a.total * 100, 1) if a.total else 0
        status_label = a.grading_status or ("submitted" if a.submission_url else "graded")
        write_result_row(
            i, u, p, a.score, a.total, pct,
            a.grade if a.grade is not None else "",
            status_label.capitalize(), a.submitted_at,
        )

    for n, (u, p) in enumerate(not_attempted_users, len(attempts) + 1):
        write_result_row(n, u, p, "", "", "", "", "Not attempted", None)

    ws.freeze_panes = "A7"

    buf = io.BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{_export_filename(quiz)}"'},
    )
