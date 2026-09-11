import json
from typing import List, Optional

from datetime import datetime, timezone

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.file_service import save_file
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, Quiz, QuizQuestion, QuizAttempt, QuizAttemptAnswer, Course
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizOut, QuizDetailOut, QuestionDetailOut,
    QuizSubmitIn, QuizAttemptOut, QuizAnswerResultOut,
    QuizTeacherAttemptOut,
)
from app.routers.courses import student_has_access, get_student_courses
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
        deadline=q.deadline,
        attachment_url=q.attachment_url,
        attachment_name=q.attachment_name,
        question_count=len(q.questions),
        is_published=q.is_published,
        created_at=q.created_at,
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
        teacher_course_ids = get_teacher_course_ids(db, current_user.id)
        if not teacher_course_ids:
            return []
        query = query.filter(Quiz.course_id.in_(teacher_course_ids))
    elif role == "student":
        student_course_ids = [c.id for c in get_student_courses(db, current_user)]
        query = query.filter(Quiz.course_id.in_(student_course_ids))
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if course_id:
        query = query.filter(Quiz.course_id == course_id)

    quizzes = query.order_by(Quiz.created_at.desc()).offset(skip).limit(limit).all()
    return [_quiz_out(q) for q in quizzes]


@limiter.limit("30/minute")
@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(request: Request, 
    course_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    time_limit: Optional[int] = Form(None),
    deadline: Optional[str] = Form(None),
    questions: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Create a quiz with its questions and optional attachment (teacher only)."""
    import json
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create quizzes for your courses")
    if not course.is_active:
        raise HTTPException(status_code=400, detail="Cannot create quizzes for an archived course")

    parsed_questions = json.loads(questions) if questions else []

    # Save attachment if provided
    attachment_url = None
    attachment_name = None
    if attachment and attachment.filename:
        attachment_url = save_file(attachment, subdirectory="quizzes")
        attachment_name = attachment.filename

    if not parsed_questions and not attachment_url:
        raise HTTPException(status_code=400, detail="A quiz needs either questions or an uploaded document")

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
        attachment_url=attachment_url,
        attachment_name=attachment_name,
    )
    db.add(quiz)
    db.flush()

    for q in _validate_questions(parsed_questions, quiz.title):
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

    # Load questions for grading
    questions = {q.id: q for q in quiz.questions}

    score = 0
    total = len(questions)
    answer_results = []

    for ans in data.answers:
        question = questions.get(ans.question_id)
        if not question:
            continue
        is_correct = ans.selected_index == question.correct_index
        if is_correct:
            score += 1
        answer_results.append({
            "question_id": question.id,
            "question_text": question.text,
            "options": _parse_options(question),
            "selected_index": ans.selected_index,
            "correct_index": question.correct_index,
            "is_correct": is_correct,
        })

    # Create attempt
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score,
        total=total,
    )
    db.add(attempt)
    db.flush()

    # Save individual answers
    for ans in data.answers:
        question = questions.get(ans.question_id)
        if not question:
            continue
        db.add(QuizAttemptAnswer(
            attempt_id=attempt.id,
            question_id=ans.question_id,
            selected_index=ans.selected_index,
            is_correct=ans.selected_index == question.correct_index,
        ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")
    db.refresh(attempt)

    return QuizAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        score=attempt.score,
        total=attempt.total,
        submitted_at=attempt.submitted_at,
        answers=[QuizAnswerResultOut(**a) for a in answer_results],
    )


@limiter.limit("30/minute")
@router.post("/quizzes/{quiz_id}/submit-file", response_model=QuizAttemptOut)
def submit_quiz_file(request: Request,
    quiz_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a file for a document-only quiz (no MCQs)."""
    if current_user.role.name != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quizzes")

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
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

    submission_url = save_file(file, subdirectory="quiz_submissions")
    submission_name = file.filename

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=0,
        total=0,
        submission_url=submission_url,
        submission_name=submission_name,
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already attempted this quiz")
    db.refresh(attempt)

    return QuizAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        score=attempt.score,
        total=attempt.total,
        submission_url=attempt.submission_url,
        submission_name=attempt.submission_name,
        submitted_at=attempt.submitted_at,
        answers=[],
    )


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

    return QuizAttemptOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        score=attempt.score,
        total=attempt.total,
        submission_url=attempt.submission_url,
        submission_name=attempt.submission_name,
        submitted_at=attempt.submitted_at,
        answers=answers_out,
    )


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
    for a in attempts:
        student = students.get(a.student_id)
        pct = (a.score / a.total * 100) if a.total > 0 else 0
        result.append(QuizTeacherAttemptOut(
            id=a.id,
            quiz_id=a.quiz_id,
            student_id=a.student_id,
            student_name=f"{student.first_name} {student.last_name}" if student else "Unknown",
            score=a.score,
            total=a.total,
            percentage=round(pct, 1),
            submission_url=a.submission_url,
            submission_name=a.submission_name,
            submitted_at=a.submitted_at,
        ))
    return result


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
    if role == "teacher":
        if quiz.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        include_correct = True
    elif role == "student":
        if not quiz.is_published:
            raise HTTPException(status_code=404, detail="Quiz not found")
        course = db.query(Course).filter(Course.id == quiz.course_id).first()
        if not course or not student_has_access(db, current_user, course):
            raise HTTPException(status_code=403, detail="Access denied")
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    out = _quiz_out(quiz)
    return QuizDetailOut(
        **out.model_dump(),
        questions=[_question_out(q, include_correct) for q in quiz.questions],
    )


@limiter.limit("30/minute")
@router.put("/quizzes/{quiz_id}", response_model=QuizOut)
def update_quiz(request: Request, 
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
        if not questions_payload and not quiz.attachment_url:
            raise HTTPException(status_code=400, detail="A quiz needs either questions or an uploaded document")
        for old in quiz.questions:
            db.delete(old)
        for q in _validate_questions(questions_payload, quiz.title):
            q.quiz_id = quiz.id
            db.add(q)

    db.commit()
    db.refresh(quiz)
    return _quiz_out(quiz)


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
    if quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}
