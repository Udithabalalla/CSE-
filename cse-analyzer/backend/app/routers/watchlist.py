from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.services import watchlist_service

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
async def get_watchlist(current_user: dict = Depends(get_current_user)):
    return await watchlist_service.get_watchlist(current_user["user_id"])


@router.post("/{symbol}")
async def add_symbol(symbol: str, current_user: dict = Depends(get_current_user)):
    return await watchlist_service.add_to_watchlist(current_user["user_id"], symbol)


@router.delete("/{symbol}")
async def remove_symbol(symbol: str, current_user: dict = Depends(get_current_user)):
    return await watchlist_service.remove_from_watchlist(current_user["user_id"], symbol)


@router.get("/check/{symbol}")
async def check_watching(symbol: str, current_user: dict = Depends(get_current_user)):
    watching = await watchlist_service.is_watching(current_user["user_id"], symbol)
    return {"watching": watching}
