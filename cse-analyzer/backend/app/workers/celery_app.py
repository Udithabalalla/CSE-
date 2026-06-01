from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "cse_analyzer",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks", "app.workers.scraper_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=86400,  # 24 hours
    timezone="Asia/Colombo",
    enable_utc=True,
    beat_schedule={
        # Daily end-of-day scrape — CSE closes at 14:30 LKT (09:00 UTC)
        # Run at 15:00 LKT (09:30 UTC) Mon–Fri to get settled data
        "cse-daily-eod-scrape": {
            "task": "scrape_cse_eod",
            "schedule": crontab(hour=9, minute=30, day_of_week="1-5"),
        },
        # Intraday snapshot every 15 min during market hours (09:30–14:30 LKT = 04:00–09:00 UTC)
        "cse-intraday-snapshot": {
            "task": "scrape_cse_intraday",
            "schedule": crontab(minute="*/15", hour="4-9", day_of_week="1-5"),
        },
        # Sector index refresh every 30 min on trading days
        "cse-sector-refresh": {
            "task": "scrape_cse_sectors",
            "schedule": crontab(minute="*/30", hour="4-9", day_of_week="1-5"),
        },
    },
)
