import io
from typing import List
from fastapi import Request,  APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher, require_student
from app.models import (
    User, Course, StudentProfile,
    AttendanceSession, AttendanceRecord
)
from app.schemas.attendance import (
    AttendanceSessionCreate, AttendanceSessionOut,
    AttendanceRecordBulk, AttendanceRecordOut,
    AttendancePercentageOut
)
from app.services.attendance_excel import generate_attendance_excel
from app.routers.courses import student_has_access, get_student_courses
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# ── Attendance Sessions ───────────────────────────────
@limiter.limit("30/minute")
@router.post("/sessions", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(request: Request, 
    data: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Create an attendance session (teacher only, must own course)."""
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not course.is_active:
        raise HTTPException(status_code=400, detail="Cannot create attendance for an archived course")

    existing = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == data.course_id,
        AttendanceSession.session_date == data.session_date,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Attendance already marked for {course.course_code} on {data.session_date}",
        )

    session = AttendanceSession(
        course_id=data.course_id,
        teacher_id=current_user.id,
        session_date=data.session_date,
        start_time=data.start_time,
        topic=data.topic,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@limiter.limit("30/minute")
@router.get("/sessions", response_model=List[AttendanceSessionOut])
def list_sessions(request: Request, 
    course_id: str = None,
    skip: int = 0,
    limit: int = 100,
    active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List attendance sessions. active=true returns only active course sessions, active=false returns inactive."""
    role = current_user.role.name
    query = db.query(AttendanceSession)

    if role == "teacher":
        from app.routers.courses import get_teacher_course_ids
        teacher_course_ids = get_teacher_course_ids(db, current_user.id)
        if not teacher_course_ids:
            return []
        query = query.filter(AttendanceSession.course_id.in_(teacher_course_ids))
    elif role == "student":
        student_course_ids = [c.id for c in get_student_courses(db, current_user)]
        query = query.filter(AttendanceSession.course_id.in_(student_course_ids))

    if course_id:
        query = query.filter(AttendanceSession.course_id == course_id)

    if active is not None:
        from app.models.models import Course
        subq = db.query(Course.id).filter(Course.is_active == active).subquery()
        query = query.filter(AttendanceSession.course_id.in_(subq))

    return query.order_by(AttendanceSession.session_date.desc()).offset(skip).limit(limit).all()


# ── Attendance Records ────────────────────────────────
@limiter.limit("30/minute")
@router.post("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def mark_attendance(request: Request, 
    session_id: str,
    data: AttendanceRecordBulk,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Mark attendance for a session (teacher only)."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    course = db.query(Course).filter(Course.id == session.course_id).first()
    records = []

    student_ids = [record_data.student_id for record_data in data.records]
    students_map = {u.id: u for u in db.query(User).filter(User.id.in_(student_ids)).all()} if student_ids else {}
    existing_records = {
        r.student_id: r for r in db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id.in_(student_ids),
        ).all()
    } if student_ids else {}

    for record_data in data.records:
        student_user = students_map.get(record_data.student_id)
        if not student_user or not student_has_access(db, student_user, course):
            continue

        existing = existing_records.get(record_data.student_id)

        if existing:
            existing.status = record_data.status
            record = existing
        else:
            record = AttendanceRecord(
                session_id=session_id,
                student_id=record_data.student_id,
                status=record_data.status,
            )
            db.add(record)

        records.append(record)

    db.commit()
    for r in records:
        db.refresh(r)
    return records


@limiter.limit("30/minute")
@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def get_session_records(request: Request, 
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance records for a session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    role = current_user.role.name
    if role == "teacher" and session.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "student":
        # Students can only see their own record
        return db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == current_user.id,
        ).all()

    return db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
    ).all()


# ── Attendance Matrix (View/Export for admin) ────────
@limiter.limit("30/minute")
@router.get("/course/{course_id}/matrix")
def get_course_attendance_matrix(request: Request, 
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full attendance matrix for a course (admin or owning teacher)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    role = current_user.role.name
    if role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "student":
        raise HTTPException(status_code=403, detail="Access denied")

    sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.course_id == course_id)
        .order_by(AttendanceSession.session_date.asc(), AttendanceSession.start_time.asc())
        .all()
    )

    # Get students who have access to this course (session+semester match)
    all_students = db.query(StudentProfile).filter(
        StudentProfile.semester == course.semester,
        StudentProfile.enrollment_year.isnot(None),
    ).all()

    all_user_ids = {sp.user_id for sp in all_students}
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(all_user_ids)).all()} if all_user_ids else {}

    enrolled_students = []
    for sp in all_students:
        student_user = users_map.get(sp.user_id)
        if student_user and student_has_access(db, student_user, course):
            enrolled_students.append(sp)

    records = db.query(AttendanceRecord).join(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
    ).all()

    records_by_session = {}
    for rec in records:
        records_by_session.setdefault(rec.session_id, {})[rec.student_id] = rec.status

    sessions_out = [
        {
            "id": s.id,
            "session_date": str(s.session_date),
            "start_time": str(s.start_time),
            "topic": s.topic,
        }
        for s in sessions
    ]

    students_out = []
    for sp in enrolled_students:
        student = users_map.get(sp.user_id)
        student_name = f"{student.first_name} {student.last_name}".strip() if student else "Unknown"
        roll_number = sp.roll_number
        student_id = sp.user_id

        present = late = absent = excused = 0
        for s in sessions:
            status = records_by_session.get(s.id, {}).get(student_id)
            if status == "present":
                present += 1
            elif status == "late":
                late += 1
            elif status == "excused":
                excused += 1
            elif status == "absent":
                absent += 1

        total = len(sessions)
        attended = present + late
        students_out.append({
            "student_id": student_id,
            "student_name": student_name,
            "roll_number": roll_number,
            "present": present,
            "late": late,
            "absent": absent,
            "excused": excused,
            "total_sessions": total,
            "percentage": round((attended / total * 100), 2) if total > 0 else 0.0,
        })

    students_out.sort(key=lambda s: (s["roll_number"] or "zzz"))

    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "course_code": course.course_code,
            "semester": course.semester,
            "session": course.session,
        },
        "sessions": sessions_out,
        "records": records_by_session,
        "students": students_out,
    }


