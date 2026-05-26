from fastapi import APIRouter, Depends
from app.models.analysis import AnalysisRequest, AnalysisResponse
from app.services import analysis_service
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/run", response_model=AnalysisResponse)
async def run_analysis(
    body: AnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    return await analysis_service.run_analysis(
        body.analysis_type,
        body.symbols,
        body.start_date,
        body.end_date,
        body.params or {},
        current_user["user_id"],
    )


@router.get("/history")
async def analysis_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    return await analysis_service.get_analysis_history(current_user["user_id"], limit)
