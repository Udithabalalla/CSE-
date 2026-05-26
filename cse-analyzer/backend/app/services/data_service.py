import io
import pandas as pd
from datetime import datetime, timezone
from typing import List, Tuple
from fastapi import UploadFile, HTTPException
from pymongo import UpdateOne
from app.database import get_db

REQUIRED_COLUMNS = {
    "stocks": ["symbol", "date", "open", "high", "low", "close", "volume"],
    "indices": ["symbol", "date", "open", "high", "low", "close", "volume"],
    "macro": ["indicator", "date", "value"],
}

COLLECTION_MAP = {
    "stocks": "market_data",
    "indices": "index_data",
    "macro": "macro_indicators",
}


async def process_upload(file: UploadFile, data_type: str, uploaded_by: str):
    if data_type not in REQUIRED_COLUMNS:
        raise HTTPException(400, f"Invalid data_type. Choose from: {list(REQUIRED_COLUMNS.keys())}")

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(400, "Only CSV and Excel files are supported")
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")

    df.columns = [c.lower().strip() for c in df.columns]
    required = REQUIRED_COLUMNS[data_type]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(400, f"Missing required columns: {missing}")

    collection_name = COLLECTION_MAP[data_type]
    records_imported, failed_records, errors = await _bulk_upsert(
        df, collection_name, data_type, uploaded_by
    )

    return {
        "message": "Import completed",
        "records_imported": records_imported,
        "failed_records": failed_records,
        "errors": errors,
    }


async def _bulk_upsert(df: pd.DataFrame, collection: str, data_type: str, uploaded_by: str):
    db = get_db()
    operations = []
    errors = []
    now = datetime.now(timezone.utc)

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based + header
        try:
            doc = _build_doc(row, data_type, uploaded_by, now)
            filter_key = _build_filter(row, data_type)
            operations.append(UpdateOne(filter_key, {"$set": doc}, upsert=True))
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    if not operations:
        return 0, len(df), errors

    result = await db[collection].bulk_write(operations, ordered=False)
    imported = result.upserted_count + result.modified_count
    failed = len(df) - len(operations)
    return imported, failed + len(errors), errors


def _build_doc(row, data_type: str, uploaded_by: str, now) -> dict:
    doc = {"uploaded_by": uploaded_by, "uploaded_at": now}
    if data_type in ("stocks", "indices"):
        doc.update({
            "symbol": str(row["symbol"]).strip().upper(),
            "date": pd.to_datetime(row["date"]).date().isoformat(),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        })
        for opt in ["market_cap", "pe_ratio", "eps", "dividend_yield", "sector"]:
            if opt in row and pd.notna(row[opt]):
                doc[opt] = float(row[opt]) if opt != "sector" else str(row[opt])
    elif data_type == "macro":
        doc.update({
            "indicator": str(row["indicator"]).strip(),
            "date": pd.to_datetime(row["date"]).date().isoformat(),
            "value": float(row["value"]),
        })
    return doc


def _build_filter(row, data_type: str) -> dict:
    if data_type in ("stocks", "indices"):
        return {
            "symbol": str(row["symbol"]).strip().upper(),
            "date": pd.to_datetime(row["date"]).date().isoformat(),
        }
    return {
        "indicator": str(row["indicator"]).strip(),
        "date": pd.to_datetime(row["date"]).date().isoformat(),
    }


async def get_symbols():
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": "$symbol",
            "sector": {"$first": "$sector"},
            "earliest_date": {"$min": "$date"},
            "latest_date": {"$max": "$date"},
            "record_count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    cursor = db.market_data.aggregate(pipeline)
    symbols = []
    async for doc in cursor:
        symbols.append({
            "symbol": doc["_id"],
            "sector": doc.get("sector"),
            "earliest_date": doc.get("earliest_date"),
            "latest_date": doc.get("latest_date"),
            "record_count": doc["record_count"],
        })
    return symbols


async def get_dashboard_summary(user_id: str):
    db = get_db()
    total_stocks = await db.market_data.distinct("symbol")
    total_records = await db.market_data.count_documents({})
    date_agg = await db.market_data.aggregate([
        {"$group": {"_id": None, "min": {"$min": "$date"}, "max": {"$max": "$date"}}}
    ]).to_list(1)
    sectors = await db.market_data.distinct("sector")
    recent_analyses = await db.analysis_results.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    recent_predictions = await db.predictions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    date_range = {}
    if date_agg:
        date_range = {"start": date_agg[0].get("min"), "end": date_agg[0].get("max")}

    return {
        "total_stocks": len(total_stocks),
        "total_records": total_records,
        "date_range": date_range,
        "sectors": [s for s in sectors if s],
        "recent_analyses": recent_analyses,
        "recent_predictions": recent_predictions,
    }
