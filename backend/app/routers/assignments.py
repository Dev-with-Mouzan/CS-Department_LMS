from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher, require_student
from app.models import User, Assignment, Submission, Course, Enrollment
from app.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionOut, SubmissionGrade
)
from app.models import StudentProfile
from app.services.file_service import save_file

router = APIRouter(prefix="/api", tags=["Assignments"])


# ── Assignment CRUD (Teacher) ─────────────────────────
@router.get("/assignments", response_model=List[AssignmentOut])
def list_assignments(
    course_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List assignments based on role."""
    role = current_user.role.name
    query = db.query(Assignment)

    if role == "teacher":
        query = query.filter(Assignment.teacher_id == current_user.id)
    elif role == "student":
        enrolled_ids = select(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        )
        query = query.filter(Assignment.course_id.in_(enrolled_ids))

    if course_id:
        query = query.filter(Assignment.course_id == course_id)

    return query.order_by(Assignment.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Create a new assignment (teacher only)."""
    # Verify teacher owns the course
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create assignments for your courses")

    assignment = Assignment(
        course_id=data.course_id,
        teacher_id=current_user.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        max_marks=data.max_marks,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get assignment details."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    role = current_user.role.name
    if role == "teacher" and assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "student":
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == assignment.course_id,
            Enrollment.status == "active",
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    return assignment


@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: str,
    data: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Update assignment (teacher only, must own)."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Delete assignment (teacher only, must own)."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted successfully"}


# ── Submissions ───────────────────────────────────────
@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def submit_assignment(
    assignment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Submit an assignment (student only, must be enrolled)."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == assignment.course_id,
        Enrollment.status == "active",
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    # Check duplicate submission
    existing = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this assignment")

    # Save file
    file_path = save_file(file, subdirectory="submissions")

    # Check if late
    from datetime import datetime
    is_late = datetime.utcnow() > assignment.due_date

    submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_url=file_path,
        status="late" if is_late else "submitted",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/assignments/{assignment_id}/submissions", response_model=List[SubmissionOut])
def list_submissions(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List submissions for an assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    role = current_user.role.name
    if role == "student":
        # Students can only see their own submission
        submissions = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id,
        ).all()
    elif role == "teacher":
        if assignment.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        submissions = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
        ).all()
    else:
        submissions = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
        ).all()

    result = []
    for sub in submissions:
        student = db.query(User).filter(User.id == sub.student_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == sub.student_id).first()
        student_name = None
        roll_number = None
        if student:
            student_name = f"{student.first_name} {student.last_name}".strip()
        if profile:
            roll_number = profile.roll_number
        result.append(SubmissionOut(
            id=sub.id,
            assignment_id=sub.assignment_id,
            student_id=sub.student_id,
            student_name=student_name,
            roll_number=roll_number,
            file_url=sub.file_url,
            submitted_at=sub.submitted_at,
            grade=sub.grade,
            feedback=sub.feedback,
            status=sub.status,
        ))
    return result


@router.put("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade_submission(
    submission_id: str,
    data: SubmissionGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Grade a submission (teacher only, must own the assignment)."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    submission.grade = data.grade
    submission.feedback = data.feedback
    submission.status = "graded"
    db.commit()
    db.refresh(submission)
    return submission
