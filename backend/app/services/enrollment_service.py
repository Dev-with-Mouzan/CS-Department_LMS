from sqlalchemy.orm import Session

from app.models import User, Course, Enrollment, StudentProfile


def get_student_semester(db: Session, student: User) -> int | None:
    """Return the student's current semester, if any."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    return profile.semester if profile else None


def auto_enroll_student(db: Session, student: User) -> int:
    """Enroll a student in all active courses matching their semester.

    Returns the number of new enrollments created.
    """
    semester = get_student_semester(db, student)
    if semester is None:
        return 0

    courses = db.query(Course).filter(
        Course.semester == semester,
        Course.is_active == True,  # noqa: E712
    ).all()

    existing_ids = {
        cid
        for (cid,) in db.query(Enrollment.course_id).filter(
            Enrollment.student_id == student.id
        ).all()
    }

    created = 0
    for course in courses:
        if course.id in existing_ids:
            continue
        db.add(Enrollment(
            student_id=student.id,
            course_id=course.id,
        ))
        created += 1

    if created:
        db.commit()
    return created
