from fastapi import HTTPException
from datetime import date, timedelta


async def get_stock_detail(symbol: str, days: int = 365):
    from app.database import get_db
    db = get_db()

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    cursor = db.market_data.find(
        {"symbol": symbol.upper(), "date": {"$gte": cutoff}},
        {"_id": 0, "date": 1, "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1,
         "turnover": 1, "market_cap": 1, "pct_change": 1, "trade_count": 1},
    ).sort("date", 1)

    rows = await cursor.to_list(None)
    if not rows:
        raise HTTPException(404, f"No data found for symbol {symbol}")

    # Key stats from most recent row
    latest = rows[-1]
    first = rows[0]
    closes = [r["close"] for r in rows if r.get("close")]
    high52 = max(r["high"] for r in rows if r.get("high"))
    low52  = min(r["low"]  for r in rows if r.get("low") and r["low"] > 0)
    total_return = ((closes[-1] / closes[0]) - 1) * 100 if closes[0] else 0

    # Fetch name and sector from a record if present
    meta = await db.market_data.find_one(
        {"symbol": symbol.upper()}, {"_id": 0, "name": 1, "sector": 1}
    )

    return {
        "symbol": symbol.upper(),
        "name": meta.get("name", "") if meta else "",
        "sector": meta.get("sector", "") if meta else "",
        "stats": {
            "current_price": latest.get("close"),
            "prev_close":    latest.get("prev_close") or (rows[-2]["close"] if len(rows) > 1 else None),
            "pct_change":    latest.get("pct_change"),
            "high_52w":      round(high52, 4),
            "low_52w":       round(low52, 4),
            "market_cap":    latest.get("market_cap"),
            "volume":        latest.get("volume"),
            "turnover":      latest.get("turnover"),
            "total_return_pct": round(total_return, 2),
        },
        "ohlcv": rows,
    }


async def get_stocks_market_overview():
    """All stocks with latest-day snapshot for the market overview table."""
    from app.database import get_db
    db = get_db()

    # Get the latest date available
    latest_doc = await db.market_data.find_one({}, sort=[("date", -1)])
    if not latest_doc:
        return []
    latest_date = latest_doc["date"]

    cursor = db.market_data.find(
        {"date": latest_date},
        {"_id": 0, "symbol": 1, "name": 1, "sector": 1, "close": 1, "open": 1,
         "high": 1, "low": 1, "volume": 1, "turnover": 1, "market_cap": 1,
         "pct_change": 1, "change": 1, "prev_close": 1},
    ).sort("symbol", 1)

    return await cursor.to_list(None)
