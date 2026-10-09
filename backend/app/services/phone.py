"""Indian mobile number helpers."""
import re

_VALID = re.compile(r"^[6-9]\d{9}$")


def normalize_mobile(raw) -> str | None:
    """Return a 10-digit Indian mobile number, or None if it isn't one.

    Accepts '98765 43210', '+91-9876543210', '09876543210', '919876543210'.
    """
    if raw is None:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits if _VALID.match(digits) else None


def mask_mobile(mobile10: str) -> str:
    return f"{mobile10[:2]}XXXXXX{mobile10[-2:]}"
