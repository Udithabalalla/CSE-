from datetime import datetime, timezone, date, timedelta
from typing import Optional
from pymongo import UpdateOne


async def get_news(
    symbol: Optional[str] = None,
    category: Optional[str] = None,
    days: int = 7,
    limit: int = 50,
) -> list[dict]:
    from app.database import get_db
    db = get_db()

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    query: dict = {"published_at": {"$gte": datetime.fromisoformat(cutoff + "T00:00:00+00:00")}}
    if symbol:
        query["symbol"] = symbol.upper()
    if category:
        query["category"] = category

    docs = await db.news.find(query, {"_id": 0, "scraped_at": 0}).sort(
        "published_at", -1
    ).limit(limit).to_list(limit)

    for d in docs:
        if isinstance(d.get("published_at"), datetime):
            d["published_at"] = d["published_at"].isoformat()

    return docs


async def refresh_news(days_back: int = 7) -> dict:
    """Fetch fresh announcements from CSE and upsert into DB."""
    from app.database import get_db
    from app.engines.news_scraper import fetch_announcements, fetch_market_news
    db = get_db()

    announcements = fetch_announcements(days_back)
    market_news   = fetch_market_news(days_back)
    all_items = announcements + market_news

    if not all_items:
        return {"inserted": 0, "updated": 0, "total": 0}

    ops = []
    for item in all_items:
        key = {
            "title":        item["title"],
            "published_at": item["published_at"],
            "type":         item["type"],
        }
        ops.append(UpdateOne(key, {"$setOnInsert": item}, upsert=True))

    result = await db.news.bulk_write(ops, ordered=False)
    return {
        "inserted": result.upserted_count,
        "updated":  result.modified_count,
        "total":    len(all_items),
    }


async def get_categories() -> list[str]:
    from app.database import get_db
    db = get_db()
    cats = await db.news.distinct("category")
    return sorted([c for c in cats if c])
