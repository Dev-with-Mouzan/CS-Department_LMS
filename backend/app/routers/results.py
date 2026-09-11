import os
import json
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
        "entry_type": r.entry_type,
        "content": r.content,
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
@router.get("/{result_id}/view")
def view_result_file(result_id: str, request: Request, kind: str = "full_sheet", token: str = None):
    """Serve a result file by kind (full_sheet, best, worst)."""
    from app.dependencies.auth import decode_token
    from app.database.database import SessionLocal

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]
    elif token:
        raw_token = token
    else:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(raw_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = db.query(Result).filter(Result.id == result_id).first()
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")

        kind_map = {
            "full_sheet": (result.file_url, result.file_name),
            "best": (result.best_paper_url, result.best_paper_name),
            "worst": (result.worst_paper_url, result.worst_paper_name),
        }

        # Fallback to files_json for old results
        if kind not in kind_map or not kind_map[kind][0]:
            extra_files = []
            if result.extra_files_json:
                try:
                    extra_files = json.loads(result.extra_files_json)
                except (json.JSONDecodeError, TypeError):
                    pass
            if extra_files:
                idx = {"full_sheet": 0, "best": 1, "worst": 2}.get(kind, 0)
                if idx < len(extra_files):
                    kind_map[kind] = (extra_files[idx].get("url"), extra_files[idx].get("name"))

        if kind not in kind_map:
            raise HTTPException(status_code=400, detail=f"Invalid kind '{kind}'. Must be full_sheet, best, or worst")

        file_url, file_name = kind_map[kind]
        if not file_url:
            raise HTTPException(status_code=404, detail="File not found")

        rel_path = file_url.replace("uploads/", "").replace("uploads\\", "")
        uploads_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
        path = os.path.join(uploads_dir, rel_path)

        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        return FileResponse(
            path,
            media_type=media_type,
            headers={"Content-Disposition": f'inline; filename="{file_name or os.path.basename(path)}"'},
        )
    finally:
        db.close()


@limiter.limit("30/minute")
@router.get("/{result_id}/file/{file_index}")
def serve_result_file(result_id: str, file_index: int, request: Request, token: str = None):
    """Serve a specific file from a result entry. 0=full_sheet, 1=best_paper, 2=worst_paper."""
    from app.dependencies.auth import decode_token
    from app.database.database import SessionLocal

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]
    elif token:
        raw_token = token
    else:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(raw_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = db.query(Result).filter(Result.id == result_id).first()
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")

        files = [
            {"url": result.file_url, "name": result.file_name},
            {"url": result.best_paper_url, "name": result.best_paper_name},
            {"url": result.worst_paper_url, "name": result.worst_paper_name},
        ]

        if file_index < 0 or file_index >= len(files):
            raise HTTPException(status_code=404, detail="File not found")

        file_url = files[file_index]["url"]
        if not file_url:
            raise HTTPException(status_code=404, detail="File not found")

        rel_path = file_url.replace("uploads/", "").replace("uploads\\", "")
        uploads_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
        path = os.path.join(uploads_dir, rel_path)

        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        return FileResponse(
            path,
            media_type=media_type,
            headers={"Content-Disposition": f'inline; filename="{files[file_index].get("name", os.path.basename(path))}"'},
        )
    finally:
        db.close()


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
        entry_type="file",
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
