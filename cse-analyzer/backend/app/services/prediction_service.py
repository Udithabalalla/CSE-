# Import `get_db` lazily inside functions to avoid importing motor at module import time


async def enqueue_prediction(symbol: str, model_type: str, forecast_days: int, user_id: str) -> str:
    from app.database import get_db
    db = get_db()
    count = await db.market_data.count_documents({"symbol": symbol})
    if count < 365:
        from fastapi import HTTPException
        raise HTTPException(400, f"{symbol} has only {count} records; minimum 365 required")

    from app.workers.tasks import run_prediction_task
    task = run_prediction_task.delay(symbol, model_type, forecast_days, user_id)
    return task.id


async def get_prediction_status(task_id: str) -> dict:
    from app.workers.celery_app import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(task_id, app=celery_app)
    state = result.state.lower()

    if state == "success":
        return {"task_id": task_id, "status": "done", "result": result.result}
    elif state in ("failure", "revoked"):
        return {"task_id": task_id, "status": "failed", "error": str(result.result)}
    elif state == "processing":
        return {"task_id": task_id, "status": "processing"}
    else:
        return {"task_id": task_id, "status": "pending"}


async def get_prediction_history(user_id: str, limit: int = 20):
    from app.database import get_db
    db = get_db()
    cursor = db.predictions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)
