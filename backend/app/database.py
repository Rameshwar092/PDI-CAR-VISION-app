from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongodb_uri)
    return client


def get_db():
    return get_client()[settings.mongodb_db]


async def ensure_indexes():
    db = get_db()
    # Fast, enforced-unique lookups. empId/vin indexes keep report/user queries
    # cheap even with thousands of PDI reports.
    await db.users.create_index("email", unique=True)
    await db.users.create_index("empId", unique=True)
    await db.reports.create_index("id", unique=True)
    await db.reports.create_index("vin")
    await db.reports.create_index("date")
    await db.reports.create_index("status")
    await db.reports.create_index([("customerMobile", 1), ("status", 1)])
    # OTP records delete themselves an hour after the last OTP was sent
    await db.otps.create_index("purgeAt", expireAfterSeconds=0)
    await db.photos.create_index("reportId")
    await _backfill_customer_mobile(db)


async def _backfill_customer_mobile(db):
    """One-time fill of customerMobile on reports saved before the OTP feature."""
    from .services.phone import normalize_mobile
    async for d in db.reports.find({"customerMobile": {"$exists": False}}, {"id": 1, "data.vehicle.customerMobile": 1}):
        mobile = normalize_mobile(d.get("data", {}).get("vehicle", {}).get("customerMobile"))
        await db.reports.update_one({"_id": d["_id"]}, {"$set": {"customerMobile": mobile}})


async def close_client():
    global client
    if client is not None:
        client.close()
        client = None