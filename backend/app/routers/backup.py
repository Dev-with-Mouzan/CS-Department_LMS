import os
import json
import re
import shutil
import sqlite3
import subprocess
import logging
from datetime import datetime, timedelta
from typing import List

from fastapi import Request,  APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database.database import get_db, engine, SessionLocal
from app.dependencies.auth import require_admin
from app.models import User, Role, Course, StudyMaterial, Assignment, Quiz, QuizQuestion, Result, AttendanceSession, AttendanceRecord, StudentProfile, TeacherProfile, Review
from app.dependencies.ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["Backup"])

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "backups")
AUTO_BACKUP_INTERVAL_DAYS = 7


class BackupInfo(BaseModel):
    id: str
    filename: str
    created_at: str
    size_bytes: int
    db_type: str
    tables: dict


def _get_table_counts(db: Session) -> dict:
    return {
        "users": db.query(User).count(),
        "roles": db.query(Role).count(),
        "courses": db.query(Course).count(),
        "study_materials": db.query(StudyMaterial).count(),
        "assignments": db.query(Assignment).count(),
        "quizzes": db.query(Quiz).count(),
        "quiz_questions": db.query(QuizQuestion).count(),
        "results": db.query(Result).count(),
        "attendance_sessions": db.query(AttendanceSession).count(),
        "attendance_records": db.query(AttendanceRecord).count(),
        "teacher_profiles": db.query(TeacherProfile).count(),
        "student_profiles": db.query(StudentProfile).count(),
        "reviews": db.query(Review).count(),
    }


