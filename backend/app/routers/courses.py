from typing import List

from fastapi import Request,  APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_admin, require_teacher
from app.models import User, Course, Role, StudentProfile, StudyMaterial, Assignment, Quiz, QuizQuestion
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, ReusableCourseOut, ReuseRequest
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/courses", tags=["Courses"])


def _student_session_label(enrollment_year: int) -> str:
    """Compute session label like '23-27' from enrollment year."""
    return f"{enrollment_year % 100:02d}-{(enrollment_year + 4) % 100:02d}"


def student_has_access(db: Session, user: User, course: Course) -> bool:
    """Check if a student can access a course — same session, semester <= current, active."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile or not profile.enrollment_year or not profile.semester:
        return False
    if not course.session or not course.semester:
        return False
    student_session = _student_session_label(profile.enrollment_year)
    return course.session == student_session and course.semester <= profile.semester and course.is_active


def get_teacher_course_ids(db: Session, teacher_id: str) -> List[str]:
    """Get course IDs a teacher should see — active courses only."""
    return [c.id for c in db.query(Course.id).filter(
        Course.teacher_id == teacher_id,
        Course.is_active == True,
    ).all()]


def get_student_courses(db: Session, user: User) -> List[Course]:
    """Get all courses a student has access to — same session, semester <= current, active only."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile or not profile.enrollment_year or not profile.semester:
        return []
    student_session = _student_session_label(profile.enrollment_year)
    return db.query(Course).filter(
        Course.session == student_session,
        Course.semester <= profile.semester,
        Course.is_active == True,
    ).all()