# ── Excel Export ─────────────────────────────────────
@limiter.limit("30/minute")
@router.get("/export/{course_id}")
def export_attendance_excel(request: Request, 
    course_id: str,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download attendance Excel for a course and month (teacher or admin)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    role = current_user.role.name
    if role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        wb = generate_attendance_excel(db, course_id, current_user, year, month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save to memory and return as streaming response
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    from calendar import month_name
    filename = f"Attendance_{course.course_code}_{month_name[month]}_{year}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Attendance Percentage ─────────────────────────────
@limiter.limit("30/minute")
@router.get("/student/{student_id}/course/{course_id}", response_model=AttendancePercentageOut)
def get_attendance_percentage(request: Request, 
    student_id: str,
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance percentage for a student in a course."""
    role = current_user.role.name

    # Students can only view their own attendance
    if role == "student" and str(current_user.id) != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify access via session+semester
    course = db.query(Course).filter(Course.id == course_id).first()
    student_user = db.query(User).filter(User.id == student_id).first()
    if not course or not student_user or not student_has_access(db, student_user, course):
        raise HTTPException(status_code=404, detail="Student not found in this course")

    # Total sessions for this course
    total_sessions = db.query(func.count(AttendanceSession.id)).filter(
        AttendanceSession.course_id == course_id,
    ).scalar()

    # Present sessions
    present_count = db.query(func.count(AttendanceRecord.id)).join(
        AttendanceSession
    ).filter(
        AttendanceSession.course_id == course_id,
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.status.in_(["present", "late"]),
    ).scalar()

    percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0.0

    return AttendancePercentageOut(
        student_id=student_id,
        course_id=course_id,
        total_sessions=total_sessions,
        present_count=present_count,
        percentage=round(percentage, 2),
    )
