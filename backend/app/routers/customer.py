"""Public customer access: a car buyer gets their own PDI report with an OTP.

Flow (used by the "Get your PDI report" page):
  1. POST /api/customer/otp/request   {mobile}        -> OTP sent by SMS
  2. POST /api/customer/otp/verify    {mobile, otp}   -> short-lived customer token
  3. GET  /api/customer/reports                        -> that customer's submitted reports
  4. GET  /api/customer/reports/{id}                   -> one full report

A customer token can ONLY read submitted reports whose customer mobile number
matches the verified number. It can't call any staff endpoint.
"""
import hashlib
import hmac
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from ..config import settings
from ..database import get_db
from ..schemas.pdi import ReportOut
from ..security import create_access_token
from ..services.phone import normalize_mobile, mask_mobile
from ..services.sms import send_otp_sms, SMSError

router = APIRouter(prefix="/customer", tags=["customer"])
logger = logging.getLogger("pdi_car_vision.customer")
_bearer = OAuth2PasswordBearer(tokenUrl="api/customer/otp/verify", auto_error=False)

GENERIC_SENT = "If a PDI report is linked to this mobile number, you will receive an OTP by SMS shortly."

# Per-IP limit on OTP requests (stops one visitor spraying many numbers).
_IP_MAX_PER_HOUR = 20
_ip_hits: dict[str, list[float]] = {}


def _check_ip(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = [t for t in _ip_hits.get(ip, []) if now - t < 3600]
    if len(hits) >= _IP_MAX_PER_HOUR:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please try again later.")
    hits.append(now)
    _ip_hits[ip] = hits


def _hash(mobile: str, otp: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{mobile}:{otp}".encode(), hashlib.sha256).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    # Mongo returns naive UTC datetimes
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _valid_mobile(raw: str) -> str:
    m = normalize_mobile(raw)
    if not m:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter a valid 10-digit mobile number")
    return m


class OtpRequest(BaseModel):
    mobile: str = Field(max_length=20)


class OtpVerify(BaseModel):
    mobile: str = Field(max_length=20)
    otp: str = Field(min_length=4, max_length=8)


@router.post("/otp/request")
async def request_otp(body: OtpRequest, request: Request):
    _check_ip(request)
    mobile = _valid_mobile(body.mobile)
    db, now = get_db(), _utcnow()

    rec = await db.otps.find_one({"_id": mobile}) or {}
    sent = [_aware(t) for t in rec.get("sentLog", []) if _aware(t) > now - timedelta(hours=1)]
    if sent:
        wait = settings.otp_resend_seconds - int((now - max(sent)).total_seconds())
        if wait > 0:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Please wait {wait} seconds before requesting a new OTP.")
    if len(sent) >= settings.otp_max_per_hour:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many OTP requests for this number. Try again in an hour.")

    resp = {"message": GENERIC_SENT, "mobile": mask_mobile(mobile),
            "resendIn": settings.otp_resend_seconds, "expiresIn": settings.otp_expire_minutes * 60}

    has_report = await db.reports.find_one({"customerMobile": mobile, "status": "Submitted"}, {"_id": 1})
    sent.append(now)
    if not has_report:
        # Same answer either way, so this page can't be used to find out which
        # numbers belong to your customers. No SMS is sent (saves SMS credits).
        await db.otps.update_one({"_id": mobile}, {"$set": {"sentLog": sent, "purgeAt": now + timedelta(hours=1)},
                                                    "$unset": {"hash": ""}}, upsert=True)
        return resp

    otp = f"{secrets.randbelow(10**6):06d}"
    await db.otps.update_one({"_id": mobile}, {"$set": {
        "hash": _hash(mobile, otp), "expiresAt": now + timedelta(minutes=settings.otp_expire_minutes),
        "attempts": 0, "sentLog": sent, "purgeAt": now + timedelta(hours=1)}}, upsert=True)
    try:
        await send_otp_sms(mobile, otp)
    except SMSError as e:
        logger.error("OTP SMS failed for %s: %s", mask_mobile(mobile), e)
        await db.otps.update_one({"_id": mobile}, {"$unset": {"hash": ""}})
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "We couldn't send the OTP right now. Please try again in a minute.")
    return resp


@router.post("/otp/verify")
async def verify_otp(body: OtpVerify):
    mobile = _valid_mobile(body.mobile)
    db, now = get_db(), _utcnow()
    rec = await db.otps.find_one({"_id": mobile})
    if not rec or not rec.get("hash") or _aware(rec["expiresAt"]) < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired or not requested. Please request a new OTP.")
    if rec.get("attempts", 0) >= settings.otp_max_attempts:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many wrong attempts. Please request a new OTP.")

    if not hmac.compare_digest(rec["hash"], _hash(mobile, body.otp.strip())):
        rec2 = await db.otps.find_one_and_update({"_id": mobile}, {"$inc": {"attempts": 1}}, return_document=True)
        left = max(settings.otp_max_attempts - rec2.get("attempts", 0), 0)
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"Incorrect OTP. {left} attempt{'s' if left != 1 else ''} left." if left else
                            "Too many wrong attempts. Please request a new OTP.")

    await db.otps.update_one({"_id": mobile}, {"$unset": {"hash": "", "expiresAt": "", "attempts": ""}})
    token = create_access_token({"sub": f"customer:{mobile}", "typ": "customer", "mobile": mobile},
                                expires_minutes=settings.customer_token_minutes)
    return {"access_token": token, "token_type": "bearer", "mobile": mask_mobile(mobile),
            "expiresIn": settings.customer_token_minutes * 60}


async def get_current_customer(token: str = Depends(_bearer)) -> str:
    err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please verify your mobile number again.")
    if not token:
        raise err
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise err
    mobile = payload.get("mobile")
    if payload.get("typ") != "customer" or not normalize_mobile(mobile):
        raise err
    return mobile


@router.get("/reports")
async def my_reports(mobile: str = Depends(get_current_customer)):
    cursor = get_db().reports.find({"customerMobile": mobile, "status": "Submitted"}).sort("date", -1).limit(50)
    return [{"id": d["id"], "vehicle": d["vehicle"], "vin": d["vin"], "date": d["date"], "result": d["result"],
             "branch": d.get("branch", "-"),
             "customerName": d.get("data", {}).get("vehicle", {}).get("customerName", "")} async for d in cursor]


@router.get("/reports/{report_id}", response_model=ReportOut)
async def my_report(report_id: str, mobile: str = Depends(get_current_customer)):
    d = await get_db().reports.find_one({"id": report_id, "customerMobile": mobile, "status": "Submitted"})
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    return ReportOut(id=d["id"], vehicle=d["vehicle"], vin=d["vin"], user=d["user"], branch=d["branch"],
                     date=d["date"], status=d["status"], result=d["result"], data=d["data"])
