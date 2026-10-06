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


async def close_client():
    global client
    if client is not None:
        client.close()
        client = None
