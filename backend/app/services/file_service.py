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
    allowed = [a.strip().lower() for a in settings.ALLOWED_FILE_EXTENSIONS.split(",") if a.strip()]
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if allowed and "*" not in allowed and ext not in allowed:
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

    # Write file
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Validate actual file size
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    return file_path


def delete_file(file_path: str) -> bool:
    """Delete a file if it exists."""
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False
