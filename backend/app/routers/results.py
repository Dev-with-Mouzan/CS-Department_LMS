import os
import mimetypes
from typing import List, Optional

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, Result, Course
from app.schemas.result import ResultOut
from app.services.file_service import save_file, delete_file
from app.routers.courses import student_has_access, get_student_courses
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/results", tags=["Results"])

VALID_EXAM_TYPES = {"midterm", "final", "complete"}
VALID_ENTRY_TYPES = {"file", "manual"}
_FILE_KINDS = {
    "result": ["file_url", "file_name"],
    "best": ["best_paper_url", "best_paper_name"],
    "worst": ["worst_paper_url", "worst_paper_name"],
}


def _result_out(r: Result, courses: dict, users: dict) -> dict:
    course = courses.get(r.course_id)
    uploader = users.get(r.uploaded_by)
    return {
        "id": r.id,
        "title": r.title,
        "exam_type": r.exam_type,
        "entry_type": r.entry_type,
        "content": r.content,
        "file_url": r.file_url,
        "file_name": r.file_name,
        "worst_paper_url": r.worst_paper_url,
        "worst_paper_name": r.worst_paper_name,
        "best_paper_url": r.best_paper_url,
        "best_paper_name": r.best_paper_name,
        "course_id": r.course_id,
        "course_name": course.title if course else None,
        "uploaded_by": r.uploaded_by,
        "uploader_name": f"{uploader.first_name} {uploader.last_name}" if uploader else None,
        "created_at": r.created_at,
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
@router.get("/{result_id}/view")
def view_result_file(request: Request, 
    result_id: str,
    kind: str = Query("result"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve a result file inline (view online, no download button).

    Teachers see files for their own courses, students for courses they are
    actively enrolled in, admins for everything.
    """
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    role = current_user.role.name
    if role == "teacher":
        course = db.query(Course).filter(Course.id == result.course_id).first()
        if not course or course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif role == "student":
        course = db.query(Course).filter(Course.id == result.course_id).first()
        if not course or not student_has_access(db, current_user, course):
            raise HTTPException(status_code=403, detail="Access denied")

    if kind not in _FILE_KINDS:
        raise HTTPException(status_code=422, detail="Invalid file kind")
    url_attr, _ = _FILE_KINDS[kind]
    path = getattr(result, url_attr)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return FileResponse(
        path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{os.path.basename(path)}"'},
    )


@limiter.limit("30/minute")
@router.post("/", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
def create_result(request: Request, 
    title: str = Form(...),
    exam_type: str = Form(...),
    course_id: str = Form(...),
    file: Optional[UploadFile] = File(None),  # complete result sheet
    worst_paper: Optional[UploadFile] = File(None),
    best_paper: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Add a result entry for a course (teacher only, must own the course).

    Three uploads are mandatory for every exam type (mid-term, final and
    complete result): the complete result sheet, the best paper and the
    worst paper.
    """
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

    if not file or not worst_paper or not best_paper:
        raise HTTPException(
            status_code=422,
            detail="Please upload the complete result, best paper and worst paper — all three are mandatory",
        )

    file_url = save_file(file, subdirectory="results")
    file_name = file.filename
    worst_paper_url = save_file(worst_paper, subdirectory="results")
    worst_paper_name = worst_paper.filename
    best_paper_url = save_file(best_paper, subdirectory="results")
    best_paper_name = best_paper.filename

    result = Result(
        title=title,
        exam_type=exam_type,
        entry_type="file",
        file_url=file_url,
        file_name=file_name,
        worst_paper_url=worst_paper_url,
        worst_paper_name=worst_paper_name,
        best_paper_url=best_paper_url,
        best_paper_name=best_paper_name,
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
    current_user: User = Depends(get_current_user),
):
    """Delete a result entry.

    - Teacher: own course only
    - Admin: any result
    """
    role = current_user.role.name
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if role == "teacher":
        course = db.query(Course).filter(Course.id == result.course_id).first()
        if not course or course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    for path in (result.file_url, result.worst_paper_url, result.best_paper_url):
        if path:
            delete_file(path)
    db.delete(result)
    db.commit()
    return {"message": "Result deleted successfully"}