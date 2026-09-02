from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_teacher
from app.models import User, StudyMaterial, Course, Enrollment
from app.schemas.material import StudyMaterialOut
from app.services.file_service import save_file

router = APIRouter(prefix="/api/materials", tags=["Study Materials"])


def _material_out(m: StudyMaterial, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == m.course_id).first()
    uploader = db.query(User).filter(User.id == m.uploaded_by).first()
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


@router.get("/", response_model=List[StudyMaterialOut])
def list_materials(
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
        teacher_course_ids = db.query(Course.id).filter(Course.teacher_id == current_user.id).subquery()
        query = query.filter(StudyMaterial.course_id.in_(teacher_course_ids))
    elif role == "student":
        enrolled_course_ids = db.query(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == "active",
        ).subquery()
        query = query.filter(StudyMaterial.course_id.in_(enrolled_course_ids))

    if course_id:
        query = query.filter(StudyMaterial.course_id == course_id)

    materials = query.order_by(StudyMaterial.created_at.desc()).all()
    return [_material_out(m, db) for m in materials]


@router.post("/", response_model=StudyMaterialOut, status_code=status.HTTP_201_CREATED)
def upload_material(
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
    return _material_out(material, db)


@router.delete("/{material_id}")
def delete_material(
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

    db.delete(material)
    db.commit()
    return {"message": "Material deleted successfully"}
