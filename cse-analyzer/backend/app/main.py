from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import auth, data, analysis, predictions, scraper


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


app = FastAPI(title="CSE Market Analyzer", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(analysis.router)
app.include_router(predictions.router)
app.include_router(scraper.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
