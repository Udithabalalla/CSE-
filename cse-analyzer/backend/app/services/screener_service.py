import math
from typing import Optional


def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


async def run_screener(
    sector: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_change_pct: Optional[float] = None,
    max_change_pct: Optional[float] = None,
    min_volume: Optional[float] = None,
    min_market_cap: Optional[float] = None,
    max_market_cap: Optional[float] = None,
    near_52w_high: Optional[bool] = None,
    near_52w_low: Optional[bool] = None,
    sort_by: str = "symbol",
    sort_dir: int = 1,
    limit: int = 200,
) -> list[dict]:
    from app.database import get_db
    db = get_db()

    # Get latest snapshot for every stock
    pipeline = [
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$symbol",
            "name":       {"$first": "$name"},
            "sector":     {"$first": "$sector"},
            "close":      {"$first": "$close"},
            "open":       {"$first": "$open"},
            "high":       {"$first": "$high"},
            "low":        {"$first": "$low"},
            "pct_change": {"$first": "$pct_change"},
            "volume":     {"$first": "$volume"},
            "turnover":   {"$first": "$turnover"},
            "market_cap": {"$first": "$market_cap"},
            "date":       {"$first": "$date"},
        }},
    ]

    rows = []
    async for doc in db.market_data.aggregate(pipeline):
        rows.append({
            "symbol":     doc["_id"],
            "name":       doc.get("name"),
            "sector":     doc.get("sector"),
            "close":      _clean(doc.get("close")),
            "open":       _clean(doc.get("open")),
            "high":       _clean(doc.get("high")),
            "low":        _clean(doc.get("low")),
            "pct_change": _clean(doc.get("pct_change")),
            "volume":     _clean(doc.get("volume")),
            "turnover":   _clean(doc.get("turnover")),
            "market_cap": _clean(doc.get("market_cap")),
            "date":       doc.get("date"),
        })

    # Get 52W high/low per symbol
    if near_52w_high or near_52w_low:
        from datetime import date, timedelta
        cutoff = (date.today() - timedelta(days=365)).isoformat()
        w52_pipe = [
            {"$match": {"date": {"$gte": cutoff}}},
            {"$group": {
                "_id": "$symbol",
                "high_52w": {"$max": "$high"},
                "low_52w":  {"$min": "$low"},
            }},
        ]
        w52 = {r["_id"]: r async for r in db.market_data.aggregate(w52_pipe)}
        for row in rows:
            sym = row["symbol"]
            w = w52.get(sym, {})
            row["high_52w"] = w.get("high_52w")
            row["low_52w"]  = w.get("low_52w")

    # Apply filters
    def passes(r: dict) -> bool:
        if sector and r.get("sector") != sector:
            return False
        c = r.get("close") or 0
        if min_price is not None and c < min_price:
            return False
        if max_price is not None and c > max_price:
            return False
        pct = r.get("pct_change") or 0
        if min_change_pct is not None and pct < min_change_pct:
            return False
        if max_change_pct is not None and pct > max_change_pct:
            return False
        vol = r.get("volume") or 0
        if min_volume is not None and vol < min_volume:
            return False
        mc = r.get("market_cap") or 0
        if min_market_cap is not None and mc < min_market_cap:
            return False
        if max_market_cap is not None and mc > max_market_cap:
            return False
        if near_52w_high:
            h = r.get("high_52w") or 0
            if not h or c < h * 0.95:
                return False
        if near_52w_low:
            lo = r.get("low_52w") or 0
            if not lo or c > lo * 1.05:
                return False
        return True

    filtered = [r for r in rows if passes(r)]

    # Sort
    reverse = sort_dir == -1
    filtered.sort(key=lambda r: (r.get(sort_by) or 0) if isinstance(r.get(sort_by), (int, float)) else (r.get(sort_by) or ""), reverse=reverse)

    return filtered[:limit]


async def get_sectors() -> list[str]:
    from app.database import get_db
    db = get_db()
    sectors = await db.market_data.distinct("sector")
    return sorted([s for s in sectors if s])
