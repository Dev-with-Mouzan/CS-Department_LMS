import os
import logging
from contextlib import asynccontextmanager

from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database.database import engine, SessionLocal, Base
from app.dependencies.auth import get_current_user
from app.dependencies.ratelimit import limiter
from app.models import User
from app.services.auth_service import create_default_roles, create_default_admin
from app.routers import auth, users, courses, assignments, attendance, materials, results, reviews, quizzes

logger = logging.getLogger(__name__)

# Whitelist of tables and columns allowed for startup migration
_ALLOWLISTED_MIGRATIONS = {
    "users": [("phone", "VARCHAR(20)")],
    "courses": [("semester", "INTEGER"), ("source_course_id", "VARCHAR(36)"), ("session", "VARCHAR(20)"), ("is_active", "BOOLEAN DEFAULT 1")],
    "student_profiles": [("roll_number", "VARCHAR(50)"), ("is_graduated", "BOOLEAN DEFAULT 0")],
    "quizzes": [("deadline", "DATETIME"), ("attachment_url", "VARCHAR(500)"), ("attachment_name", "VARCHAR(255)")],
    "quiz_questions": [("is_mandatory", "BOOLEAN DEFAULT 1")],
    "quiz_attempts": [("submission_url", "VARCHAR(500)"), ("submission_name", "VARCHAR(255)")],
    "results": [
        ("worst_paper_url", "VARCHAR(500)"),
        ("worst_paper_name", "VARCHAR(255)"),
        ("best_paper_url", "VARCHAR(500)"),
        ("best_paper_name", "VARCHAR(255)"),
        ("extra_files_json", "TEXT"),
    ],
}


def _get_column_names(db, table_name: str) -> set:
    """Return existing column names for a table, dialect-aware."""
    if table_name not in _ALLOWLISTED_MIGRATIONS:
        raise ValueError(f"Table '{table_name}' is not allowlisted")
    dialect = engine.dialect.name
    if dialect == "sqlite":
        rows = db.execute(
            text(f"PRAGMA table_info({table_name})")
        )
        return {row[1] for row in rows}
    rows = db.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :tbl"
        ).bindparams(tbl=table_name),
    )
    return {row[0] for row in rows}


def _add_missing_columns(db):
    """Add missing columns to existing tables using parameterized queries."""
    for table, cols in _ALLOWLISTED_MIGRATIONS.items():
        try:
            existing = _get_column_names(db, table)
        except Exception:
            logger.warning("Could not inspect columns for table '%s'; skipping.", table)
            continue
        for col_name, col_type in cols:
            if col_name not in existing:
                try:
                    db.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                    )
                    db.commit()
                    logger.info("Added column %s.%s", table, col_name)
                except Exception:
                    db.rollback()


def _backfill_student_sessions(db):
    """Compute and store session label for students missing it."""
    from app.models.models import StudentProfile
    profiles = db.query(StudentProfile).filter(
        StudentProfile.session.is_(None),
        StudentProfile.enrollment_year.isnot(None),
    ).all()
    for p in profiles:
        p.session = f"{p.enrollment_year % 100:02d}-{(p.enrollment_year + 4) % 100:02d}"
    if profiles:
        db.commit()
        logger.info("Backfilled session for %d student profiles", len(profiles))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY must be set in .env file. Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        raise RuntimeError("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        create_default_roles(db)
        create_default_admin(db)
        _add_missing_columns(db)
        _backfill_student_sessions(db)
    finally:
        db.close()

    yield


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        path = request.url.path
        if path.startswith("/api/courses/") and path.count("/") == 4:
            response.headers["Cache-Control"] = "private, max-age=60"
        elif path == "/api/reviews/public":
            response.headers["Cache-Control"] = "public, max-age=300"
        elif path.startswith("/api/files/"):
            response.headers["Cache-Control"] = "public, max-age=3600"
        else:
            response.headers["Cache-Control"] = "no-store"

        return response


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Role-Based Learning Management System — CS Department LMS",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware — origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(attendance.router)
app.include_router(materials.router)
app.include_router(results.router)
app.include_router(reviews.router)
app.include_router(quizzes.router)

# Ensure uploads directory exists (files served through authenticated API endpoints only)
uploads_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)


@app.get("/")
@limiter.limit("60/minute")
async def root(request: Request):
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
@limiter.limit("60/minute")
async def health(request: Request):
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/files/{subdirectory}/{filename}")
async def serve_file(subdirectory: str, filename: str,
    request: Request,
    token: str = None,
):
    """Serve uploaded files. Accepts Bearer token or ?token= query param."""
    from app.dependencies.auth import decode_token
    from app.database.database import SessionLocal

    # Extract token from Authorization header or query param
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
    finally:
        db.close()
    """Serve uploaded files with role-based access control."""
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+$', subdirectory) or not re.match(r'^[a-zA-Z0-9_.-]+$', filename):
        raise HTTPException(status_code=400, detail="Invalid path")
    
    # Sanitize to prevent path traversal
    subdirectory = subdirectory.replace("..", "").replace("/", "").replace("\\", "")
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    
    file_path = os.path.join("uploads", subdirectory, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    import mimetypes
    media_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    return FileResponse(file_path, media_type=media_type)
