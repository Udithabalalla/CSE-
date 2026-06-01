from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.workers.scraper_tasks import scrape_cse_manual

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/trigger")
async def trigger_scrape(current_user: dict = Depends(get_current_user)):
    """Manually trigger a CSE data scrape (runs as Celery task)."""
    task = scrape_cse_manual.delay()
    return {"task_id": task.id, "status": "queued"}


@router.get("/status/{task_id}")
async def scrape_status(task_id: str, current_user: dict = Depends(get_current_user)):
    from app.workers.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status":  result.status,
        "result":  result.result if result.ready() else None,
    }
