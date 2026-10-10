from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pymongo import ReturnDocument
from ..database import get_db
from ..security import get_current_user, require_admin
from ..services.storage import save_photo, delete_report_photos
from ..schemas.pdi import PDISave, ReportOut, ReportSummary, PhotoUploadOut
from ..services.phone import normalize_mobile

router = APIRouter(prefix="/pdi", tags=["pdi"])


def _to_out(doc: dict) -> ReportOut:
    return ReportOut(id=doc["id"], vehicle=doc["vehicle"], vin=doc["vin"], user=doc["user"],
                      branch=doc["branch"], date=doc["date"], status=doc["status"],
                      result=doc["result"], data=doc["data"])


def _to_summary(doc: dict) -> ReportSummary:
    return ReportSummary(id=doc["id"], vehicle=doc["vehicle"], vin=doc["vin"], user=doc["user"],
                          branch=doc["branch"], date=doc["date"], status=doc["status"], result=doc["result"])


async def _next_id(db) -> str:
    # Simple incrementing PDI-#### id. A counters collection avoids racing
    # on "count documents" under concurrent saves.
    doc = await db.counters.find_one_and_update(
        {"_id": "pdi_report"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return f"PDI-{doc['seq']:04d}"


@router.get("", response_model=list[ReportSummary])
async def list_reports(mine: bool = False, skip: int = 0, limit: int = Query(default=50, le=200),
                        user: dict = Depends(get_current_user)):
    db = get_db()
    query = {}
    if mine or user.get("role") != "Admin":
        query["user"] = user["name"]
    cursor = db.reports.find(query).sort("date", -1).skip(skip).limit(limit)
    return [_to_summary(d) async for d in cursor]


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: str, _: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.reports.find_one({"id": report_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    return _to_out(doc)


@router.post("", response_model=ReportOut)
async def create_or_update_report(body: PDISave, report_id: str | None = None,
                                   user: dict = Depends(get_current_user)):
    db = get_db()
    v = body.vehicle or {}
    # Keep the base64 photo values the client may still be holding in memory
    # OUT of what gets written to Mongo — photos are only ever persisted via
    # the /photos upload endpoint below, which stores a file + a URL string.
    photos_for_db = {k: val for k, val in (body.photos or {}).items() if not val.startswith("data:")}

    existing = await db.reports.find_one({"id": report_id}) if report_id else None
    if existing:
        # Merge rather than overwrite: a resubmit whose payload doesn't carry
        # forward a URL uploaded moments ago must not delete that photo.
        merged_photos = {**existing.get("data", {}).get("photos", {}), **photos_for_db}
        photos_for_db = merged_photos

    doc = {
        "vehicle": f"{v.get('brand', '')} {v.get('model', '')}".strip() or "Unknown",
        "vin": v.get("vin", "-"),
        # Normalised 10-digit number, used by the customer OTP report page
        "customerMobile": normalize_mobile(v.get("customerMobile")),
        "user": user["name"],
        "branch": user.get("branch", "-"),
        "date": date.today().isoformat(),
        "status": body.status,
        "result": body.result if body.status == "Submitted" else "-",
        "data": {**body.model_dump(exclude={"status"}), "photos": photos_for_db},
        "updatedAt": datetime.utcnow(),
    }

    if report_id:
        if not existing:
            raise HTTPException(status_code=404, detail="Report not found")
        await db.reports.update_one({"id": report_id}, {"$set": doc})
        doc["id"] = report_id
    else:
        doc["id"] = await _next_id(db)
        doc["createdAt"] = datetime.utcnow()
        await db.reports.insert_one(doc)

    return _to_out(doc)


@router.post("/{report_id}/photos", response_model=PhotoUploadOut)
async def upload_photo(report_id: str, label: str = Form(...), file: UploadFile = File(...),
                        _: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.reports.find_one({"id": report_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Save the report before uploading photos")

    url = await save_photo(report_id, label, file)
    await db.reports.update_one({"id": report_id}, {"$set": {f"data.photos.{label}": url}})
    doc = await db.reports.find_one({"id": report_id})
    return PhotoUploadOut(label=label, url=url, report=_to_out(doc))


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str, admin: dict = Depends(require_admin)):
    """Admin only: permanently delete a report and all its photos."""
    db = get_db()
    result = await db.reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    await delete_report_photos(report_id)