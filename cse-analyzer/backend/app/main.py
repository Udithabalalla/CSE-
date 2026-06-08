import math
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.routers import auth, data, analysis, predictions, scraper, watchlist, screener, news


class SafeJSONResponse(JSONResponse):
    """JSONResponse that converts NaN/Inf floats to null instead of crashing."""
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            allow_nan=False,
            default=lambda o: None if isinstance(o, float) and (math.isnan(o) or math.isinf(o)) else str(o),
        ).encode("utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import DB connect/close lazily and continue if DB packages are missing
    try:
        from app.database import connect_db, close_db
        await connect_db()
    except Exception:
        connect_db = None
        close_db = None
    yield
    try:
        if close_db:
            await close_db()
    except Exception:
        pass


app = FastAPI(title="CSE Market Analyzer", version="1.0.0", lifespan=lifespan, default_response_class=SafeJSONResponse)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(analysis.router)
app.include_router(predictions.router)
app.include_router(scraper.router)
app.include_router(watchlist.router)
app.include_router(screener.router)
app.include_router(news.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
