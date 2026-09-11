from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import require_admin, hash_password
from app.dependencies.ratelimit import limiter
from app.models import User, Role, TeacherProfile, StudentProfile, Course, PromotionHistory, Assignment, Submission, Quiz, QuizAttempt, AttendanceSession, AttendanceRecord, Result
from app.schemas.user import (
    UserCreate, UserUpdate, UserWithRole, PasswordResetBody, PromotionRequest,
)
from app.services.auth_service import create_user as create_user_service
from app.services.email_service import send_credentials_email
from app.services.otp_service import create_otp

from app.routers.courses import _student_session_label as _session_label

router = APIRouter(prefix="/api/users", tags=["Users"])


def _get_user_or_404(db: Session, user_id) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _check_email_available(db: Session, email: str, exclude_user_id=None) -> None:
    query = db.query(User).filter(User.email == email)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Email already registered")


def _delete_user_dependencies(db: Session, user: User) -> None:
    """Hard-delete a user and every row that references them (dependency order).

    Covers submissions, attendance, OTP/notification records,
    profiles, and — for teachers — their assignments, materials and
    taught courses (with each course's own children).
    """
    from app.models import (
        Submission, AttendanceRecord, OTPVerification,
        Notification, Assignment, StudyMaterial,
        AttendanceSession, Quiz, QuizQuestion, Result, Review,
        PromotionHistory, QuizAttempt, QuizAttemptAnswer,
    )

    user_id = user.id

    # Course children for every course this user teaches (teacher case)
    taught_course_ids = [
        cid for (cid,) in db.query(Course.id).filter(Course.teacher_id == user_id).all()
    ]
    for course_id in taught_course_ids:
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
        quiz_ids = [q.id for q in db.query(Quiz.id).filter(Quiz.course_id == course_id).all()]
        if quiz_ids:
            db.query(QuizAttemptAnswer).filter(
                QuizAttemptAnswer.attempt_id.in_(
                    db.query(QuizAttempt.id).filter(QuizAttempt.quiz_id.in_(quiz_ids))
                )
            ).delete(synchronize_session=False)
            db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
        db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id.in_(
                db.query(Quiz.id).filter(Quiz.course_id == course_id)
            )
        ).delete(synchronize_session=False)
        db.query(Quiz).filter(Quiz.course_id == course_id).delete()
        db.query(Result).filter(Result.course_id == course_id).delete()
    db.query(Course).filter(Course.teacher_id == user_id).delete()

    # Direct user references
    db.query(Submission).filter(Submission.student_id == user_id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == user_id).delete()
    db.query(Assignment).filter(Assignment.teacher_id == user_id).delete()
    db.query(StudyMaterial).filter(StudyMaterial.uploaded_by == user_id).delete()
    db.query(OTPVerification).filter(OTPVerification.user_id == user_id).delete()
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id.in_(
            db.query(Quiz.id).filter(Quiz.teacher_id == user_id)
        )
    ).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.teacher_id == user_id).delete()
    db.query(Result).filter(Result.uploaded_by == user_id).delete()
    db.query(Review).filter(Review.user_id == user_id).delete()
    db.query(PromotionHistory).filter(
        (PromotionHistory.student_id == user_id) | (PromotionHistory.promoted_by == user_id)
    ).delete()
    db.query(QuizAttemptAnswer).filter(
        QuizAttemptAnswer.attempt_id.in_(
            db.query(QuizAttempt.id).filter(QuizAttempt.student_id == user_id)
        )
    ).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).delete()
    db.query(TeacherProfile).filter(TeacherProfile.user_id == user_id).delete()
    db.query(StudentProfile).filter(StudentProfile.user_id == user_id).delete()


# ── Static routes (must precede dynamic /{user_id}) ───
@router.get("/", response_model=List[UserWithRole])
@limiter.limit("30/minute")
def list_users(request: Request, 
        role: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users (admin only). Optional role filter."""
    query = db.query(User)
    if role:
        role_obj = db.query(Role).filter(Role.name == role).first()
        if role_obj:
            query = query.filter(User.role_id == role_obj.id)
    return query.offset(skip).limit(limit).all()


@router.get("/stats/dashboard")
@limiter.limit("30/minute")
def get_admin_stats(request: Request, 
        db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get admin dashboard statistics."""
    total_users = db.query(User).count()
    total_students = db.query(User).join(Role).filter(Role.name == "student").count()
    total_teachers = db.query(User).join(Role).filter(Role.name == "teacher").count()
    pending_verification = db.query(User).filter(User.is_verified == False).count()  # noqa: E712
    active_users = db.query(User).filter(User.is_active == True).count()  # noqa: E712

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "pending_verification": pending_verification,
    }


