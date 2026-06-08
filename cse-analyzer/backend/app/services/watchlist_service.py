from datetime import datetime, timezone
from fastapi import HTTPException


async def get_watchlist(user_id: str) -> list[dict]:
    from app.database import get_db
    db = get_db()
    docs = await db.watchlist.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("added_at", -1).to_list(500)
    symbols = [d["symbol"] for d in docs]
    if not symbols:
        return []
    # Enrich with latest price data
    pipeline = [
        {"$match": {"symbol": {"$in": symbols}}},
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$symbol",
            "name":       {"$first": "$name"},
            "sector":     {"$first": "$sector"},
            "close":      {"$first": "$close"},
            "pct_change": {"$first": "$pct_change"},
            "volume":     {"$first": "$volume"},
            "market_cap": {"$first": "$market_cap"},
            "date":       {"$first": "$date"},
        }},
    ]
    rows = {r["_id"]: r async for r in db.market_data.aggregate(pipeline)}
    result = []
    for doc in docs:
        sym = doc["symbol"]
        row = rows.get(sym, {})
        result.append({
            "symbol":     sym,
            "added_at":   doc["added_at"].isoformat() if hasattr(doc.get("added_at"), "isoformat") else str(doc.get("added_at", "")),
            "name":       row.get("name"),
            "sector":     row.get("sector"),
            "close":      row.get("close"),
            "pct_change": row.get("pct_change"),
            "volume":     row.get("volume"),
            "market_cap": row.get("market_cap"),
            "date":       row.get("date"),
        })
    return result


async def add_to_watchlist(user_id: str, symbol: str) -> dict:
    from app.database import get_db
    db = get_db()
    symbol = symbol.upper()
    exists = await db.market_data.find_one({"symbol": symbol})
    if not exists:
        raise HTTPException(404, f"Symbol {symbol} not found in database")
    already = await db.watchlist.find_one({"user_id": user_id, "symbol": symbol})
    if already:
        return {"message": f"{symbol} already in watchlist"}
    await db.watchlist.insert_one({
        "user_id":  user_id,
        "symbol":   symbol,
        "added_at": datetime.now(timezone.utc),
    })
    return {"message": f"{symbol} added to watchlist"}


async def remove_from_watchlist(user_id: str, symbol: str) -> dict:
    from app.database import get_db
    db = get_db()
    symbol = symbol.upper()
    result = await db.watchlist.delete_one({"user_id": user_id, "symbol": symbol})
    if result.deleted_count == 0:
        raise HTTPException(404, f"{symbol} not in watchlist")
    return {"message": f"{symbol} removed from watchlist"}


async def is_watching(user_id: str, symbol: str) -> bool:
    from app.database import get_db
    db = get_db()
    doc = await db.watchlist.find_one({"user_id": user_id, "symbol": symbol.upper()})
    return doc is not None
