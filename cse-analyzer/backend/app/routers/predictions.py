from fastapi import APIRouter, Depends
from app.models.prediction import PredictionRequest, PredictionStatus
from app.services import prediction_service
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("/generate")
async def generate_prediction(
    body: PredictionRequest,
    current_user: dict = Depends(get_current_user),
):
    task_id = await prediction_service.enqueue_prediction(
        body.symbol, body.model_type, body.forecast_days, current_user["user_id"]
    )
    return {"task_id": task_id, "status": "pending"}


@router.get("/status/{task_id}", response_model=PredictionStatus)
async def prediction_status(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await prediction_service.get_prediction_status(task_id)


@router.get("/history")
async def prediction_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    return await prediction_service.get_prediction_history(current_user["user_id"], limit)