def _get_last_backup_time() -> datetime | None:
    """Find the most recent backup creation time."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    latest = None
    for fname in os.listdir(BACKUP_DIR):
        if fname.endswith(".json"):
            meta_path = os.path.join(BACKUP_DIR, fname)
            try:
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                created = datetime.fromisoformat(meta["created_at"])
                if latest is None or created > latest:
                    latest = created
            except Exception:
                continue
    return latest


def _do_backup() -> bool:
    """Create a backup. Returns True on success."""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)

        db = SessionLocal()
        try:
            is_sqlite = settings.DATABASE_URL.startswith("sqlite")
            db_type = "sqlite" if is_sqlite else "postgresql"

            now = datetime.now()
            date_str = now.strftime("%d-%b-%Y").lstrip("0")
            time_str = now.strftime("%H%M%S")
            backup_id = f"backup-{date_str}-{time_str}"

            if is_sqlite:
                raw_url = str(engine.url)
                if raw_url.startswith("sqlite:///"):
                    raw_path = raw_url.replace("sqlite:///", "")
                else:
                    raw_path = raw_url.replace("sqlite://", "")

                if os.path.isabs(raw_path):
                    db_path = raw_path
                else:
                    cwd_path = os.path.abspath(raw_path)
                    if os.path.exists(cwd_path):
                        db_path = cwd_path
                    else:
                        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                        db_path = os.path.join(backend_dir, raw_path)

                if not os.path.exists(db_path):
                    logger.error(f"Auto-backup failed: database not found at {db_path}")
                    return False

                backup_filename = f"{backup_id}.db"
                backup_path = os.path.join(BACKUP_DIR, backup_filename)
                conn = sqlite3.connect(db_path)
                conn.execute(f"VACUUM INTO '{backup_path}'")
                conn.close()
            else:
                backup_filename = f"{backup_id}.sql"
                backup_path = os.path.join(BACKUP_DIR, backup_filename)
                _create_postgres_backup(db, backup_path)

            metadata = {
                "id": backup_id,
                "filename": backup_filename,
                "created_at": now.isoformat(),
                "size_bytes": os.path.getsize(backup_path),
                "db_type": db_type,
                "tables": _get_table_counts(db),
            }

            meta_path = os.path.join(BACKUP_DIR, f"{backup_id}.json")
            with open(meta_path, "w") as f:
                json.dump(metadata, f, indent=2)

            logger.info(f"Auto-backup created: {backup_filename}")
            return True
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Auto-backup failed: {e}")
        return False


def auto_backup_if_needed():
    """Check if last backup is older than 7 days, create if needed."""
    last = _get_last_backup_time()
    if last is None:
        logger.info("No backups found, creating initial backup...")
        _do_backup()
    elif datetime.now() - last > timedelta(days=AUTO_BACKUP_INTERVAL_DAYS):
        logger.info(f"Last backup was {(datetime.now() - last).days} days ago, creating new backup...")
        _do_backup()
    else:
        days_ago = (datetime.now() - last).days
        logger.info(f"Last backup was {days_ago} day(s) ago, no auto-backup needed.")


def _create_postgres_backup(db: Session, backup_path: str):
    db_url = settings.DATABASE_URL
    parts = db_url.replace("postgresql+psycopg2://", "").replace("postgresql://", "")
    auth_host = parts.split("@")
    if len(auth_host) == 2:
        user_pass = auth_host[0].split(":")
        host_db = auth_host[1].split("/")
        username = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        host_port = host_db[0].split(":")
        hostname = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        database = host_db[1] if len(host_db) > 1 else ""
    else:
        raise RuntimeError("Cannot parse DATABASE_URL for backup")

    env = os.environ.copy()
    env["PGPASSWORD"] = password
    cmd = [
        "pg_dump", "-h", hostname, "-p", port, "-U", username,
        "-d", database, "-f", backup_path, "--no-owner", "--no-acl"
    ]
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")


@limiter.limit("30/minute")
@router.post("/create", response_model=BackupInfo)
def create_backup(request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    os.makedirs(BACKUP_DIR, exist_ok=True)

    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    db_type = "sqlite" if is_sqlite else "postgresql"

    now = datetime.now()
    date_str = now.strftime("%d-%b-%Y").lstrip("0")
    time_str = now.strftime("%H%M%S")
    backup_id = f"backup-{date_str}-{time_str}"

    if is_sqlite:
        raw_url = str(engine.url)
        if raw_url.startswith("sqlite:///"):
            raw_path = raw_url.replace("sqlite:///", "")
        else:
            raw_path = raw_url.replace("sqlite://", "")

        if os.path.isabs(raw_path):
            db_path = raw_path
        else:
            cwd_path = os.path.abspath(raw_path)
            if os.path.exists(cwd_path):
                db_path = cwd_path
            else:
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                db_path = os.path.join(backend_dir, raw_path)

        if not os.path.exists(db_path):
            raise HTTPException(status_code=500, detail="Database file not found. Check server configuration.")

        backup_filename = f"{backup_id}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        conn = sqlite3.connect(db_path)
        conn.execute(f"VACUUM INTO '{backup_path}'")
        conn.close()
    else:
        backup_filename = f"{backup_id}.sql"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        _create_postgres_backup(db, backup_path)

    metadata = {
        "id": backup_id,
        "filename": backup_filename,
        "created_at": now.isoformat(),
        "size_bytes": os.path.getsize(backup_path),
        "db_type": db_type,
        "tables": _get_table_counts(db),
    }

    meta_path = os.path.join(BACKUP_DIR, f"{backup_id}.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return BackupInfo(**metadata)


@limiter.limit("30/minute")
@router.get("/list", response_model=List[BackupInfo])
def list_backups(request: Request, 
    current_user: User = Depends(require_admin),
):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    backups = []
    for fname in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if fname.endswith(".json"):
            meta_path = os.path.join(BACKUP_DIR, fname)
            with open(meta_path, "r") as f:
                meta = json.load(f)
            backups.append(BackupInfo(**meta))
    return backups


@limiter.limit("30/minute")
@router.get("/download/{backup_id}")
def download_backup(request: Request, 
    backup_id: str,
    current_user: User = Depends(require_admin),
):
    if not re.match(r'^[a-zA-Z0-9_-]+$', backup_id):
        raise HTTPException(status_code=400, detail="Invalid backup ID")
    meta_path = os.path.join(BACKUP_DIR, f"{backup_id}.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Backup not found")

    with open(meta_path, "r") as f:
        meta = json.load(f)

    backup_path = os.path.join(BACKUP_DIR, meta["filename"])
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file missing")

    return FileResponse(
        backup_path,
        media_type="application/octet-stream",
        filename=meta["filename"],
    )


@limiter.limit("30/minute")
@router.delete("/{backup_id}")
def delete_backup(request: Request, 
    backup_id: str,
    current_user: User = Depends(require_admin),
):
    if not re.match(r'^[a-zA-Z0-9_-]+$', backup_id):
        raise HTTPException(status_code=400, detail="Invalid backup ID")
    meta_path = os.path.join(BACKUP_DIR, f"{backup_id}.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Backup not found")

    with open(meta_path, "r") as f:
        meta = json.load(f)

    backup_path = os.path.join(BACKUP_DIR, meta["filename"])
    if os.path.exists(backup_path):
        os.remove(backup_path)
    os.remove(meta_path)

    return {"message": "Backup deleted"}


@limiter.limit("5/minute")
@router.post("/import")
async def import_backup(request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Import a .db (SQLite) or .sql (PostgreSQL) backup file to restore the database."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate file extension
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    if is_sqlite and not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail="Expected a .db file for SQLite database")
    if not is_sqlite and not file.filename.endswith(".sql"):
        raise HTTPException(status_code=400, detail="Expected a .sql file for PostgreSQL database")

    # Validate file size (100 MB max)
    content = await file.read()
    max_import_size = 100 * 1024 * 1024
    if len(content) > max_import_size:
        raise HTTPException(status_code=400, detail="Backup file exceeds 100 MB limit")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Validate file is not corrupted by checking magic bytes
    try:
        if is_sqlite:
            # SQLite files start with "SQLite format 3\000"
            if not content[:16] == b"SQLite format 3\x00":
                raise HTTPException(status_code=400, detail="File is not a valid SQLite database")
        else:
            # Basic check for SQL text file
            content[:1024].decode("utf-8", errors="strict")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Backup file appears to be corrupted")

    if is_sqlite:
        raw_url = str(engine.url)
        if raw_url.startswith("sqlite:///"):
            raw_path = raw_url.replace("sqlite:///", "")
        else:
            raw_path = raw_url.replace("sqlite://", "")

        if os.path.isabs(raw_path):
            db_path = raw_path
        else:
            cwd_path = os.path.abspath(raw_path)
            if os.path.exists(cwd_path):
                db_path = cwd_path
            else:
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                db_path = os.path.join(backend_dir, raw_path)

        db_dir = os.path.dirname(db_path)
        os.makedirs(db_dir, exist_ok=True)

        temp_path = db_path + ".importing"
        try:
            with open(temp_path, "wb") as f:
                f.write(content)
            shutil.move(temp_path, db_path)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(status_code=500, detail="Database restore failed. The backup file may be corrupted.")

        # Force SQLAlchemy to reconnect to the new database file
        db.close()
        db.expire_all()
        engine.dispose()
        return {"message": f"Database restored from {file.filename}", "size_bytes": len(content)}
    else:
        db_url = settings.DATABASE_URL
        parts = db_url.replace("postgresql+psycopg2://", "").replace("postgresql://", "")
        auth_host = parts.split("@")
        if len(auth_host) == 2:
            user_pass = auth_host[0].split(":")
            host_db = auth_host[1].split("/")
            username = user_pass[0]
            password = user_pass[1] if len(user_pass) > 1 else ""
            host_port = host_db[0].split(":")
            hostname = host_port[0]
            port = host_port[1] if len(host_port) > 1 else "5432"
            database = host_db[1] if len(host_db) > 1 else ""
        else:
            raise RuntimeError("Cannot parse DATABASE_URL for backup")

        temp_path = os.path.join(BACKUP_DIR, f"import-{datetime.now().strftime('%Y%m%d%H%M%S')}.sql")
        try:
            with open(temp_path, "wb") as f:
                f.write(content)

            env = os.environ.copy()
            env["PGPASSWORD"] = password
            cmd = ["psql", "-h", hostname, "-p", port, "-U", username, "-d", database, "-f", temp_path]
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                raise HTTPException(status_code=500, detail="Database restore failed. Check server logs for details.")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        return {"message": f"Database restored from {file.filename}", "size_bytes": len(content)}
