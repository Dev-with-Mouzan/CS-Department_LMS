from datetime import datetime, timezone
from typing import Annotated

from pydantic import BeforeValidator, PlainSerializer


def ensure_utc(dt):
    """Treat naive datetimes as already-UTC and normalize any aware one to UTC.

    Passes non-datetime values through untouched so pydantic can coerce them.
    """
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    return dt


def serialize_utc(dt: datetime) -> str:
    """Serialize datetimes with an explicit Z suffix so JS parses them as UTC."""
    dt = ensure_utc(dt)
    return dt.isoformat().replace("+00:00", "Z")


UTCDateTime = Annotated[
    datetime,
    BeforeValidator(ensure_utc),
    PlainSerializer(serialize_utc, return_type=str, when_used="json-unless-none"),
]