import asyncio
from datetime import datetime, timezone
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from app.workers.celery_app import celery_app
from app.config import settings
from app.engines import ml_engine


def _get_db_sync():
    client = AsyncIOMotorClient(settings.mongo_uri)
    return client[settings.mongo_db], client


async def _fetch_data(symbol: str):
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    cursor = db.market_data.find(
        {"symbol": symbol}, {"_id": 0, "date": 1, "close": 1}
    ).sort("date", 1)
    rows = await cursor.to_list(None)
    client.close()
    return rows


async def _save_result(result_doc: dict):
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    await db.predictions.insert_one(result_doc)
    client.close()


@celery_app.task(bind=True, name="run_prediction")
def run_prediction_task(self, symbol: str, model_type: str, forecast_days: int, user_id: str):
    self.update_state(state="PROCESSING")

    rows = asyncio.run(_fetch_data(symbol))
    if len(rows) < 365:
        raise ValueError(f"Insufficient data: need at least 365 records, got {len(rows)}")

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").set_index("date")
    close = df["close"].astype(float)

    result = ml_engine.run_model(close, model_type, forecast_days)

    last_date = df.index[-1]
    forecast_dates = pd.date_range(
        start=last_date + pd.Timedelta(days=1),
        periods=forecast_days,
        freq="B",  # business days
    ).strftime("%Y-%m-%d").tolist()

    current_price = float(close.iloc[-1])
    predicted_90d = result["predicted_prices"][-1] if len(result["predicted_prices"]) >= 1 else current_price
    recommendation = "hold"
    if predicted_90d > current_price * 1.05:
        recommendation = "buy"
    elif predicted_90d < current_price * 0.95:
        recommendation = "sell"

    vol = float(close.pct_change().std() * 100 * (252 ** 0.5))
    risk_level = "high" if vol >= 4 else ("medium" if vol >= 2 else "low")
    trend = "uptrend" if predicted_90d > current_price else "downtrend"

    insights = {
        "trend": trend,
        "recommendation": recommendation,
        "risk_level": risk_level,
        "current_price": round(current_price, 4),
        "predicted_final_price": round(predicted_90d, 4),
        "price_change_pct": round((predicted_90d / current_price - 1) * 100, 2),
    }

    output = {
        "symbol": symbol,
        "user_id": user_id,
        "model_used": model_type,
        "forecast_dates": forecast_dates,
        "predicted_prices": result["predicted_prices"],
        "upper_bound": result.get("upper_bound"),
        "lower_bound": result.get("lower_bound"),
        "accuracy_metrics": result["accuracy_metrics"],
        "insights": insights,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    asyncio.run(_save_result({**output, "task_id": self.request.id}))
    return output
