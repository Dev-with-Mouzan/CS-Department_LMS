from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher, require_student
from app.models import (
    User, Course, Enrollment,
    AttendanceSession, AttendanceRecord
)
from app.schemas.attendance import (
    AttendanceSessionCreate, AttendanceSessionOut,
    AttendanceRecordBulk, AttendanceRecordOut,
    AttendancePercentageOut
)

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
    course_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List attendance sessions."""
    role = current_user.role.name
    query = db.query(AttendanceSession)

    if role == "teacher":
        query = query.filter(AttendanceSession.teacher_id == current_user.id)
    elif role == "student":
        enrolled_ids = db.query(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        ).subquery()
        query = query.filter(AttendanceSession.course_id.in_(enrolled_ids))

    if course_id:
        query = query.filter(AttendanceSession.course_id == course_id)

    return query.order_by(AttendanceSession.session_date.desc()).all()


# ── Attendance Records ────────────────────────────────
@router.post("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def mark_attendance(
    session_id: UUID,
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
    session_id: UUID,
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


# ── Attendance Percentage ─────────────────────────────
@router.get("/student/{student_id}/course/{course_id}", response_model=AttendancePercentageOut)
def get_attendance_percentage(
    student_id: UUID,
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance percentage for a student in a course."""
    role = current_user.role.name

    # Students can only view their own attendance
    if role == "student" and current_user.id != student_id:
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
