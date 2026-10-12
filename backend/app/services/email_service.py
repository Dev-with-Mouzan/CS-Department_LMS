import smtplib
from datetime import datetime
from email.message import EmailMessage

from app.config import settings

# Publicly hosted frontend assets (Vercel) — absolute URLs required in emails
LOGO_URL = "https://cs-department-lms.vercel.app/college-logo.png"
SITE_URL = "https://cs-department-lms.vercel.app"


def _send_email(to_email: str, subject: str, body: str, html: str = None) -> None:
    """Send an email via SMTP (with optional HTML part), or print in dev mode."""
    if settings.EMAIL_PROVIDER == "smtp":
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.set_content(body)
        if html:
            msg.add_alternative(html, subtype="html")

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


def _html_template(heading: str, content_html: str) -> str:
    """Branded HTML email wrapper — college logo + navy/amber theme.

    Inline styles only (email clients strip <style>), table layout for
    Outlook compatibility.
    """
    year = datetime.now().year
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f6f8fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fb;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;border:1px solid #dbe3ec;">
          <tr>
            <td style="height:5px;background-color:#f59e0b;background:linear-gradient(90deg,#f59e0b,#fbbf24);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color:#0a1929;padding:18px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td><img src="{LOGO_URL}" width="36" height="36" alt="GGCB" style="display:block;border-radius:8px;" /></td>
                  <td style="padding-left:12px;">
                    <div style="color:#ffffff;font-size:16px;font-weight:bold;line-height:1.3;">CS Department LMS</div>
                    <div style="color:#829ab1;font-size:12px;line-height:1.3;">Govt. Graduate College Burewala</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 6px;">
              <h1 style="margin:0 0 14px;font-size:22px;color:#102a43;">{heading}</h1>
              {content_html}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 28px;">
              <p style="margin:0;font-size:13px;color:#829ab1;line-height:1.6;">
                Regards,<br />
                <strong style="color:#486581;">CS Department LMS</strong><br />
                Dept. of Computer Science &middot; Govt. Graduate College Burewala
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0a1929;padding:14px 28px;text-align:center;border-bottom-left-radius:16px;border-bottom-right-radius:16px;">
              <p style="margin:0;font-size:11px;color:#829ab1;">&copy; {year} Govt. Graduate College Burewala. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_credentials_email(to_email: str, name: str, password: str) -> None:
    """Send account credentials via email (SMTP provider, or console in dev)."""
    body = (
        f"Hi {name},\n\n"
        "Your account has been created for the CS Department LMS "
        "(Govt. Graduate College Burewala).\n\n"
        f"Email:    {to_email}\n"
        f"Password: {password}\n\n"
        "You can sign in at the login page using these credentials.\n\n"
        "Regards,\nCS Department LMS"
    )
    content = f"""
              <p style="margin:0 0 16px;font-size:15px;color:#486581;line-height:1.6;">
                Hi {name}, your account has been created on the CS Department LMS.
                Here are your sign-in credentials:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fb;border:1px solid #dbe3ec;border-radius:12px;margin:0 0 8px;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #dbe3ec;font-size:13px;color:#829ab1;">Email</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #dbe3ec;font-size:14px;color:#102a43;font-weight:bold;text-align:right;">{to_email}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#829ab1;">Password</td>
                  <td style="padding:14px 18px;font-size:15px;color:#102a43;font-weight:bold;text-align:right;font-family:'Courier New',monospace;">{password}</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
                <tr>
                  <td style="background-color:#f59e0b;border-radius:10px;">
                    <a href="{SITE_URL}/login" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:bold;color:#0a1929;text-decoration:none;">Sign in to LMS</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:13px;color:#829ab1;line-height:1.6;">
                For your security, do not share this email or password with anyone.
              </p>
    """
    _send_email(
        to_email,
        "Your CS Department LMS account credentials",
        body,
        html=_html_template("Your account is ready", content),
    )


def send_otp_email(to_email: str, otp_code: str, purpose: str = "registration") -> None:
    """Send an OTP code to the given email address."""
    if purpose == "password_reset":
        subject = "Reset your CS Department LMS password"
        intro = "Use this code to reset your password:"
        heading = "Reset your password"
    else:
        subject = "Verify your CS Department LMS account"
        intro = "Use this code to verify your account:"
        heading = "Verify your email address"

    minutes = settings.OTP_EXPIRE_MINUTES
    body = (
        f"{intro}\n\n"
        f"    {otp_code}\n\n"
        f"The code is valid for {minutes} minutes. "
        "If you didn't request this, you can safely ignore this email.\n\n"
        "Regards,\nCS Department LMS"
    )
    content = f"""
              <p style="margin:0 0 22px;font-size:15px;color:#486581;line-height:1.6;">
                {intro}
              </p>
              <div style="background-color:#fffbeb;border:2px dashed #f59e0b;border-radius:12px;padding:18px;text-align:center;margin:0 0 20px;">
                <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#102a43;">{otp_code}</span>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#829ab1;line-height:1.6;">
                This code is valid for <strong style="color:#486581;">{minutes} minutes</strong>.
                If you didn't request this, you can safely ignore this email.
              </p>
    """
    _send_email(to_email, subject, body, html=_html_template(heading, content))
