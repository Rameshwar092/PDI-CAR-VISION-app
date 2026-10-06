"""Minimal in-memory login rate limiter.

Blocks repeated failed login attempts from the same (IP, email) pair.
This is intentionally simple — an in-process dict, not Redis — because it's
sized for a single backend instance. If you later scale to multiple backend
instances behind a load balancer, this won't be shared across them; move to
a Redis-backed limiter (or your hosting platform's edge rate limiting) at
that point.
"""
import time
from fastapi import HTTPException, status

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60  # 15 minutes

_attempts: dict[str, list[float]] = {}


def check_rate_limit(key: str):
    now = time.time()
    history = [t for t in _attempts.get(key, []) if now - t < WINDOW_SECONDS]
    _attempts[key] = history
    if len(history) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in a few minutes.",
        )


def record_failure(key: str):
    _attempts.setdefault(key, []).append(time.time())


def clear(key: str):
    _attempts.pop(key, None)
