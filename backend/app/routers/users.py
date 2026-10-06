from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument
from ..database import get_db
from ..security import get_current_user, require_admin, hash_password
from ..schemas.user import UserCreate, UserUpdate, PasswordUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


def _out(u: dict) -> UserOut:
    return UserOut(id=u["empId"], name=u["name"], email=u["email"], empId=u["empId"],
                    phone=u.get("phone", "-"), branch=u.get("branch", "-"), role=u["role"], status=u["status"])


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return _out(user)


@router.get("", response_model=list[UserOut])
async def list_users(skip: int = 0, limit: int = Query(default=100, le=500), _: dict = Depends(require_admin)):
    db = get_db()
    cursor = db.users.find().sort("name", 1).skip(skip).limit(limit)
    return [_out(u) async for u in cursor]


@router.get("/{emp_id}", response_model=UserOut)
async def get_user(emp_id: str, _: dict = Depends(require_admin)):
    db = get_db()
    u = await db.users.find_one({"empId": emp_id})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _out(u)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def add_user(body: UserCreate, _: dict = Depends(require_admin)):
    db = get_db()
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    if await db.users.find_one({"empId": body.empId}):
        raise HTTPException(status_code=400, detail="This employee ID is already in use")

    doc = {**body.model_dump(exclude={"password"}), "email": body.email.lower(),
           "passwordHash": hash_password(body.password), "status": "Active"}
    await db.users.insert_one(doc)
    return _out(doc)


# A user may edit their own name/phone/branch (the "Edit Profile" screen).
# Changing someone else's profile, or changing role/status for anyone
# (including yourself), is admin-only. Password and account deletion have
# their own strictly admin-only endpoints below/above.
@router.patch("/{emp_id}", response_model=UserOut)
async def update_user(emp_id: str, body: UserUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    is_self, is_admin = user["empId"] == emp_id, user.get("role") == "Admin"
    if not is_self and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not is_admin and ("role" in patch or "status" in patch):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can change role or status")
    u = await db.users.find_one({"empId": emp_id})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if patch:
        u = await db.users.find_one_and_update({"empId": emp_id}, {"$set": patch}, return_document=ReturnDocument.AFTER)
    return _out(u)


# Admin-only, for ANY account including the admin's own — there is no
# separate self-service "change my password" endpoint by design.
@router.patch("/{emp_id}/password", response_model=UserOut)
async def set_password(emp_id: str, body: PasswordUpdate, _: dict = Depends(require_admin)):
    db = get_db()
    u = await db.users.find_one_and_update(
        {"empId": emp_id}, {"$set": {"passwordHash": hash_password(body.newPassword)}},
        return_document=ReturnDocument.AFTER,
    )
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _out(u)


@router.delete("/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(emp_id: str, admin: dict = Depends(require_admin)):
    if admin["empId"] == emp_id:
        raise HTTPException(status_code=400, detail="You can't delete your own account while logged in as it")
    db = get_db()
    result = await db.users.delete_one({"empId": emp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
