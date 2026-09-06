import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database.database import engine, SessionLocal, Base
from app.dependencies.ratelimit import limiter
from app.services.auth_service import create_default_roles, create_default_admin
from app.routers import auth, users, courses, assignments, attendance, materials, results, reviews, quizzes
from app.models import Review

logger = logging.getLogger(__name__)

# Whitelist of tables and columns allowed for startup migration
_ALLOWLISTED_MIGRATIONS = {
    "users": [("phone", "VARCHAR(20)")],
    "courses": [("semester", "INTEGER")],
    "student_profiles": [("roll_number", "VARCHAR(50)")],
    "results": [
        ("worst_paper_url", "VARCHAR(500)"),
        ("worst_paper_name", "VARCHAR(255)"),
        ("best_paper_url", "VARCHAR(500)"),
        ("best_paper_name", "VARCHAR(255)"),
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        create_default_roles(db)
        create_default_admin(db)
        _add_missing_columns(db)
        # Auto-approve all reviews (no moderation needed for college LMS)
        db.query(Review).filter(Review.is_approved == False).update({"is_approved": True})
        db.commit()
    finally:
        db.close()
    yield


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

# CORS middleware — origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Serve uploaded files
uploads_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
