from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..database import get_db
from ..security import get_current_user, require_admin, hash_password
from ..schemas.user import UserCreate, UserUpdate, PasswordUpdate, UserOut


router = APIRouter(prefix="/users", tags=["users"])


# ============================================================
# HELPER
# Convert MongoDB user document to API response
# ============================================================

def _out(u: dict) -> UserOut:
    return UserOut(
        id=u["empId"],
        name=u["name"],
        email=u["email"],
        empId=u["empId"],
        phone=u.get("phone", "-"),
        branch=u.get("branch", "-"),
        role=u["role"],
        status=u["status"],
    )


# ============================================================
# GET CURRENT LOGGED-IN USER
# ============================================================

@router.get("/me", response_model=UserOut)
async def me(
    user: dict = Depends(get_current_user),
):
    return _out(user)


# ============================================================
# GET ALL USERS
# ADMIN ONLY
# ============================================================

@router.get("", response_model=list[UserOut])
async def list_users(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    _: dict = Depends(require_admin),
):
    db = get_db()

    cursor = (
        db.users
        .find()
        .sort("name", 1)
        .skip(skip)
        .limit(limit)
    )

    return [_out(u) async for u in cursor]


# ============================================================
# GET USER BY EMPLOYEE ID
# ADMIN ONLY
# ============================================================

@router.get("/{emp_id}", response_model=UserOut)
async def get_user(
    emp_id: str,
    _: dict = Depends(require_admin),
):
    db = get_db()

    u = await db.users.find_one(
        {"empId": emp_id}
    )

    if not u:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return _out(u)


# ============================================================
# CREATE NEW USER
# ADMIN ONLY
#
# Phone number is compulsory.
# Phone number must be exactly 10 digits.
# Phone number must be unique.
# ============================================================

@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_user(
    body: UserCreate,
    _: dict = Depends(require_admin),
):
    db = get_db()

    # --------------------------------------------------------
    # Clean input
    # --------------------------------------------------------

    name = body.name.strip()
    email = body.email.lower().strip()
    emp_id = body.empId.strip()
    phone = str(body.phone).strip()
    branch = body.branch.strip()

    # --------------------------------------------------------
    # Validate name
    # --------------------------------------------------------

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required",
        )

    # --------------------------------------------------------
    # Validate employee ID
    # --------------------------------------------------------

    if not emp_id:
        raise HTTPException(
            status_code=400,
            detail="Employee ID is required",
        )

    # --------------------------------------------------------
    # Validate phone
    # --------------------------------------------------------

    if not phone or phone == "-":
        raise HTTPException(
            status_code=400,
            detail="Phone number is required",
        )

    if not phone.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Phone number must contain only digits",
        )

    if len(phone) != 10:
        raise HTTPException(
            status_code=400,
            detail="Phone number must be exactly 10 digits",
        )

    # --------------------------------------------------------
    # Check duplicate email
    # --------------------------------------------------------

    existing_email = await db.users.find_one(
        {"email": email}
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists",
        )

    # --------------------------------------------------------
    # Check duplicate employee ID
    # --------------------------------------------------------

    existing_emp_id = await db.users.find_one(
        {"empId": emp_id}
    )

    if existing_emp_id:
        raise HTTPException(
            status_code=400,
            detail="This employee ID is already in use",
        )

    # --------------------------------------------------------
    # Check duplicate phone
    # --------------------------------------------------------

    existing_phone = await db.users.find_one(
        {"phone": phone}
    )

    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail="This phone number is already in use",
        )

    # --------------------------------------------------------
    # Create MongoDB document
    #
    # IMPORTANT:
    # We use "phone", NOT "mobile".
    # --------------------------------------------------------

    doc = {
        "name": name,
        "email": email,
        "empId": emp_id,
        "phone": phone,
        "branch": branch,
        "role": body.role,
        "passwordHash": hash_password(body.password),
        "status": "Active",
    }

    # --------------------------------------------------------
    # Insert into MongoDB
    # --------------------------------------------------------

    try:
        await db.users.insert_one(doc)

    except DuplicateKeyError as e:
        error = str(e)

        if "phone" in error:
            raise HTTPException(
                status_code=409,
                detail="This phone number is already in use",
            )

        if "email" in error:
            raise HTTPException(
                status_code=409,
                detail="This email is already in use",
            )

        if "empId" in error:
            raise HTTPException(
                status_code=409,
                detail="This employee ID is already in use",
            )

        raise HTTPException(
            status_code=409,
            detail="A user with these details already exists",
        )

    return _out(doc)


