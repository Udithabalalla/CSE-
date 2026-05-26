import time
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.database import get_db
from app.engines import statistics_engine


async def _fetch_symbol_data(symbol: str, start: str, end: str) -> List[dict]:
    db = get_db()
    cursor = db.market_data.find(
        {"symbol": symbol, "date": {"$gte": start, "$lte": end}},
        {"_id": 0},
    ).sort("date", 1)
    return await cursor.to_list(None)


async def run_analysis(
    analysis_type: str,
    symbols: List[str],
    start_date,
    end_date,
    params: Dict[str, Any],
    user_id: str,
) -> Dict[str, Any]:
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()
    t0 = time.time()
    warnings = []
    data = {}

    if analysis_type == "trend":
        symbol = symbols[0]
        rows = await _fetch_symbol_data(symbol, start_str, end_str)
        if not rows:
            warnings.append(f"No data found for {symbol} in the given date range")
        else:
            import pandas as pd
            df = pd.DataFrame(rows)
            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date").set_index("date")
            data = statistics_engine.compute_trend(df, params)

    elif analysis_type == "correlation":
        import pandas as pd
        method = params.get("method", "pearson")
        dfs = {}
        for sym in symbols:
            rows = await _fetch_symbol_data(sym, start_str, end_str)
            if rows:
                df = pd.DataFrame(rows)
                df["date"] = pd.to_datetime(df["date"])
                df = df.sort_values("date").set_index("date")
                dfs[sym] = df
            else:
                warnings.append(f"No data for {sym}")
        data = statistics_engine.compute_correlation(dfs, method)

    elif analysis_type == "risk":
        import pandas as pd
        symbol = symbols[0]
        rows = await _fetch_symbol_data(symbol, start_str, end_str)
        benchmark_rows = await _fetch_benchmark(start_str, end_str)
        benchmark_df = None
        if benchmark_rows:
            bdf = pd.DataFrame(benchmark_rows)
            bdf["date"] = pd.to_datetime(bdf["date"])
            benchmark_df = bdf.sort_values("date").set_index("date")
        if not rows:
            warnings.append(f"No data found for {symbol}")
        else:
            df = pd.DataFrame(rows)
            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date").set_index("date")
            data = statistics_engine.compute_risk(df, benchmark_df)

    elif analysis_type == "sector_comparison":
        import pandas as pd
        dfs = {}
        for sym in symbols:
            rows = await _fetch_symbol_data(sym, start_str, end_str)
            if rows:
                df = pd.DataFrame(rows)
                df["date"] = pd.to_datetime(df["date"])
                dfs[sym] = df.sort_values("date").set_index("date")
        data = statistics_engine.compute_sector_comparison(dfs)

    elapsed_ms = int((time.time() - t0) * 1000)

    result_doc = {
        "user_id": user_id,
        "analysis_type": analysis_type,
        "symbols": symbols,
        "start_date": start_str,
        "end_date": end_str,
        "data": data,
        "warnings": warnings,
        "created_at": datetime.now(timezone.utc),
    }
    db = get_db()
    await db.analysis_results.insert_one(result_doc)

    return {
        "analysis_type": analysis_type,
        "data": data,
        "metadata": {"execution_time_ms": elapsed_ms, "symbols": symbols},
        "warnings": warnings,
        "recommendations": _generate_recommendations(analysis_type, data),
    }


async def _fetch_benchmark(start: str, end: str) -> List[dict]:
    db = get_db()
    cursor = db.index_data.find(
        {"date": {"$gte": start, "$lte": end}},
        {"_id": 0},
    ).sort("date", 1)
    return await cursor.to_list(None)


def _generate_recommendations(analysis_type: str, data: dict) -> List[str]:
    recs = []
    if analysis_type == "trend":
        trend = data.get("trend_direction")
        if trend == "bullish":
            recs.append("Price is trading above 20-day SMA — bullish momentum")
        elif trend == "bearish":
            recs.append("Price is trading below 20-day SMA — consider caution")
    elif analysis_type == "risk":
        level = data.get("risk_level")
        if level == "high":
            recs.append("High volatility detected — consider position sizing carefully")
        sharpe = data.get("sharpe_ratio", 0)
        if sharpe > 1:
            recs.append("Sharpe ratio > 1 indicates good risk-adjusted returns")
    return recs


async def get_analysis_history(user_id: str, limit: int = 20) -> List[dict]:
    db = get_db()
    cursor = db.analysis_results.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)
