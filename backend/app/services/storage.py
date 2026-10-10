"""Photo storage.

PHOTO_STORAGE=disk  (default on a normal server) — files on disk, served at /uploads/...
PHOTO_STORAGE=mongo (default on Vercel)          — photos stored in MongoDB, served at
                    /api/photos/<report>/<file>. Needed on serverless hosts like Vercel,
                    whose disk is read-only. Photos are compressed on the phone first
                    (~150-400 KB each), so the free 512 MB Atlas tier holds a few hundred reports.

Disk mode details: photos are written to disk under UPLOAD_DIR/<report_id>/<label>.<ext> and
served back as static files at /uploads/... — only that URL string is
stored in the MongoDB report document. This is what keeps each report
document to a few tens of KB even though the photos themselves can be
several MB each.

To move to S3 (or any other object store) later, this is the only file
that needs to change: keep the same save_photo(report_id, label, upload)
-> url signature and swap the implementation.
"""
import os
import re
import shutil
from datetime import datetime, timezone

from bson import Binary
from fastapi import UploadFile, HTTPException
from .. import config
from ..database import get_db

_CONTENT_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def storage_mode() -> str:
    mode = (config.settings.photo_storage or "auto").lower()
    if mode == "auto":
        return "mongo" if os.environ.get("VERCEL") else "disk"
    return mode

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}

# Magic-byte signatures, checked against the actual file content — not just
# its extension or declared Content-Type, both of which a client can lie
# about. This stops someone renaming an arbitrary file to .jpg and having it
# served back from /uploads as if it were a real image.
_MAGIC_BYTES = (
    (b"\xff\xd8\xff", "jpg"),            # JPEG
    (b"\x89PNG\r\n\x1a\n", "png"),       # PNG
    (b"RIFF", "webp"),                   # WEBP (RIFF....WEBP; checked loosely below)
)


def _looks_like_image(contents: bytes) -> bool:
    if contents[:3] == b"\xff\xd8\xff":
        return True
    if contents[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    if contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return True
    return False


def _safe_label(label: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", label.strip()) or "photo"


async def save_photo(report_id: str, label: str, upload: UploadFile) -> str:
    settings = config.settings
    ext = (upload.filename or "").rsplit(".", 1)[-1].lower() if "." in (upload.filename or "") else "jpg"
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: .{ext}")

    contents = await upload.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_photo_mb:
        raise HTTPException(status_code=400, detail=f"Photo is {size_mb:.1f}MB, limit is {settings.max_photo_mb}MB")
    if not _looks_like_image(contents):
        raise HTTPException(status_code=400, detail="That file doesn't look like a real image")

    filename = f"{_safe_label(label)}.{ext}"
    if storage_mode() == "mongo":
        await get_db().photos.replace_one(
            {"_id": f"{report_id}/{filename}"},
            {"_id": f"{report_id}/{filename}", "reportId": report_id, "data": Binary(contents),
             "contentType": _CONTENT_TYPES.get(ext, "image/jpeg"), "size": len(contents),
             "updatedAt": datetime.now(timezone.utc)},
            upsert=True,
        )
        return f"/api/photos/{report_id}/{filename}"

    folder = os.path.join(settings.upload_dir, report_id)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, "wb") as f:
        f.write(contents)

    return f"/uploads/{report_id}/{filename}"


async def load_photo(report_id: str, filename: str) -> dict | None:
    """Mongo mode: return {'data': bytes, 'contentType': str} or None."""
    return await get_db().photos.find_one({"_id": f"{report_id}/{filename}"})


async def delete_report_photos(report_id: str) -> None:
    """Remove every photo of a report (both storage modes)."""
    await get_db().photos.delete_many({"reportId": report_id})
    folder = os.path.join(config.settings.upload_dir, report_id)
    if storage_mode() == "disk" and os.path.isdir(folder):
        shutil.rmtree(folder, ignore_errors=True)