import smtplib
from email.message import EmailMessage

from app.config import settings


def _send_email(to_email: str, subject: str, body: str) -> None:
    """Send an email via SMTP, or print it to the console in dev mode."""
    if settings.EMAIL_PROVIDER == "smtp":
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.set_content(body)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
    else:
        # Console/test provider — print the email to the server terminal so it
        # can be read during development.
        line = "=" * 58
        print(line)
        print(" TEST MODE - EMAIL DISABLED (EMAIL_PROVIDER=console)")
        print(f" To:      {to_email}")
        print(f" Subject: {subject}")
        print(" Body:")
        print(body)
        print(line)


def send_credentials_email(to_email: str, name: str, password: str) -> None:
    """Send teacher credentials via email (SMTP provider, or console in dev)."""
    body = (
        f"Hi {name},\n\n"
        "Your teacher account has been created for the CS Department LMS "
        "(Govt. Graduate College Burewala).\n\n"
        f"Email:    {to_email}\n"
        f"Password: {password}\n\n"
        "You can sign in at the login page using these credentials.\n\n"
        "Regards,\nCS Department LMS"
    )
    _send_email(to_email, "Your CS Department LMS teacher account", body)


def send_otp_email(to_email: str, otp_code: str, purpose: str = "registration") -> None:
    """Send an OTP code to the given email address."""
    if purpose == "password_reset":
        subject = "Reset your CS Department LMS password"
        intro = "Use this code to reset your password:"
    else:
        subject = "Verify your CS Department LMS account"
        intro = "Use this code to verify your account:"

    body = (
        f"{intro}\n\n"
        f"    {otp_code}\n\n"
        f"The code is valid for {settings.OTP_EXPIRE_MINUTES} minutes. "
        "If you didn't request this, you can safely ignore this email.\n\n"
        "Regards,\nCS Department LMS"
    )
    _send_email(to_email, subject, body)
