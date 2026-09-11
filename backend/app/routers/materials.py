from typing import List
import os

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, StudyMaterial, Course
from app.schemas.material import StudyMaterialOut
from app.services.file_service import save_file, get_upload_dir
from app.routers.courses import get_student_courses
from app.dependencies.ratelimit import limiter

router = APIRouter(prefix="/api/materials", tags=["Study Materials"])

VALID_CATEGORIES = {"notes", "slides", "assignment", "reference", "other"}


def _material_out(m: StudyMaterial, courses: dict, users: dict) -> dict:
    course = courses.get(m.course_id)
    uploader = users.get(m.uploaded_by)
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "category": m.category,
        "file_url": m.file_url,
        "file_name": m.file_name,
        "course_id": m.course_id,
        "course_name": course.title if course else None,
        "uploaded_by": m.uploaded_by,
        "uploader_name": f"{uploader.first_name} {uploader.last_name}" if uploader else None,
        "created_at": m.created_at,
    }


@limiter.limit("30/minute")
@router.get("/", response_model=List[StudyMaterialOut])
def list_materials(request: Request, 
    course_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List materials based on role.
    - Teacher: materials for their courses
    - Student: materials for enrolled courses
    - Admin: all materials
    """
    role = current_user.role.name
    query = db.query(StudyMaterial)

    if role == "teacher":
        from app.routers.courses import get_teacher_course_ids
        teacher_course_ids = get_teacher_course_ids(db, current_user.id)
        if not teacher_course_ids:
            return []
        query = query.filter(StudyMaterial.course_id.in_(teacher_course_ids))
    elif role == "student":
        student_course_ids = [c.id for c in get_student_courses(db, current_user)]
        query = query.filter(StudyMaterial.course_id.in_(student_course_ids))

    if course_id:
        query = query.filter(StudyMaterial.course_id == course_id)

    materials = query.order_by(StudyMaterial.created_at.desc()).all()
    course_ids = list({m.course_id for m in materials})
    uploader_ids = list({m.uploaded_by for m in materials})
    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()} if course_ids else {}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(uploader_ids)).all()} if uploader_ids else {}
    return [_material_out(m, courses, users) for m in materials]


@limiter.limit("30/minute")
@router.post("/", response_model=StudyMaterialOut, status_code=status.HTTP_201_CREATED)
def upload_material(request: Request, 
    title: str = Form(...),
    description: str = Form(None),
    category: str = Form("notes"),
    course_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Upload study material for a course (teacher only, must own the course)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only upload materials for your courses")
    if not course.is_active:
        raise HTTPException(status_code=400, detail="Cannot add materials to an archived course")

    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid category '{category}'. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )

    file_path = save_file(file, subdirectory="materials")

    material = StudyMaterial(
        title=title,
        description=description,
        category=category,
        file_url=file_path,
        file_name=file.filename,
        course_id=course_id,
        uploaded_by=current_user.id,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    course = db.query(Course).filter(Course.id == material.course_id).first()
    uploader = db.query(User).filter(User.id == material.uploaded_by).first() if material.uploaded_by else None
    courses = {course.id: course} if course else {}
    users = {uploader.id: uploader} if uploader else {}
    return _material_out(material, courses, users)


@limiter.limit("30/minute")
@router.delete("/{material_id}")
def delete_material(request: Request, 
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Delete study material (teacher only, must own the course)."""
    material = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    course = db.query(Course).filter(Course.id == material.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete physical file if it exists
    if material.file_url:
        file_path = os.path.join(get_upload_dir(), material.file_url.replace("uploads/", ""))
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(material)
    db.commit()
    return {"message": "Material deleted successfully"}
