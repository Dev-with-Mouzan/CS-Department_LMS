import httpx
from app.config import settings


def _send_otp_sms(phone: str, otp_code: str) -> None:
    """Send OTP code to the given phone number via the configured SMS provider."""
    provider = settings.SMS_PROVIDER

    if provider == "twilio":
        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        data = {"To": phone, "From": settings.TWILIO_FROM_NUMBER, "Body": f"Your verification code is {otp_code}"}
        try:
            with httpx.Client() as client:
                client.post(url, data=data, auth=auth, timeout=10)
        except Exception:
            print(f"[SMS] Failed to send OTP to {phone} via Twilio")

    elif provider == "fast2sms":
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": settings.FAST2SMS_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "authorization": settings.FAST2SMS_API_KEY,
            "variables_values": otp_code,
            "route": "otp",
            "sender_id": settings.FAST2SMS_SENDER_ID,
            "numbers": phone,
        }
        try:
            with httpx.Client() as client:
                client.post(url, data=data, headers=headers, timeout=10)
        except Exception:
            print(f"[SMS] Failed to send OTP to {phone} via Fast2SMS")

    else:
        # Console/test provider — print the OTP to the server terminal so it can
        # be used on the verification screen during development.
        line = "=" * 58
        print(line)
        print(" TEST MODE — SMS DISABLED (SMS_PROVIDER=console)")
        print(f" OTP for {phone}: {otp_code}")
        print(f" Valid for {settings.OTP_EXPIRE_MINUTES} minutes")
        print(" Enter this code on the verification screen")
        print(line)


def send_otp_sms(phone: str, otp_code: str) -> None:
    """Send OTP via SMS (synchronous)."""
    _send_otp_sms(phone, otp_code)

