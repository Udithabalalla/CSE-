from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    await _create_indexes()


async def close_db():
    if client:
        client.close()


async def _create_indexes():
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.market_data.create_index([("symbol", 1), ("date", 1)], unique=True)
    await db.index_data.create_index([("symbol", 1), ("date", 1)], unique=True)
    await db.macro_indicators.create_index([("indicator", 1), ("date", 1)], unique=True)
    await db.predictions.create_index([("symbol", 1), ("created_at", -1)])
    await db.analysis_results.create_index([("user_id", 1), ("created_at", -1)])


def get_db():
    return db
