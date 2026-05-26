from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class StockRecord(BaseModel):
    symbol: str
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None


class UploadResponse(BaseModel):
    message: str
    records_imported: int
    failed_records: int
    errors: List[str]


class StockSymbol(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None
    record_count: int = 0


class DashboardSummary(BaseModel):
    total_stocks: int
    total_records: int
    date_range: dict
    sectors: List[str]
    recent_analyses: List[dict]
    recent_predictions: List[dict]
