from fastapi import APIRouter, UploadFile, File, Form, Depends, Query
from app.services import data_service, stock_service
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    return await data_service.process_upload(file, data_type, current_user["username"])


@router.get("/stocks")
async def list_stocks(current_user: dict = Depends(get_current_user)):
    return await data_service.get_symbols()


@router.get("/dashboard/summary")
async def dashboard_summary(current_user: dict = Depends(get_current_user)):
    return await data_service.get_dashboard_summary(current_user["user_id"])


@router.get("/stocks/overview")
async def market_overview(current_user: dict = Depends(get_current_user)):
    return await stock_service.get_stocks_market_overview()


@router.get("/stocks/{symbol}")
async def stock_detail(
    symbol: str,
    days: int = Query(default=365, ge=30, le=1825),
    current_user: dict = Depends(get_current_user),
):
    return await stock_service.get_stock_detail(symbol, days)
