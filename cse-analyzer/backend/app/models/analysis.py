from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import date


class AnalysisRequest(BaseModel):
    analysis_type: Literal["trend", "correlation", "risk", "sector_comparison"]
    symbols: List[str]
    start_date: date
    end_date: date
    params: Optional[Dict[str, Any]] = {}


class AnalysisResponse(BaseModel):
    analysis_type: str
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    warnings: List[str] = []
    recommendations: List[str] = []
