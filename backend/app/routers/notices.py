from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_admin, require_teacher
from app.models import User, Notice, Course, Enrollment, StudentProfile
from app.schemas.notice import NoticeOut
from app.services.file_service import save_file

router = APIRouter(prefix="/api/notices", tags=["Notices"])


def _notice_out(notice: Notice, db: Session) -> dict:
    """Build notice response with author name."""
    author = db.query(User).filter(User.id == notice.posted_by).first()
    author_role = author.role.name if author else None
    return {
        "id": notice.id,
        "title": notice.title,
        "content": notice.content,
        "category": notice.category,
        "file_url": notice.file_url,
        "posted_by": notice.posted_by,
        "author_name": f"{author.first_name} {author.last_name}" if author else None,
        "author_role": author_role,
        "target_semester": notice.target_semester,
        "is_pinned": notice.is_pinned,
        "expires_at": notice.expires_at,
        "created_at": notice.created_at,
        "updated_at": notice.updated_at,
    }


@router.get("/", response_model=List[NoticeOut])
def list_notices(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notices filtered by role:
    - Admin: sees all notices
    - Teacher: sees admin notices + their own notices
    - Student: sees admin notices (no semester filter) + teacher notices for their semester
    """
    role = current_user.role.name
    query = db.query(Notice)

    if role == "admin":
        # Admin sees everything
        pass
    elif role == "teacher":
        # Teacher sees admin notices + their own
        query = query.filter(
            (Notice.posted_by == current_user.id) |
            (Notice.posted_by.in_(
                db.query(User.id).filter(User.role.has(name="admin"))
            ))
        )
    else:
        # Student: get their semester
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        student_semester = profile.semester if profile else None

        # Admin notices (target_semester is null = all students)
        # + Teacher notices targeting this student's semester (or null = all)
        # + Teacher notices from teachers teaching courses in this semester
        teacher_course_semesters = db.query(Course.semester).filter(
            Course.teacher_id == Notice.posted_by,
            Course.semester.isnot(None),
        ).distinct().subquery()

        query = query.filter(
            # Admin posts with no specific semester target
            ((Notice.posted_by.in_(
                db.query(User.id).filter(User.role.has(name="admin"))
            )) & (Notice.target_semester.is_(None))) |
            # Admin posts targeting this student's semester
            ((Notice.posted_by.in_(
                db.query(User.id).filter(User.role.has(name="admin"))
            )) & (Notice.target_semester == student_semester)) |
            # Teacher posts targeting this student's semester
            ((Notice.posted_by.in_(
                db.query(User.id).filter(User.role.has(name="teacher"))
            )) & (Notice.target_semester == student_semester)) |
            # Teacher posts with no specific semester (visible to all)
            ((Notice.posted_by.in_(
                db.query(User.id).filter(User.role.has(name="teacher"))
            )) & (Notice.target_semester.is_(None)))
        )

    # Filter out expired notices
    now = datetime.utcnow()
    query = query.filter(
        (Notice.expires_at.is_(None)) | (Notice.expires_at > now)
    )

    notices = (
        query.order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_notice_out(n, db) for n in notices]


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single notice."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    return _notice_out(notice, db)


@router.post("/", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(
    title: str = Form(...),
    content: str = Form(None),
    category: str = Form("news"),
    target_semester: int = Form(None),
    is_pinned: bool = Form(False),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new notice. Admin and teachers can post.
    Teachers can only target semesters they teach in.
    """
    role = current_user.role.name

    if role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Only admins and teachers can post notices")

    # Teachers: validate target_semester matches courses they teach
    if role == "teacher" and target_semester is not None:
        teaches_semester = db.query(Course).filter(
            Course.teacher_id == current_user.id,
            Course.semester == target_semester,
        ).first()
        if not teaches_semester:
            raise HTTPException(
                status_code=403,
                detail=f"You don't teach any courses in semester {target_semester}"
            )

    file_path = None
    if file:
        file_path = save_file(file, subdirectory="notices")

    notice = Notice(
        title=title,
        content=content,
        category=category,
        file_url=file_path,
        posted_by=current_user.id,
        target_semester=target_semester,
        is_pinned=is_pinned,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return _notice_out(notice, db)


@router.put("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: str,
    title: str = Form(None),
    content: str = Form(None),
    category: str = Form(None),
    target_semester: int = Form(None),
    is_pinned: bool = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a notice. Admin can update any. Teachers can update their own."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    role = current_user.role.name
    if role == "teacher" and notice.posted_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own notices")

    if title is not None:
        notice.title = title
    if content is not None:
        notice.content = content
    if category is not None:
        notice.category = category
    if target_semester is not None:
        notice.target_semester = target_semester
    if is_pinned is not None:
        notice.is_pinned = is_pinned
    if file:
        notice.file_url = save_file(file, subdirectory="notices")

    db.commit()
    db.refresh(notice)
    return _notice_out(notice, db)


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notice. Admin can delete any. Teachers can delete their own."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    role = current_user.role.name
    if role == "teacher" and notice.posted_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own notices")

    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted successfully"}
