"""Verify Firebase Phone Auth ID tokens (from the pdicarvision.in website login).

No service-account file is needed: Firebase ID tokens are signed by Google, and
we check them against Google's public certificates, exactly as the official
Admin SDK does (https://firebase.google.com/docs/auth/admin/verify-id-tokens):

  alg RS256, kid in Google's certs, aud == project id,
  iss == https://securetoken.google.com/<project id>, exp/iat/auth_time valid, sub set.
"""
import re
import time

import httpx
from jose import jwt, JWTError

from ..config import settings

CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_cache: dict = {"certs": {}, "until": 0.0}


class FirebaseTokenError(Exception):
    pass


async def _google_certs() -> dict[str, str]:
    if _cache["certs"] and time.time() < _cache["until"]:
        return _cache["certs"]
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(CERTS_URL)
    r.raise_for_status()
    m = re.search(r"max-age=(\d+)", r.headers.get("cache-control", ""))
    _cache.update(certs=r.json(), until=time.time() + (int(m.group(1)) if m else 3600))
    return _cache["certs"]


async def verify_firebase_phone_token(id_token: str) -> str:
    """Return the verified phone number (e.g. '+919876543210') or raise FirebaseTokenError."""
    project = settings.firebase_project_id.strip()
    if not project:
        raise FirebaseTokenError("FIREBASE_PROJECT_ID is not set on the server")
    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as e:
        raise FirebaseTokenError("Malformed token") from e
    if header.get("alg") != "RS256":
        raise FirebaseTokenError("Wrong token algorithm")

    try:
        certs = await _google_certs()
    except httpx.HTTPError as e:
        raise FirebaseTokenError(f"Could not fetch Google certificates: {e}") from e
    cert = certs.get(header.get("kid", ""))
    if not cert:
        _cache["until"] = 0  # Google may have rotated keys; refetch next time
        raise FirebaseTokenError("Unknown signing key")

    try:
        claims = jwt.decode(id_token, cert, algorithms=["RS256"], audience=project,
                            issuer=f"https://securetoken.google.com/{project}",
                            options={"verify_at_hash": False, "leeway": 60})
    except JWTError as e:
        raise FirebaseTokenError(f"Invalid token: {e}") from e

    now = time.time()
    if not claims.get("sub") or claims.get("auth_time", now + 1) > now + 60:
        raise FirebaseTokenError("Invalid token subject or auth time")
    phone = claims.get("phone_number")
    if not phone:
        raise FirebaseTokenError("Token has no verified phone number")
    return phone
