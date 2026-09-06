import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher, require_student
from app.models import (
    User, Course, Enrollment, StudentProfile,
    AttendanceSession, AttendanceRecord
)
from app.schemas.attendance import (
    AttendanceSessionCreate, AttendanceSessionOut,
    AttendanceRecordBulk, AttendanceRecordOut,
    AttendancePercentageOut
)
from app.services.attendance_excel import generate_attendance_excel
from app.routers.courses import _attach_sessions

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# ── Attendance Sessions ───────────────────────────────
@router.post("/sessions", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
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


@router.get("/sessions", response_model=List[AttendanceSessionOut])
def list_sessions(
    course_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List attendance sessions."""
    role = current_user.role.name
    query = db.query(AttendanceSession)

    if role == "teacher":
        query = query.filter(AttendanceSession.teacher_id == current_user.id)
    elif role == "student":
        enrolled_ids = select(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        )
        query = query.filter(AttendanceSession.course_id.in_(enrolled_ids))

    if course_id:
        query = query.filter(AttendanceSession.course_id == course_id)

    return query.order_by(AttendanceSession.session_date.desc()).all()


# ── Attendance Records ────────────────────────────────
@router.post("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def mark_attendance(
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

    records = []
    for record_data in data.records:
        # Verify student is enrolled in the course
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == record_data.student_id,
            Enrollment.course_id == session.course_id,
            Enrollment.status == "active",
        ).first()
        if not enrollment:
            continue

        # Check if record already exists
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == record_data.student_id,
        ).first()

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


@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def get_session_records(
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
@router.get("/course/{course_id}/matrix")
def get_course_attendance_matrix(
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

    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == "active",
    ).all()

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
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == e.student_id).first()
        student_name = f"{student.first_name} {student.last_name}".strip() if student else "Unknown"
        roll_number = profile.roll_number if profile else None
        student_id = e.student_id

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

    _attach_sessions(db, [course])

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
@router.get("/export/{course_id}")
def export_attendance_excel(
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
@router.get("/student/{student_id}/course/{course_id}", response_model=AttendancePercentageOut)
def get_attendance_percentage(
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

    # Verify enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id,
        Enrollment.status == "active",
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled in this course")

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
        AttendanceRecord.status == "present",
    ).scalar()

    percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0.0

    return AttendancePercentageOut(
        student_id=student_id,
        course_id=course_id,
        total_sessions=total_sessions,
        present_count=present_count,
        percentage=round(percentage, 2),
    )
