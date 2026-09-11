import os
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile, HTTPException

from app.config import settings


def get_upload_dir() -> str:
    """Ensure upload directory exists and return its path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    return settings.UPLOAD_DIR


def validate_file(file: UploadFile) -> None:
    """Validate file size and extension."""
    # Check file extension (skip when "*" = allow every format)
    raw = settings.ALLOWED_FILE_EXTENSIONS
    if raw == "*" or not raw.strip():
        allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".zip", ".jpg", ".jpeg", ".png"]
    else:
        allowed = [a.strip().lower() for a in raw.split(",") if a.strip()]
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    ext_with_dot = f".{ext}" if ext else ""
    if allowed and "*" not in allowed and ext_with_dot not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(allowed)}",
        )

    # Check file size (read content to verify)
    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )


def save_file(file: UploadFile, subdirectory: str = "assignments") -> str:
    """Save uploaded file and return the file path."""
    validate_file(file)

    upload_dir = get_upload_dir()
    target_dir = os.path.join(upload_dir, subdirectory)
    os.makedirs(target_dir, exist_ok=True)

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    unique_name = f"{uuid.uuid4().hex}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.{ext}"
    file_path = os.path.join(target_dir, unique_name)

    # Read content first, then validate actual size before writing to disk
    content = file.file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    # Write file only after size validation passes
    with open(file_path, "wb") as f:
        f.write(content)

    return f"{subdirectory}/{unique_name}"


def delete_file(file_path: str) -> bool:
    """Delete a file if it exists. Accepts relative path (quizzes/file.jpg)."""
    full_path = os.path.join("uploads", file_path) if not file_path.startswith("uploads") else file_path
    if os.path.exists(full_path):
        os.remove(full_path)
        return True
    return False
