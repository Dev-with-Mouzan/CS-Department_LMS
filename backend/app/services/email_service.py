import smtplib
from email.message import EmailMessage

from app.config import settings


def _send_credentials_email(to_email: str, name: str, phone: str | None, password: str) -> None:
    """Send teacher credentials via email (SMTP provider, or console in dev)."""
    subject = "Your CS Department LMS teacher account"

    body = (
        f"Hi {name},\n\n"
        "Your teacher account has been created for the CS Department LMS "
        "(Govt. Graduate College Burewala).\n\n"
        f"Email:    {to_email}\n"
        f"Password: {password}\n"
        f"Phone:    {phone or 'N/A'}\n\n"
        "You can sign in at the login page using these credentials.\n\n"
        "Regards,\nCS Department LMS"
    )

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
        # Console/test provider — print the credentials email to the server
        # terminal so it can be shared with the teacher during development.
        line = "=" * 58
        print(line)
        print(" TEST MODE - EMAIL DISABLED (EMAIL_PROVIDER=console)")
        print(f" To:      {to_email}")
        print(f" Subject: {subject}")
        print(" Body:")
        print(body)
        print(line)


def send_credentials_email(to_email: str, name: str, phone: str | None, password: str) -> None:
    """Synchronous wrapper for sending teacher credentials via email."""
    _send_credentials_email(to_email, name, phone, password)