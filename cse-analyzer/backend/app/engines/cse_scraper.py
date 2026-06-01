"""
CSE live data scraper.
Pulls from the public CSE.lk REST API — no auth required.

Public endpoints discovered:
  POST /api/tradeSummary      -> 290 stocks, OHLCV + market cap (current trading day)
  GET  /api/allSecurityCode   -> 323 listed securities (id, name, symbol, active)
  POST /api/allSectors        -> 22 sectors with index values
  POST /api/mostActiveVolumes -> top movers by share volume
"""

import logging
import time
from datetime import datetime, timezone, date
from typing import Any

import requests

log = logging.getLogger(__name__)

_BASE = "https://www.cse.lk/api"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Referer": "https://www.cse.lk/equity/trade-summary",
    "Origin": "https://www.cse.lk",
}
_TIMEOUT = 20


def _post(endpoint: str, payload: dict = {}) -> Any:
    r = requests.post(f"{_BASE}/{endpoint}", headers=_HEADERS, json=payload, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _get(endpoint: str) -> Any:
    r = requests.get(f"{_BASE}/{endpoint}", headers=_HEADERS, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def fetch_trade_summary() -> list[dict]:
    """
    Returns today's OHLCV snapshot for all ~290 listed stocks.
    Fields: symbol, name, open, high, low, closingPrice, price,
            previousClose, sharevolume, tradevolume, turnover,
            marketCap, percentageChange, change, lastTradedTime
    """
    raw = _post("tradeSummary")
    rows = raw.get("reqTradeSummery", [])
    return rows


def fetch_all_securities() -> list[dict]:
    """Returns full list of listed securities with id/name/symbol/active."""
    return _get("allSecurityCode")


def fetch_sectors() -> list[dict]:
    """Returns 22 sector index values with today's performance."""
    return _post("allSectors")


def normalize_trade_row(row: dict, trade_date: str, uploaded_by: str = "cse_scraper") -> dict:
    """
    Convert a raw tradeSummary row into the market_data schema
    used by data_service._build_doc().
    """
    now = datetime.now(timezone.utc)
    symbol = str(row.get("symbol", "")).strip().upper()

    # lastTradedTime is a Unix ms timestamp — use it to confirm trade date
    last_ms = row.get("lastTradedTime")
    if last_ms:
        actual_date = datetime.fromtimestamp(last_ms / 1000, tz=timezone.utc).date().isoformat()
    else:
        actual_date = trade_date

    return {
        "symbol":       symbol,
        "name":         str(row.get("name", "")).strip(),
        "date":         actual_date,
        "open":         float(row.get("open") or 0),
        "high":         float(row.get("high") or 0),
        "low":          float(row.get("low") or 0),
        "close":        float(row.get("closingPrice") or row.get("price") or 0),
        "volume":       float(row.get("sharevolume") or 0),
        "turnover":     float(row.get("turnover") or 0),
        "market_cap":   float(row.get("marketCap") or 0),
        "change":       float(row.get("change") or 0),
        "pct_change":   float(row.get("percentageChange") or 0),
        "prev_close":   float(row.get("previousClose") or 0),
        "trade_count":  int(row.get("tradevolume") or 0),
        "uploaded_by":  uploaded_by,
        "uploaded_at":  now,
    }


def scrape_and_normalize(trade_date: str | None = None) -> tuple[list[dict], list[str]]:
    """
    Fetch today's trade summary from CSE, normalize to market_data schema.
    Returns (records, errors).
    """
    if trade_date is None:
        trade_date = date.today().isoformat()

    rows = fetch_trade_summary()
    records, errors = [], []

    for row in rows:
        try:
            symbol = str(row.get("symbol", "")).strip()
            if not symbol:
                continue
            # Skip zero-price rows (not traded today)
            if not row.get("closingPrice") and not row.get("price"):
                continue
            records.append(normalize_trade_row(row, trade_date))
        except Exception as e:
            errors.append(f"{row.get('symbol', '?')}: {e}")

    log.info("CSE scrape: %d records, %d errors for %s", len(records), len(errors), trade_date)
    return records, errors
