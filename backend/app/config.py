import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "CS Department LMS"
    DATABASE_URL: str = "sqlite:///./gcb_lms.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    ALLOWED_FILE_EXTENSIONS: str = "pdf,doc,docx,txt,zip,png,jpg,jpeg"
    # SMS provider: "fast2sms", "twilio", or "console" (dev only)
    SMS_PROVIDER: str = "console"
    FAST2SMS_API_KEY: str = ""
    FAST2SMS_SENDER_ID: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
