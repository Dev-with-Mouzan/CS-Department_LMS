import json
from typing import List

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, Result, Course
from app.schemas.result import ResultOut
from app.services.file_service import save_file, delete_file
from app.routers.courses import student_has_access, get_student_courses
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/results", tags=["Results"])

VALID_EXAM_TYPES = {"midterm", "final", "complete"}


def _result_out(r: Result, courses: dict, users: dict) -> dict:
    course = courses.get(r.course_id)
    uploader = users.get(r.uploaded_by)
    extra_files = []
    if r.extra_files_json:
        try:
            extra_files = json.loads(r.extra_files_json)
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "id": r.id,
        "title": r.title,
        "exam_type": r.exam_type,
        "file_url": r.file_url,
        "file_name": r.file_name,
        "worst_paper_url": r.worst_paper_url,
        "worst_paper_name": r.worst_paper_name,
        "best_paper_url": r.best_paper_url,
        "best_paper_name": r.best_paper_name,
        "extra_files": extra_files if extra_files else None,
        "course_id": r.course_id,
        "course_name": course.title if course else None,
        "uploaded_by": r.uploaded_by,
        "uploader_name": f"{uploader.first_name} {uploader.last_name}" if uploader else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@limiter.limit("30/minute")
@router.get("/", response_model=List[ResultOut])
def list_results(request: Request,
    course_id: str = None,
    exam_type: str = None,
    active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List result entries based on role.
    - Teacher: results for their courses
    - Student: results for enrolled courses
    - Admin: all results
    active=true returns only active course results, active=false returns inactive.
    """
    role = current_user.role.name
    query = db.query(Result)

    if role == "teacher":
        from app.routers.courses import get_teacher_course_ids
        teacher_course_ids = get_teacher_course_ids(db, current_user.id)
        if not teacher_course_ids:
            return []
        query = query.filter(Result.course_id.in_(teacher_course_ids))
    elif role == "student":
        student_course_ids = [c.id for c in get_student_courses(db, current_user)]
        query = query.filter(Result.course_id.in_(student_course_ids))

    if course_id:
        query = query.filter(Result.course_id == course_id)
    if exam_type:
        query = query.filter(Result.exam_type == exam_type)

    if active is not None:
        subq = db.query(Course.id).filter(Course.is_active == active).subquery()
        query = query.filter(Result.course_id.in_(subq))

    results = query.order_by(Result.created_at.desc()).all()
    course_ids = list({r.course_id for r in results})
    uploader_ids = list({r.uploaded_by for r in results})
    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(uploader_ids)).all()} if uploader_ids else {}
    return [_result_out(r, courses, users) for r in results]


@limiter.limit("30/minute")
@router.post("/", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
def create_result(request: Request,
    title: str = Form(...),
    exam_type: str = Form(...),
    course_id: str = Form(...),
    full_sheet: UploadFile = File(...),
    best_paper: UploadFile = File(...),
    worst_paper: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Add a result entry with full sheet, best paper, and worst paper."""
    if exam_type not in VALID_EXAM_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid exam type '{exam_type}'. Must be one of: {', '.join(sorted(VALID_EXAM_TYPES))}",
        )

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add results for your courses")

    full_sheet_url = save_file(full_sheet, subdirectory="results")
    best_paper_url = save_file(best_paper, subdirectory="results")
    worst_paper_url = save_file(worst_paper, subdirectory="results")

    result = Result(
        title=title,
        exam_type=exam_type,
        file_url=full_sheet_url,
        file_name=full_sheet.filename,
        best_paper_url=best_paper_url,
        best_paper_name=best_paper.filename,
        worst_paper_url=worst_paper_url,
        worst_paper_name=worst_paper.filename,
        course_id=course_id,
        uploaded_by=current_user.id,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    course = db.query(Course).filter(Course.id == result.course_id).first()
    uploader = db.query(User).filter(User.id == result.uploaded_by).first() if result.uploaded_by else None
    courses = {course.id: course} if course else {}
    users = {uploader.id: uploader} if uploader else {}
    return _result_out(result, courses, users)


@limiter.limit("30/minute")
@router.delete("/{result_id}")
def delete_result(request: Request,
    result_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Delete a result entry (teacher only, must own the course)."""
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    course = db.query(Course).filter(Course.id == result.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete all associated files
    for url in [result.file_url, result.best_paper_url, result.worst_paper_url]:
        if url:
            delete_file(url)

    db.delete(result)
    db.commit()
    return {"message": "Result deleted successfully"}
