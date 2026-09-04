import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database.database import engine, SessionLocal, Base
from app.services.auth_service import create_default_roles, create_default_admin
from app.routers import auth, users, courses, assignments, attendance, notices, materials

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Role-Based Learning Management System — CS Department LMS",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
app.include_router(notices.router)
app.include_router(materials.router)

# Serve uploaded files
uploads_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.on_event("startup")
def startup():
    """Initialize default roles and run schema migrations on first run."""
    db = SessionLocal()
    try:
        create_default_roles(db)
        create_default_admin(db)
        _add_missing_columns(db)
    finally:
        db.close()


def _add_missing_columns(db):
    """Add missing columns to existing tables (safe for SQLite + Postgres)."""
    dialect = engine.dialect.name

    def _columns(table):
        if dialect == "sqlite":
            return [row[1] for row in db.execute(text(f"PRAGMA table_info({table})"))]
        rows = db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            f"WHERE table_name = '{table}'"
        ))
        return [row[0] for row in rows]

    migrations = {
        "users": [
            ("phone", "VARCHAR(20)"),
        ],
        "courses": [
            ("semester", "INTEGER"),
        ],
        "student_profiles": [
            ("roll_number", "VARCHAR(50)"),
        ],
        "notices": [
            ("target_semester", "INTEGER"),
            ("is_pinned", "INTEGER DEFAULT 0"),
            ("expires_at", "DATETIME"),
        ],
    }
    for table, cols in migrations.items():
        existing = set(_columns(table))
        for col, dtype in cols:
            if col not in existing:
                try:
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
                    db.commit()
                except Exception:
                    db.rollback()


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