# ============================================================
# UPDATE USER PROFILE
#
# User can edit their own:
#   - name
#   - phone
#   - branch
#
# Admin can edit any user.
#
# Only admin can change:
#   - role
#   - status
# ============================================================

@router.patch(
    "/{emp_id}",
    response_model=UserOut,
)
async def update_user(
    emp_id: str,
    body: UserUpdate,
    user: dict = Depends(get_current_user),
):
    db = get_db()

    is_self = user["empId"] == emp_id
    is_admin = user.get("role") == "Admin"

    # --------------------------------------------------------
    # Permission check
    # --------------------------------------------------------

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed",
        )

    # --------------------------------------------------------
    # Build update object
    # --------------------------------------------------------

    patch = {
        key: value
        for key, value in body.model_dump(
            exclude_unset=True
        ).items()
        if value is not None
    }

    # --------------------------------------------------------
    # Only admin can change role/status
    # --------------------------------------------------------

    if not is_admin and (
        "role" in patch or
        "status" in patch
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can change role or status",
        )

    # --------------------------------------------------------
    # Validate phone if phone is being changed
    # --------------------------------------------------------

    if "phone" in patch:
        phone = str(patch["phone"]).strip()

        if not phone or phone == "-":
            raise HTTPException(
                status_code=400,
                detail="Phone number is required",
            )

        if not phone.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Phone number must contain only digits",
            )

        if len(phone) != 10:
            raise HTTPException(
                status_code=400,
                detail="Phone number must be exactly 10 digits",
            )

        # Check whether another user already has this phone
        existing_phone = await db.users.find_one(
            {
                "phone": phone,
                "empId": {"$ne": emp_id},
            }
        )

        if existing_phone:
            raise HTTPException(
                status_code=400,
                detail="This phone number is already in use",
            )

        patch["phone"] = phone

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    u = await db.users.find_one(
        {"empId": emp_id}
    )

    if not u:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Update user
    # --------------------------------------------------------

    if patch:
        try:
            u = await db.users.find_one_and_update(
                {"empId": emp_id},
                {"$set": patch},
                return_document=ReturnDocument.AFTER,
            )

        except DuplicateKeyError as e:
            error = str(e)

            if "phone" in error:
                raise HTTPException(
                    status_code=409,
                    detail="This phone number is already in use",
                )

            if "email" in error:
                raise HTTPException(
                    status_code=409,
                    detail="This email is already in use",
                )

            if "empId" in error:
                raise HTTPException(
                    status_code=409,
                    detail="This employee ID is already in use",
                )

            raise HTTPException(
                status_code=409,
                detail="This information is already in use",
            )

    return _out(u)


# ============================================================
# CHANGE USER PASSWORD
# ADMIN ONLY
#
# Admin can change password for any account,
# including their own account.
# ============================================================

@router.patch(
    "/{emp_id}/password",
    response_model=UserOut,
)
async def set_password(
    emp_id: str,
    body: PasswordUpdate,
    _: dict = Depends(require_admin),
):
    db = get_db()

    u = await db.users.find_one_and_update(
        {"empId": emp_id},
        {
            "$set": {
                "passwordHash": hash_password(
                    body.newPassword
                )
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if not u:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return _out(u)


# ============================================================
# DELETE USER
# ADMIN ONLY
# ============================================================

@router.delete(
    "/{emp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    emp_id: str,
    admin: dict = Depends(require_admin),
):
    # --------------------------------------------------------
    # Admin cannot delete their own account
    # --------------------------------------------------------

    if admin["empId"] == emp_id:
        raise HTTPException(
            status_code=400,
            detail="You can't delete your own account while logged in as it",
        )

    db = get_db()

    result = await db.users.delete_one(
        {"empId": emp_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return None