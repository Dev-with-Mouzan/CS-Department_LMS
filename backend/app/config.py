import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "CS Department LMS"
    DATABASE_URL: str = "sqlite:///./gcb_lms.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"  # MUST override via .env in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    ALLOWED_FILE_EXTENSIONS: str = "pdf,doc,docx,txt,zip,png,jpg,jpeg"
    # Default admin credentials (used on first startup to seed admin user)
    ADMIN_EMAIL: str = "admin@lms.com"
    ADMIN_PASSWORD: str = "admin123"
    # SMS provider: "fast2sms", "twilio", or "console" (dev only)
    SMS_PROVIDER: str = "console"
    FAST2SMS_API_KEY: str = ""
    FAST2SMS_SENDER_ID: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    class Config:
        env_file = "../.env"  # reads from project root .env


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
