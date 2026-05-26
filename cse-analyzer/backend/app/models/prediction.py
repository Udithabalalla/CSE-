from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import date


class PredictionRequest(BaseModel):
    symbol: str
    model_type: Literal["arima", "random_forest", "lstm", "hybrid"] = "hybrid"
    forecast_days: int = 30
    include_confidence: bool = True


class PredictionStatus(BaseModel):
    task_id: str
    status: Literal["pending", "processing", "done", "failed"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PredictionResult(BaseModel):
    symbol: str
    model_used: str
    forecast_dates: List[str]
    predicted_prices: List[float]
    upper_bound: Optional[List[float]] = None
    lower_bound: Optional[List[float]] = None
    accuracy_metrics: Dict[str, float]
    insights: Optional[Dict[str, Any]] = None
    created_at: str
