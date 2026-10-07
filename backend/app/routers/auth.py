from fastapi import APIRouter, HTTPException, Request, status, Depends
from fastapi.security import OAuth2PasswordRequestForm

from ..database import get_db
from ..security import verify_password, create_access_token
from ..schemas.auth import LoginRequest, Token
from ..schemas.user import UserOut
from ..services.rate_limit import check_rate_limit, record_failure, clear

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, request: Request):
    rate_key = f"{request.client.host if request.client else 'unknown'}:{body.email.lower()}"
    check_rate_limit(rate_key)

    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})

    if not user or not verify_password(body.password, user["passwordHash"]):
        record_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.get("status") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated"
        )

    clear(rate_key)

    token = create_access_token({"sub": user["empId"]})

    return Token(
        access_token=token,
        user=UserOut(
            id=user["empId"],
            name=user["name"],
            email=user["email"],
            empId=user["empId"],
            phone=user.get("phone", "-"),
            branch=user.get("branch", "-"),
            role=user["role"],
            status=user["status"]
        ),
    )


# ADD THE NEW ENDPOINT HERE
@router.post("/token", response_model=Token)
async def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
):
    email = form_data.username.lower()

    rate_key = f"{request.client.host if request and request.client else 'unknown'}:{email}"
    check_rate_limit(rate_key)

    db = get_db()
    user = await db.users.find_one({"email": email})

    if not user or not verify_password(form_data.password, user["passwordHash"]):
        record_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.get("status") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    clear(rate_key)

    token_value = create_access_token({"sub": user["empId"]})

    return Token(
        access_token=token_value,
        user=UserOut(
            id=user["empId"],
            name=user["name"],
            email=user["email"],
            empId=user["empId"],
            phone=user.get("phone", "-"),
            branch=user.get("branch", "-"),
            role=user["role"],
            status=user["status"],
        ),
    )