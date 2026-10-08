import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings, INSECURE_DEFAULT_SECRETS
from .database import get_db, get_client, ensure_indexes, close_client
from .security import hash_password
from .routers import auth, users, pdi

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("pdi_car_vision")


async def _seed_admin():
    """Create one default admin on first run so you can log in immediately.
    Change this password (Manage Users > Set Password) before going live."""
    db = get_db()
    if await db.users.find_one({"empId": "EMP000"}):
        return
    await db.users.insert_one({
        "name": "Admin", "email": "admin@pdicarvision.com", "empId": "EMP000",
        "phone": "-", "branch": "Head Office", "role": "Admin", "status": "Active",
        "passwordHash": hash_password("ChangeMe123!"),
    })
    logger.warning("Seeded default admin admin@pdicarvision.com / ChangeMe123! — change this password immediately.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.jwt_secret in INSECURE_DEFAULT_SECRETS and not settings.allow_insecure_secret:
        raise RuntimeError(
            "JWT_SECRET is still the placeholder value. Set a long random string in your .env file "
            "before starting the server — this signs every login token. For local testing only, "
            "you can bypass this by setting ALLOW_INSECURE_SECRET=true, but never do that in production."
        )
    os.makedirs(settings.upload_dir, exist_ok=True)
    await ensure_indexes()
    await _seed_admin()
    logger.info("PDI Car Vision API started.")
    yield
    await close_client()


app = FastAPI(title="PDI Car Vision API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces or internal details to the client; log them instead.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


# Photo files are served straight from disk — only their URL is stored in MongoDB.
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(pdi.router, prefix="/api")


@app.get("/api/health")
async def health():
    # Actually verifies the database is reachable, not just that the process is up —
    # this is what your hosting platform's health check / uptime monitor should hit.
    try:
        await get_client().admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error("Health check: database unreachable: %s", e)
        return JSONResponse(status_code=503, content={"status": "error", "database": "unreachable"})