# ── Dynamic routes ────────────────────────────────────
@router.get("/{user_id}", response_model=UserWithRole)
@limiter.limit("30/minute")
def get_user(request: Request, 
        user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get user by ID (admin only)."""
    return _get_user_or_404(db, user_id)


@router.get("/{user_id}/profile")
@limiter.limit("30/minute")
def get_student_profile(request: Request, 
        user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get comprehensive student profile: attendance, assignments, quizzes, results."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    role = db.query(Role).filter(Role.id == user.role_id).first()
    session_label = _session_label(profile.enrollment_year) if profile.enrollment_year else None

    # Get courses for the CURRENT semester only (so promoted students show zeroed data)
    courses = db.query(Course).filter(
        Course.session == session_label,
        Course.semester == profile.semester,
    ).all()

    # ── Attendance per course ─────────────────────────
    attendance = []
    for course in courses:
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == course.id
        ).all()
        session_ids = [s.id for s in sessions]
        total_sessions = len(session_ids)

        present_count = 0
        if session_ids:
            present_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id.in_(session_ids),
                AttendanceRecord.student_id == user_id,
                AttendanceRecord.status == "present",
            ).count()

        pct = round(present_count / total_sessions * 100, 1) if total_sessions > 0 else 0
        attendance.append({
            "course_id": course.id,
            "course_name": course.title,
            "total_sessions": total_sessions,
            "present": present_count,
            "percentage": pct,
        })

    # ── Assignments ───────────────────────────────────
    course_ids = [c.id for c in courses]
    assignments = []
    if course_ids:
        asg_rows = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
        for asg in asg_rows:
            sub = db.query(Submission).filter(
                Submission.assignment_id == asg.id,
                Submission.student_id == user_id,
            ).first()
            assignments.append({
                "id": asg.id,
                "title": asg.title,
                "course_id": asg.course_id,
                "course_name": asg.course.title if asg.course else None,
                "due_date": asg.due_date.isoformat() if asg.due_date else None,
                "max_marks": asg.max_marks,
                "submitted": sub is not None,
                "grade": sub.grade if sub else None,
                "feedback": sub.feedback if sub else None,
                "submitted_at": sub.submitted_at.isoformat() if sub and sub.submitted_at else None,
            })

    # ── Quizzes ───────────────────────────────────────
    quizzes = []
    if course_ids:
        quiz_rows = db.query(Quiz).filter(Quiz.course_id.in_(course_ids)).all()
        for q in quiz_rows:
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == q.id,
                QuizAttempt.student_id == user_id,
            ).first()
            quizzes.append({
                "id": q.id,
                "title": q.title,
                "course_id": q.course_id,
                "course_name": q.course.title if q.course else None,
                "total_questions": len(q.questions),
                "score": attempt.score if attempt else None,
                "total": attempt.total if attempt else None,
                "submission_url": attempt.submission_url if attempt else None,
                "submission_name": attempt.submission_name if attempt else None,
                "submitted_at": attempt.submitted_at.isoformat() if attempt and attempt.submitted_at else None,
                "attempted": attempt is not None,
            })

    # ── Results ───────────────────────────────────────
    results = []
    if course_ids:
        res_rows = db.query(Result).filter(Result.course_id.in_(course_ids)).all()
        for r in res_rows:
            results.append({
                "id": r.id,
                "course_id": r.course_id,
                "course_name": r.course.title if r.course else None,
                "exam_type": r.exam_type,
                "file_name": r.file_name,
                "uploaded_at": r.created_at.isoformat() if r.created_at else None,
            })

    # ── Promotion history ─────────────────────────────
    promo_history = db.query(PromotionHistory).filter(
        PromotionHistory.student_id == user_id
    ).order_by(PromotionHistory.promoted_at.desc()).all()
    promotions = [
        {
            "id": ph.id,
            "from_semester": ph.from_semester,
            "to_semester": ph.to_semester,
            "session": ph.session,
            "promoted_at": ph.promoted_at.isoformat() if ph.promoted_at else None,
        }
        for ph in promo_history
    ]

    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
        },
        "profile": {
            "student_id": profile.id,
            "roll_number": profile.roll_number,
            "department": profile.department,
            "semester": profile.semester,
            "session": session_label,
            "enrollment_year": profile.enrollment_year,
        },
        "attendance": attendance,
        "assignments": assignments,
        "quizzes": quizzes,
        "results": results,
        "promotions": promotions,
    }


@limiter.limit("30/minute")
@router.get("/{user_id}/semester-progress")
def get_semester_progress(request: Request, 
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get full 8-semester progress for a student."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    session_label = _session_label(profile.enrollment_year) if profile.enrollment_year else None
    current_semester = profile.semester or 1

    semesters = []
    for sem in range(1, 9):
        # Get courses for this semester
        courses = db.query(Course).filter(
            Course.session == session_label,
            Course.semester == sem,
        ).all()
        course_ids = [c.id for c in courses]

        # Status
        if sem < current_semester:
            status = "completed"
        elif sem == current_semester:
            status = "current"
        else:
            status = "upcoming"

        # Attendance
        total_sessions = 0
        present_count = 0
        for course in courses:
            sessions = db.query(AttendanceSession).filter(
                AttendanceSession.course_id == course.id
            ).all()
            sids = [s.id for s in sessions]
            total_sessions += len(sids)
            if sids:
                present_count += db.query(AttendanceRecord).filter(
                    AttendanceRecord.session_id.in_(sids),
                    AttendanceRecord.student_id == user_id,
                    AttendanceRecord.status == "present",
                ).count()

        attendance_pct = round(present_count / total_sessions * 100, 1) if total_sessions > 0 else 0

        # Assignments
        total_assignments = 0
        submitted_count = 0
        graded_count = 0
        total_grade = 0
        if course_ids:
            asg_rows = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
            total_assignments = len(asg_rows)
            for asg in asg_rows:
                sub = db.query(Submission).filter(
                    Submission.assignment_id == asg.id,
                    Submission.student_id == user_id,
                ).first()
                if sub:
                    submitted_count += 1
                    if sub.grade is not None:
                        graded_count += 1
                        total_grade += sub.grade

        avg_grade = round(total_grade / graded_count, 1) if graded_count > 0 else None

        # Quizzes
        total_quizzes = 0
        attempted_count = 0
        total_score = 0
        total_possible = 0
        if course_ids:
            quiz_rows = db.query(Quiz).filter(Quiz.course_id.in_(course_ids)).all()
            total_quizzes = len(quiz_rows)
            for q in quiz_rows:
                attempt = db.query(QuizAttempt).filter(
                    QuizAttempt.quiz_id == q.id,
                    QuizAttempt.student_id == user_id,
                ).first()
                if attempt:
                    attempted_count += 1
                    total_score += attempt.score
                    total_possible += attempt.total

        quiz_pct = round(total_score / total_possible * 100, 1) if total_possible > 0 else None

        semesters.append({
            "semester": sem,
            "status": status,
            "courses": len(courses),
            "course_names": [c.title for c in courses],
            "total_sessions": total_sessions,
            "present": present_count,
            "attendance_pct": attendance_pct,
            "total_assignments": total_assignments,
            "submitted_assignments": submitted_count,
            "avg_grade": avg_grade,
            "total_quizzes": total_quizzes,
            "attempted_quizzes": attempted_count,
            "quiz_pct": quiz_pct,
        })

    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        },
        "profile": {
            "session": session_label,
            "current_semester": current_semester,
            "department": profile.department,
            "roll_number": profile.roll_number,
        },
        "semesters": semesters,
    }


@limiter.limit("30/minute")
@router.post("/", response_model=UserWithRole, status_code=status.HTTP_201_CREATED)
def create_user(request: Request, 
    data: UserCreate,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user (admin only)."""
    _check_email_available(db, data.email)
    if data.phone:
        phone_existing = db.query(User).filter(User.phone == data.phone).first()
        if phone_existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")

    user = create_user_service(db, data.model_dump())

    # Students created by admin: auto-verify so they can login immediately
    if user.role.name == "student":
        user.is_verified = True
        db.commit()
        db.refresh(user)

    # Teachers created by admin: auto-verify so they can login immediately,
    # and email the credentials (email, phone, password) to the teacher.
    if user.role.name == "teacher":
        user.is_verified = True
        db.commit()
        db.refresh(user)
        bg_tasks.add_task(
            send_credentials_email,
            user.email,
            f"{user.first_name} {user.last_name}",
            user.phone,
            data.password,
        )

    return user


@limiter.limit("30/minute")
@router.put("/{user_id}", response_model=UserWithRole)
def update_user(request: Request, 
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user details (admin only)."""
    user = _get_user_or_404(db, user_id)
    _check_email_available(db, data.email, exclude_user_id=user.id)

    update_data = data.model_dump(exclude_unset=True)
    semester = update_data.pop("semester", None)

    for field, value in update_data.items():
        setattr(user, field, value)

    if semester is not None:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile:
            profile.semester = semester
        else:
            db.add(StudentProfile(user_id=user.id, semester=semester))

    db.commit()
    db.refresh(user)

    return user


@limiter.limit("30/minute")
@router.put("/{user_id}/password")
def set_password(request: Request, 
    user_id: str,
    data: PasswordResetBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Set a new password for a user (admin only)."""
    user = _get_user_or_404(db, user_id)
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@limiter.limit("30/minute")
@router.delete("/{user_id}/hard")
def hard_delete_user(request: Request, 
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Permanently delete a user (admin only — hard delete)."""
    user = _get_user_or_404(db, user_id)

    _delete_user_dependencies(db, user)
    db.delete(user)
    db.commit()
    return {"message": "User deleted permanently"}


@limiter.limit("30/minute")
@router.delete("/{user_id}")
def delete_user(request: Request, 
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a user (admin only — soft delete)."""
    user = _get_user_or_404(db, user_id)
    user.is_active = False
    db.commit()
    return {"message": "User deactivated successfully"}


# ── Promotion Endpoints ──────────────────────────────

@limiter.limit("30/minute")
@router.get("/promotion/sessions")
def get_promotion_sessions(request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all sessions with student counts."""
    profiles = db.query(StudentProfile).filter(
        StudentProfile.enrollment_year.isnot(None)
    ).all()

    sessions = {}
    for p in profiles:
        label = _session_label(p.enrollment_year)
        if label not in sessions:
            sessions[label] = {"session": label, "enrollment_year": p.enrollment_year, "student_count": 0}
        sessions[label]["student_count"] += 1

    return sorted(sessions.values(), key=lambda s: s["enrollment_year"], reverse=True)


@limiter.limit("30/minute")
@router.get("/promotion/sessions/{session}/semesters")
def get_session_semesters(request: Request, 
    session: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get semester breakdown for a session — always shows all 8 semesters."""
    parts = session.split("-")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid session format")
    try:
        start_year = int(parts[0]) + 2000
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session format")

    # Current students
    profiles = db.query(StudentProfile).filter(
        StudentProfile.enrollment_year == start_year,
        StudentProfile.semester.isnot(None),
    ).all()

    semesters = {}
    for p in profiles:
        sem = p.semester
        if sem not in semesters:
            semesters[sem] = {"semester": sem, "student_count": 0, "graduated_count": 0}
        semesters[sem]["student_count"] += 1
        if p.is_graduated:
            semesters[sem]["graduated_count"] += 1

    # Students who were promoted FROM each semester (still count them in from-semester)
    promoted_records = db.query(PromotionHistory).filter(
        PromotionHistory.session == session,
    ).all()
    for r in promoted_records:
        sem = r.from_semester
        if sem not in semesters:
            semesters[sem] = {"semester": sem, "student_count": 0, "graduated_count": 0}
        semesters[sem]["student_count"] += 1

    # Always return all 8 semesters
    result = []
    for sem in range(1, 9):
        if sem in semesters:
            result.append(semesters[sem])
        else:
            result.append({"semester": sem, "student_count": 0, "graduated_count": 0})
    return result


@limiter.limit("30/minute")
@router.get("/promotion/sessions/{session}/semesters/{semester}")
def get_semester_students(request: Request, 
    session: str,
    semester: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get all students in a specific session+semester, including promoted-away students."""
    parts = session.split("-")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid session format")
    try:
        start_year = int(parts[0]) + 2000
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session format")

    # Current students in this semester
    profiles = db.query(StudentProfile).filter(
        StudentProfile.enrollment_year == start_year,
        StudentProfile.semester == semester,
    ).all()

    # Students who were promoted FROM this semester (now in a higher semester)
    promoted_records = db.query(PromotionHistory).filter(
        PromotionHistory.session == session,
        PromotionHistory.from_semester == semester,
    ).all()
    promoted_ids = {r.student_id for r in promoted_records}
    promoted_map = {r.student_id: r.to_semester for r in promoted_records}

    # Collect all user IDs (current + promoted)
    all_user_ids = {p.user_id for p in profiles} | promoted_ids
    profiles_by_uid = {p.user_id: p for p in profiles}

    students = []
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(list(all_user_ids))).all()} if all_user_ids else {}
    for uid in all_user_ids:
        user = users_map.get(uid)
        if not user:
            continue
        p = profiles_by_uid.get(uid)
        is_promoted = uid in promoted_ids
        students.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "student_id": p.student_id if p else None,
            "roll_number": p.roll_number if p else None,
            "semester": p.semester if p else semester,
            "enrollment_year": p.enrollment_year if p else start_year,
            "promoted": is_promoted,
            "promoted_to": promoted_map.get(uid) if is_promoted else None,
            "is_graduated": p.is_graduated if p else False,
        })

    return students


@limiter.limit("30/minute")
@router.post("/promotion/promote")
def promote_students(request: Request, 
    data: PromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Promote students to the next semester.

    Expects: { "student_ids": ["id1", "id2", ...], "to_semester": 4 }
    """
    student_ids = data.student_ids
    to_semester = data.to_semester

    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")
    if not to_semester or to_semester < 1 or to_semester > 8:
        raise HTTPException(status_code=400, detail="Invalid target semester")

    promoted = 0
    archived_semesters = set()
    for sid in student_ids:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == sid).first()
        if not profile or not profile.enrollment_year:
            continue

        from_semester = profile.semester
        if from_semester == to_semester:
            continue

        session_label = _session_label(profile.enrollment_year)

        # Record promotion history
        db.add(PromotionHistory(
            student_id=sid,
            from_semester=from_semester,
            to_semester=to_semester,
            session=session_label,
            promoted_by=current_user.id,
        ))

        profile.semester = to_semester
        promoted += 1

        # Track which session+semesters need course archival
        archived_semesters.add((session_label, from_semester))

    # Auto-archive courses from promoted semesters
    for session_label, sem in archived_semesters:
        db.query(Course).filter(
            Course.session == session_label,
            Course.semester == sem,
            Course.is_active == True,
        ).update({"is_active": False})

    db.commit()
    return {"message": f"Promoted {promoted} students to semester {to_semester}", "count": promoted}


@limiter.limit("30/minute")
@router.post("/promotion/graduate")
def graduate_students(request: Request,
    data: PromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Mark students as graduated and archive all their semester courses."""
    student_ids = data.student_ids
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")

    graduated = 0
    archived_semesters = set()
    for sid in student_ids:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == sid).first()
        if not profile:
            continue
        if not profile.is_graduated:
            profile.is_graduated = True
            graduated += 1
            if profile.enrollment_year:
                session_label = _session_label(profile.enrollment_year)
                archived_semesters.add((session_label, profile.semester))

    # Archive courses from graduated semesters
    for session_label, sem in archived_semesters:
        db.query(Course).filter(
            Course.session == session_label,
            Course.semester == sem,
            Course.is_active == True,
        ).update({"is_active": False})

    db.commit()
    return {"message": f"Graduated {graduated} students", "count": graduated}


@limiter.limit("30/minute")
@router.get("/promotion/history")
def get_promotion_history(request: Request, 
    session: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get promotion history, optionally filtered by session."""
    query = db.query(PromotionHistory)
    if session:
        query = query.filter(PromotionHistory.session == session)

    records = query.order_by(PromotionHistory.promoted_at.desc()).all()

    all_user_ids = set()
    for r in records:
        all_user_ids.add(r.student_id)
        all_user_ids.add(r.promoted_by)
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(all_user_ids)).all()} if all_user_ids else {}

    result = []
    for r in records:
        student = users_map.get(r.student_id)
        admin = users_map.get(r.promoted_by)
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "from_semester": r.from_semester,
            "to_semester": r.to_semester,
            "session": r.session,
            "promoted_by": f"{admin.first_name} {admin.last_name}" if admin else "Unknown",
            "promoted_at": r.promoted_at.isoformat() if r.promoted_at else None,
        })

    return result
