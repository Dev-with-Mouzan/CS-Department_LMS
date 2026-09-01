from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database.database import engine, SessionLocal, Base
from app.services.auth_service import create_default_roles
from app.routers import auth, users, courses, assignments, attendance

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


@app.on_event("startup")
def startup():
    """Initialize default roles and run schema migrations on first run."""
    db = SessionLocal()
    try:
        create_default_roles(db)
        # Add phone column if missing (safe for SQLite + Postgres)
        try:
            result = db.execute(text("PRAGMA table_info(users)"))
            dialect = engine.dialect.name
            if dialect == "sqlite":
                cols = [row[1] for row in result]
                if "phone" not in cols:
                    db.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                    db.commit()
            else:
                result = db.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'users' AND column_name = 'phone'"
                ))
                if not result.first():
                    db.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                    db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


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
