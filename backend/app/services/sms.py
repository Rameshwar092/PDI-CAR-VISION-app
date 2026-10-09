"""Send OTP text messages.

Pick the provider with SMS_PROVIDER in .env:

  console   - (default, for testing only) the OTP is printed in the server log,
              no SMS is sent. Never use this in production.
  msg91     - MSG91 OTP API. Needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID
              (a DLT-approved OTP template created in the MSG91 panel).
  fast2sms  - Fast2SMS DLT route. Needs FAST2SMS_API_KEY, FAST2SMS_SENDER_ID and
              FAST2SMS_TEMPLATE_ID (DLT message ID whose only {#var#} is the OTP).
  twilio    - Twilio Messages API. Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
              and TWILIO_FROM (a Twilio number or Messaging Service SID).

In India, every business SMS must use a DLT-registered sender ID and template
(TRAI rule). MSG91 and Fast2SMS walk you through that registration.
"""
import logging

import httpx

from ..config import settings

logger = logging.getLogger("pdi_car_vision.sms")
_TIMEOUT = httpx.Timeout(10.0)


class SMSError(Exception):
    pass


def otp_message(otp: str) -> str:
    return (f"{otp} is your OTP to view your PDI report from {settings.brand_name}. "
            f"Valid for {settings.otp_expire_minutes} minutes. Do not share it with anyone.")


async def send_otp_sms(mobile10: str, otp: str) -> None:
    """mobile10 is a 10-digit Indian mobile number (no +91)."""
    provider = settings.sms_provider.lower().strip()
    try:
        if provider == "console":
            logger.warning("[SMS_PROVIDER=console] OTP for %s is %s (no SMS sent)", mobile10, otp)
            return
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            if provider == "msg91":
                await _msg91(client, mobile10, otp)
            elif provider == "fast2sms":
                await _fast2sms(client, mobile10, otp)
            elif provider == "twilio":
                await _twilio(client, mobile10, otp)
            else:
                raise SMSError(f"Unknown SMS_PROVIDER '{settings.sms_provider}'")
    except httpx.HTTPError as e:
        raise SMSError(f"{provider} request failed: {e}") from e


async def _msg91(client: httpx.AsyncClient, mobile10: str, otp: str):
    r = await client.post(
        "https://control.msg91.com/api/v5/otp",
        params={"template_id": settings.msg91_otp_template_id, "mobile": f"91{mobile10}",
                "otp": otp, "otp_expiry": settings.otp_expire_minutes},
        headers={"authkey": settings.msg91_auth_key, "accept": "application/json"},
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if r.status_code >= 400 or body.get("type") != "success":
        raise SMSError(f"MSG91 error {r.status_code}: {r.text[:300]}")


async def _fast2sms(client: httpx.AsyncClient, mobile10: str, otp: str):
    r = await client.get(
        "https://www.fast2sms.com/dev/bulkV2",
        params={"route": "dlt", "sender_id": settings.fast2sms_sender_id,
                "message": settings.fast2sms_template_id, "variables_values": otp,
                "numbers": mobile10, "flash": 0},
        headers={"authorization": settings.fast2sms_api_key},
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if r.status_code >= 400 or body.get("return") is not True:
        raise SMSError(f"Fast2SMS error {r.status_code}: {r.text[:300]}")


async def _twilio(client: httpx.AsyncClient, mobile10: str, otp: str):
    sid = settings.twilio_account_sid
    sender = settings.twilio_from
    data = {"To": f"+91{mobile10}", "Body": otp_message(otp)}
    data["MessagingServiceSid" if sender.startswith("MG") else "From"] = sender
    r = await client.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                          data=data, auth=(sid, settings.twilio_auth_token))
    if r.status_code >= 400:
        raise SMSError(f"Twilio error {r.status_code}: {r.text[:300]}")
