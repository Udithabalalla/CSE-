from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.middleware.auth_middleware import get_current_user
from app.services import screener_service

router = APIRouter(prefix="/screener", tags=["screener"])


@router.get("")
async def screen_stocks(
    sector:         Optional[str]   = Query(None),
    min_price:      Optional[float] = Query(None),
    max_price:      Optional[float] = Query(None),
    min_change_pct: Optional[float] = Query(None),
    max_change_pct: Optional[float] = Query(None),
    min_volume:     Optional[float] = Query(None),
    min_market_cap: Optional[float] = Query(None),
    max_market_cap: Optional[float] = Query(None),
    near_52w_high:  Optional[bool]  = Query(None),
    near_52w_low:   Optional[bool]  = Query(None),
    sort_by:        str             = Query("symbol"),
    sort_dir:       int             = Query(1),
    limit:          int             = Query(200, le=500),
    current_user: dict = Depends(get_current_user),
):
    return await screener_service.run_screener(
        sector=sector,
        min_price=min_price,
        max_price=max_price,
        min_change_pct=min_change_pct,
        max_change_pct=max_change_pct,
        min_volume=min_volume,
        min_market_cap=min_market_cap,
        max_market_cap=max_market_cap,
        near_52w_high=near_52w_high,
        near_52w_low=near_52w_low,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
    )


@router.get("/sectors")
async def list_sectors(current_user: dict = Depends(get_current_user)):
    return await screener_service.get_sectors()
