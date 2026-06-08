from typing import Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from app.middleware.auth_middleware import get_current_user
from app.services import news_service

router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
async def get_news(
    symbol:   Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    days:     int           = Query(7, ge=1, le=90),
    limit:    int           = Query(50, le=200),
    current_user: dict = Depends(get_current_user),
):
    return await news_service.get_news(symbol=symbol, category=category, days=days, limit=limit)


@router.post("/refresh")
async def refresh_news(
    background_tasks: BackgroundTasks,
    days_back: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
):
    background_tasks.add_task(news_service.refresh_news, days_back)
    return {"message": "News refresh started in background"}


@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    return await news_service.get_categories()
