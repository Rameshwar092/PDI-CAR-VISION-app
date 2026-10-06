from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator

# Caps on free-text input. A measured, fully-filled real report is ~20KB —
# these limits are generous relative to that, but stop a buggy or malicious
# client from writing an oversized document (Mongo's hard limit is 16MB per
# document, and even well below that, huge documents slow every read).
_REMARK_MAX = 2000      # per-section remarks / inspector / customer remarks
_OTHER_MAX = 300        # "Other (Specify)" free text per checklist item
_VEHICLE_FIELD_MAX = 200
_SIGNATURE_MAX = 500_000  # ~375KB of base64; a typical signature PNG is 5-20KB


class PDISave(BaseModel):
    """What the frontend wizard sends on Save as Draft / Submit.

    `photos` arrives from the client as either already-uploaded URLs
    (strings starting with /uploads/) or, on first save, may be omitted —
    the client uploads each photo via POST /pdi/{id}/photos afterwards,
    which is what actually writes the photo URL into the document.
    """
    vehicle: dict[str, Any] = {}
    checks: dict[str, list[str]] = {}
    other: dict[str, str] = {}
    remarks: dict[str, str] = {}
    photos: dict[str, str] = {}
    result: str = "PASS"
    inspectorRemarks: str = Field(default="", max_length=_REMARK_MAX)
    customerRemarks: str = Field(default="", max_length=_REMARK_MAX)
    signature: str = Field(default="", max_length=_SIGNATURE_MAX)
    status: Literal["Draft", "Submitted"] = "Draft"

    @field_validator("other")
    @classmethod
    def _cap_other(cls, v: dict[str, str]) -> dict[str, str]:
        for key, text in v.items():
            if len(text) > _OTHER_MAX:
                raise ValueError(f"'{key}' is too long (max {_OTHER_MAX} characters)")
        return v

    @field_validator("remarks")
    @classmethod
    def _cap_remarks(cls, v: dict[str, str]) -> dict[str, str]:
        for key, text in v.items():
            if len(text) > _REMARK_MAX:
                raise ValueError(f"Remarks for '{key}' are too long (max {_REMARK_MAX} characters)")
        return v

    @field_validator("vehicle")
    @classmethod
    def _cap_vehicle(cls, v: dict[str, Any]) -> dict[str, Any]:
        for key, val in v.items():
            if isinstance(val, str) and len(val) > _VEHICLE_FIELD_MAX:
                raise ValueError(f"'{key}' is too long (max {_VEHICLE_FIELD_MAX} characters)")
        return v


class ReportOut(BaseModel):
    id: str
    vehicle: str
    vin: str
    user: str
    branch: str
    date: str
    status: str
    result: str
    data: dict[str, Any]


class ReportSummary(BaseModel):
    id: str
    vehicle: str
    vin: str
    user: str
    branch: str
    date: str
    status: str
    result: str


class PhotoUploadOut(BaseModel):
    label: str
    url: str
    report: ReportOut
