import asyncio
import httpx
from app.config import settings


async def _send_otp_sms(phone: str, otp_code: str) -> None:
    """Send OTP code to the given phone number via the configured SMS provider."""
    provider = settings.SMS_PROVIDER

    if provider == "twilio":
        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        data = {"To": phone, "From": settings.TWILIO_FROM_NUMBER, "Body": f"Your verification code is {otp_code}"}
        async with httpx.AsyncClient() as client:
            await client.post(url, data=data, auth=auth, timeout=10)

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
        async with httpx.AsyncClient() as client:
            await client.post(url, data=data, headers=headers, timeout=10)

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
    """Synchronous wrapper for sending OTP via SMS."""
    asyncio.run(_send_otp_sms(phone, otp_code))

