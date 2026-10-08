from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..database import get_db
from ..security import get_current_user, require_admin, hash_password
from ..schemas.user import UserCreate, UserUpdate, PasswordUpdate, UserOut


router = APIRouter(prefix="/users", tags=["users"])


# ============================================================
# HELPER: Convert MongoDB user document to API response
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
# Mobile number is COMPULSORY.
# Mobile number must also be UNIQUE.
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

    email = body.email.lower().strip()
    emp_id = body.empId.strip()

    mobile = getattr(body, "mobile", None)

    # --------------------------------------------------------
    # Mobile number is compulsory
    # --------------------------------------------------------

    if mobile is None or not str(mobile).strip():
        raise HTTPException(
            status_code=400,
            detail="Mobile number is required",
        )

    mobile = str(mobile).strip()

    # --------------------------------------------------------
    # Basic mobile validation
    # --------------------------------------------------------

    if not mobile.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Mobile number must contain only digits",
        )

    if len(mobile) != 10:
        raise HTTPException(
            status_code=400,
            detail="Mobile number must be exactly 10 digits",
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
    # Check duplicate mobile
    # --------------------------------------------------------

    existing_mobile = await db.users.find_one(
        {"mobile": mobile}
    )

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="This mobile number is already in use",
        )

    # --------------------------------------------------------
    # Create MongoDB document
    #
    # We explicitly add mobile here so it can NEVER become
    # null accidentally.
    # --------------------------------------------------------

    data = body.model_dump(
        exclude={"password", "mobile"}
    )

    doc = {
        **data,
        "empId": emp_id,
        "email": email,
        "mobile": mobile,
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

        # MongoDB unique mobile index
        if "mobile" in error:
            raise HTTPException(
                status_code=409,
                detail="This mobile number is already in use",
            )

        # MongoDB unique email index
        if "email" in error:
            raise HTTPException(
                status_code=409,
                detail="This email is already in use",
            )

        # MongoDB unique employee ID index
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
# User can edit their own profile.
#
# User can change:
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
    # Create update object
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

            if "mobile" in error:
                raise HTTPException(
                    status_code=409,
                    detail="This mobile number is already in use",
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