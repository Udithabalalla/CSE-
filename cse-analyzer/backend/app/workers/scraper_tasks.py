"""
Celery tasks for scheduled CSE data scraping.

Tasks:
  scrape_cse_eod       — end-of-day upsert (Mon–Fri 15:00 LKT)
  scrape_cse_intraday  — snapshot every 15 min during market hours
  scrape_cse_sectors   — sector index refresh every 30 min
"""

import asyncio
import logging
from datetime import datetime, timezone, date

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

from app.workers.celery_app import celery_app
from app.config import settings
from app.engines import cse_scraper

log = logging.getLogger(__name__)


# ── DB helpers ────────────────────────────────────────────────────────────────

def _get_client():
    return AsyncIOMotorClient(settings.mongo_uri)


async def _upsert_market_data(records: list[dict]) -> dict:
    """Bulk-upsert records into market_data collection."""
    if not records:
        return {"upserted": 0, "modified": 0, "failed": 0}

    client = _get_client()
    db = client[settings.mongo_db]
    ops = []
    for rec in records:
        filt = {"symbol": rec["symbol"], "date": rec["date"]}
        ops.append(UpdateOne(filt, {"$set": rec}, upsert=True))

    result = await db.market_data.bulk_write(ops, ordered=False)
    client.close()
    return {
        "upserted": result.upserted_count,
        "modified": result.modified_count,
        "failed":   len(records) - result.upserted_count - result.modified_count,
    }


async def _upsert_sectors(sectors: list[dict]) -> None:
    client = _get_client()
    db = client[settings.mongo_db]
    now = datetime.now(timezone.utc)
    ops = []
    for s in sectors:
        doc = {
            "sector_id":     s.get("sectorId"),
            "name":          s.get("name"),
            "symbol":        s.get("symbol"),
            "index_code":    s.get("indexCode"),
            "index_value":   s.get("indexValue"),
            "change":        s.get("change"),
            "pct_change":    s.get("percentage"),
            "turnover":      s.get("sectorTurnoverToday"),
            "volume":        s.get("sectorVolumeToday"),
            "prev_close":    s.get("sectorPreviousClose"),
            "updated_at":    now,
        }
        ops.append(UpdateOne({"sector_id": doc["sector_id"]}, {"$set": doc}, upsert=True))
    if ops:
        await db.sector_indices.bulk_write(ops, ordered=False)
    client.close()


async def _log_scrape_run(task_name: str, result: dict) -> None:
    client = _get_client()
    db = client[settings.mongo_db]
    await db.scrape_log.insert_one({
        "task":       task_name,
        "run_at":     datetime.now(timezone.utc),
        "trade_date": date.today().isoformat(),
        **result,
    })
    client.close()


# ── Tasks ─────────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="scrape_cse_eod", max_retries=3, default_retry_delay=300)
def scrape_cse_eod(self):
    """
    End-of-day scrape: upsert today's final OHLCV for all CSE stocks.
    Runs Mon–Fri at 15:00 LKT after market close.
    """
    log.info("scrape_cse_eod started for %s", date.today())
    try:
        records, errors = cse_scraper.scrape_and_normalize()
        result = asyncio.run(_upsert_market_data(records))
        result["errors"] = errors
        result["records_fetched"] = len(records)
        asyncio.run(_log_scrape_run("eod", result))
        log.info("scrape_cse_eod done: %s", result)
        return result
    except Exception as exc:
        log.error("scrape_cse_eod failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, name="scrape_cse_intraday", max_retries=2, default_retry_delay=60)
def scrape_cse_intraday(self):
    """
    Intraday snapshot every 15 min during market hours.
    Upserts current prices so dashboard shows live data.
    """
    log.info("scrape_cse_intraday started")
    try:
        records, errors = cse_scraper.scrape_and_normalize()
        # For intraday, use today's date as key so records overwrite each other
        # (we only keep the latest snapshot per symbol per day)
        result = asyncio.run(_upsert_market_data(records))
        result["errors"] = errors
        result["records_fetched"] = len(records)
        log.info("scrape_cse_intraday done: %s", result)
        return result
    except Exception as exc:
        log.error("scrape_cse_intraday failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, name="scrape_cse_sectors", max_retries=2, default_retry_delay=60)
def scrape_cse_sectors(self):
    """Refresh sector index values in sector_indices collection."""
    log.info("scrape_cse_sectors started")
    try:
        sectors = cse_scraper.fetch_sectors()
        asyncio.run(_upsert_sectors(sectors))
        log.info("scrape_cse_sectors done: %d sectors", len(sectors))
        return {"sectors_updated": len(sectors)}
    except Exception as exc:
        log.error("scrape_cse_sectors failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(name="scrape_cse_manual")
def scrape_cse_manual():
    """One-shot manual trigger from the API — same as EOD scrape."""
    return scrape_cse_eod()
