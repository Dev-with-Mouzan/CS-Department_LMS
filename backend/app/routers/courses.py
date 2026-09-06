from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_admin, require_teacher, require_student
from app.models import User, Course, Enrollment, Role, StudentProfile
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, EnrollmentCreate, EnrollmentOut

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("/", response_model=List[CourseOut])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List courses based on role."""
    role = current_user.role.name

    if role == "admin":
        courses = db.query(Course).offset(skip).limit(limit).all()
    elif role == "teacher":
        courses = db.query(Course).filter(Course.teacher_id == current_user.id).offset(skip).limit(limit).all()
    else:  # student
        enrolled_course_ids = select(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        )
        courses = db.query(Course).filter(Course.id.in_(enrolled_course_ids)).offset(skip).limit(limit).all()

    _attach_sessions(db, courses)
    return courses


def _attach_sessions(db: Session, courses: list):
    """Compute the BSCS session label for each course.

    Adds a ``session`` attribute like "23-27" derived from the enrollment year of
    a student in the course (preferring a student whose semester matches the
    course semester). Falls back to any student in the same semester when the
    course has no enrollments yet. Assumes a 4-year / 8-semester program.
    """
    if not courses:
        return

    course_ids = [c.id for c in courses]
    enrolled_rows = (
        db.query(Enrollment.course_id, StudentProfile.semester, StudentProfile.enrollment_year)
        .join(User, Enrollment.student_id == User.id)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .filter(
            Enrollment.course_id.in_(course_ids),
            Enrollment.status == "active",
            StudentProfile.enrollment_year.isnot(None),
        )
        .all()
    )
    enrolled_by_course = {}
    for course_id, semester, enrollment_year in enrolled_rows:
        enrolled_by_course.setdefault(course_id, []).append((semester, enrollment_year))

    # Fallback map: semester -> enrollment_year from any student in that semester.
    semester_year = {}
    if any(c.semester is not None for c in courses):
        sem_rows = (
            db.query(StudentProfile.semester, StudentProfile.enrollment_year)
            .filter(StudentProfile.enrollment_year.isnot(None))
            .all()
        )
        for semester, enrollment_year in sem_rows:
            semester_year.setdefault(semester, enrollment_year)

    for course in courses:
        matches = enrolled_by_course.get(course.id) or []
        year = None
        if matches:
            # Prefer an enrolled student whose semester matches the course.
            year = next((ey for sem, ey in matches if sem == course.semester), None)
            if year is None:
                year = matches[0][1]
        elif course.semester is not None:
            # No enrollments yet — use any student in the same semester.
            year = semester_year.get(course.semester)

        if year:
            end_year = year + 4
            course.session = f"{year % 100:02d}-{end_year % 100:02d}"


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
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


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
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
    if role == "student":
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
            Enrollment.status == "active",
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    return course


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
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


@router.delete("/{course_id}")
def delete_course(
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
        StudyMaterial, Enrollment,
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
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}


# ── Enrollment ────────────────────────────────────────
@router.post("/{course_id}/enroll", response_model=EnrollmentOut)
def enroll_student(
    course_id: str,
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Enroll a student in a course (admin only)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id == data.student_id,
        Enrollment.course_id == course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already enrolled")

    enrollment = Enrollment(
        student_id=data.student_id,
        course_id=course_id,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/{course_id}/enrollments", response_model=List[EnrollmentOut])
def list_enrollments(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List enrollments for a course."""
    role = current_user.role.name

    if role == "admin":
        pass  # can see all
    elif role == "teacher":
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course or course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:  # student
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == "active",
    ).all()

    result = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == e.student_id).first()
        student_name = None
        roll_number = None
        if student:
            student_name = f"{student.first_name} {student.last_name}".strip()
        if profile:
            roll_number = profile.roll_number
        result.append(EnrollmentOut(
            id=e.id,
            student_id=e.student_id,
            course_id=e.course_id,
            enrollment_date=e.enrollment_date,
            status=e.status,
            student_name=student_name,
            roll_number=roll_number,
        ))
    return result