@limiter.limit("30/minute")
@router.get("/", response_model=List[CourseOut])
def list_courses(request: Request, 
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List courses based on role. Optional is_active filter."""
    role = current_user.role.name

    if role == "admin":
        q = db.query(Course)
        if is_active is not None:
            q = q.filter(Course.is_active == is_active)
        courses = q.offset(skip).limit(limit).all()
    elif role == "teacher":
        courses = db.query(Course).filter(
            Course.teacher_id == current_user.id,
            Course.is_active == True,
        ).offset(skip).limit(limit).all()
    else:  # student
        courses = get_student_courses(db, current_user)

    return courses


@limiter.limit("30/minute")
@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(request: Request, 
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new course (admin only)."""
    existing = db.query(Course).filter(Course.course_code == data.course_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")

    course_data = data.model_dump(exclude_unset=True)
    course = Course(**course_data)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ── Reuse Materials ──────────────────────────────────
@limiter.limit("30/minute")
@router.get("/reusable", response_model=List[ReusableCourseOut])
def list_reusable_courses(request: Request, 
    course_id: str,
    show_all: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """List teacher's other courses with content to reuse.

    By default shows only courses with the same course_code.
    Set show_all=true to show all past courses taught by this teacher.
    """
    target = db.query(Course).filter(Course.id == course_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Course not found")
    if target.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Find other courses by same teacher
    query = db.query(Course).filter(
        Course.teacher_id == current_user.id,
        Course.id != course_id,
    )
    if not show_all:
        query = query.filter(Course.course_code == target.course_code)

    source_courses = query.order_by(Course.created_at.desc()).all()

    course_ids = [sc.id for sc in source_courses]
    mat_counts = dict(db.query(StudyMaterial.course_id, func.count()).filter(
        StudyMaterial.course_id.in_(course_ids)).group_by(StudyMaterial.course_id).all()) if course_ids else {}
    asg_counts = dict(db.query(Assignment.course_id, func.count()).filter(
        Assignment.course_id.in_(course_ids)).group_by(Assignment.course_id).all()) if course_ids else {}
    quiz_counts = dict(db.query(Quiz.course_id, func.count()).filter(
        Quiz.course_id.in_(course_ids)).group_by(Quiz.course_id).all()) if course_ids else {}

    result = []
    for sc in source_courses:
        mat_count = mat_counts.get(sc.id, 0)
        asg_count = asg_counts.get(sc.id, 0)
        quiz_count = quiz_counts.get(sc.id, 0)

        # Skip courses with no content
        if mat_count == 0 and asg_count == 0 and quiz_count == 0:
            continue

        result.append(ReusableCourseOut(
            id=sc.id,
            course_code=sc.course_code,
            title=sc.title,
            semester=sc.semester,
            session=sc.session,
            material_count=mat_count,
            assignment_count=asg_count,
            quiz_count=quiz_count,
            created_at=sc.created_at,
        ))

    return result


@limiter.limit("30/minute")
@router.post("/{course_id}/reuse", status_code=status.HTTP_200_OK)
def reuse_materials(request: Request, 
    course_id: str,
    data: ReuseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Copy selected materials, assignments, and quizzes from a source course into the target course."""
    import shutil
    from datetime import datetime as dt
    import os

    target = db.query(Course).filter(Course.id == course_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target course not found")
    if target.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    source = db.query(Course).filter(Course.id == data.source_course_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source course not found")
    if source.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    copied = {"materials": 0, "assignments": 0, "quizzes": 0}

    # ── Copy Study Materials ──
    for mat_id in data.materials:
        mat = db.query(StudyMaterial).filter(
            StudyMaterial.id == mat_id,
            StudyMaterial.course_id == source.id,
        ).first()
        if not mat:
            continue

        new_file_url = None
        if mat.file_url:
            src_path = os.path.join(os.getcwd(), mat.file_url) if not os.path.isabs(mat.file_url) else mat.file_url
            if os.path.exists(src_path):
                ts = dt.now().strftime("%Y%m%d_%H%M%S_%f")
                ext = os.path.splitext(mat.file_name or mat.file_url)[1]
                new_filename = f"{ts}_{mat.file_name or 'material'}{ext}"
                new_rel = os.path.join("uploads", "materials", new_filename)
                dest_path = os.path.join(os.getcwd(), new_rel)
                shutil.copy2(src_path, dest_path)
                new_file_url = new_rel

        new_mat = StudyMaterial(
            title=mat.title,
            description=mat.description,
            category=mat.category,
            file_url=new_file_url or mat.file_url,
            file_name=mat.file_name,
            course_id=target.id,
            uploaded_by=current_user.id,
        )
        db.add(new_mat)
        copied["materials"] += 1

    # ── Copy Assignments ──
    for asg_id in data.assignments:
        asg = db.query(Assignment).filter(
            Assignment.id == asg_id,
            Assignment.course_id == source.id,
        ).first()
        if not asg:
            continue

        new_attachment_url = None
        if asg.attachment_url:
            src_path = os.path.join(os.getcwd(), asg.attachment_url) if not os.path.isabs(asg.attachment_url) else asg.attachment_url
            if os.path.exists(src_path):
                ts = dt.now().strftime("%Y%m%d_%H%M%S_%f")
                ext = os.path.splitext(os.path.basename(asg.attachment_url))[1]
                new_filename = f"{ts}_{os.path.basename(asg.attachment_url)}{ext}"
                new_rel = os.path.join("uploads", "assignments", new_filename)
                dest_path = os.path.join(os.getcwd(), new_rel)
                shutil.copy2(src_path, dest_path)
                new_attachment_url = new_rel

        new_asg = Assignment(
            course_id=target.id,
            teacher_id=current_user.id,
            title=asg.title,
            description=asg.description,
            due_date=None,
            max_marks=asg.max_marks,
            attachment_url=new_attachment_url or asg.attachment_url,
        )
        db.add(new_asg)
        copied["assignments"] += 1

    # ── Copy Quizzes ──
    for quiz_id in data.quizzes:
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == source.id,
        ).first()
        if not quiz:
            continue

        new_quiz = Quiz(
            course_id=target.id,
            teacher_id=current_user.id,
            title=quiz.title,
            description=quiz.description,
            time_limit=quiz.time_limit,
            deadline=None,
            is_published=False,
        )
        db.add(new_quiz)
        db.flush()

        for q in db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.order_index).all():
            new_q = QuizQuestion(
                quiz_id=new_quiz.id,
                text=q.text,
                options=q.options,
                correct_index=q.correct_index,
                order_index=q.order_index,
            )
            db.add(new_q)

        copied["quizzes"] += 1

    db.commit()

    return {
        "message": f"Reused {copied['materials']} materials, {copied['assignments']} assignments, and {copied['quizzes']} quizzes",
        "copied": copied,
    }


@limiter.limit("30/minute")
@router.get("/{course_id}", response_model=CourseOut)
def get_course(request: Request, 
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get course details."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    role = current_user.role.name
    if role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "student" and not student_has_access(db, current_user, course):
        raise HTTPException(status_code=403, detail="Access denied")

    if role == "student" and not course.is_active:
        raise HTTPException(status_code=404, detail="Course not found")

    return course


@limiter.limit("30/minute")
@router.get("/{course_id}/students")
def list_course_students(request: Request, 
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List students who have access to a course (session+semester match)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    role = current_user.role.name
    if role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    students = (
        db.query(User, StudentProfile)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .join(Role, User.role_id == Role.id)
        .filter(
            Role.name == "student",
            User.is_verified == True,
            User.is_active == True,
            StudentProfile.semester == course.semester,
        )
        .all()
    )

    # Filter by session — use stored session or compute from enrollment_year
    result = []
    for u, sp in students:
        student_session = sp.session
        if not student_session and sp.enrollment_year:
            student_session = _student_session_label(sp.enrollment_year)
        if student_session == course.session:
            result.append({
                "student_id": u.id,
                "user_id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "student_name": f"{u.first_name} {u.last_name}",
                "email": u.email,
                "roll_number": sp.roll_number,
            })

    return result


@limiter.limit("30/minute")
@router.put("/{course_id}", response_model=CourseOut)
def update_course(request: Request, 
    course_id: str,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update course (admin only)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@limiter.limit("30/minute")
@router.delete("/{course_id}")
def delete_course(request: Request, 
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete course (admin only)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    from app.models import (
        Submission, Assignment, AttendanceRecord, AttendanceSession,
        StudyMaterial,
    )
    db.query(Submission).filter(
        Submission.assignment_id.in_(
            db.query(Assignment.id).filter(Assignment.course_id == course_id)
        )
    ).delete(synchronize_session=False)
    db.query(Assignment).filter(Assignment.course_id == course_id).delete()
    db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id.in_(
            db.query(AttendanceSession.id).filter(AttendanceSession.course_id == course_id)
        )
    ).delete(synchronize_session=False)
    db.query(AttendanceSession).filter(AttendanceSession.course_id == course_id).delete()
    db.query(StudyMaterial).filter(StudyMaterial.course_id == course_id).delete()

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}
