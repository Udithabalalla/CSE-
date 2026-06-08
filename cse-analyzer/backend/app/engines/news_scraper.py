"""
CSE announcements scraper.
Pulls company announcements from the CSE public API.
"""
import logging
import re
from datetime import datetime, timezone, date, timedelta
from typing import Any

import requests

log = logging.getLogger(__name__)

_BASE    = "https://www.cse.lk/api"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Referer": "https://www.cse.lk/company-announcements",
    "Origin": "https://www.cse.lk",
}
_TIMEOUT = 20


def _post(endpoint: str, payload: dict = {}) -> Any:
    r = requests.post(f"{_BASE}/{endpoint}", headers=_HEADERS, json=payload, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def fetch_announcements(days_back: int = 7) -> list[dict]:
    """
    Fetch recent company announcements from CSE.
    Returns normalized list of announcement records.
    """
    from_date = (date.today() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date   = date.today().strftime("%Y-%m-%d")

    try:
        raw = _post("companyAnnouncements", {
            "fromDate": from_date,
            "toDate":   to_date,
            "symbolCode": "",
        })
    except Exception as e:
        log.warning("announcements API failed (%s), trying alternative endpoint", e)
        try:
            raw = _post("announcement", {"from": from_date, "to": to_date})
        except Exception as e2:
            log.error("Both announcement endpoints failed: %s", e2)
            return []

    items = raw if isinstance(raw, list) else raw.get("announcements", raw.get("data", []))
    return [_normalize(item) for item in items if item]


def fetch_market_news(days_back: int = 7) -> list[dict]:
    """
    Fetch CSE market news / circulars.
    """
    from_date = (date.today() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date   = date.today().strftime("%Y-%m-%d")
    try:
        raw = _post("cseNews", {"fromDate": from_date, "toDate": to_date})
    except Exception as e:
        log.warning("cseNews endpoint failed: %s", e)
        return []

    items = raw if isinstance(raw, list) else raw.get("news", raw.get("data", []))
    return [_normalize_news(item) for item in items if item]


def _normalize(item: dict) -> dict:
    now = datetime.now(timezone.utc)
    # Try to parse published date
    pub_str = item.get("date") or item.get("publishedDate") or item.get("announcementDate") or ""
    published_at = _parse_date(pub_str) or now

    symbol = str(item.get("symbol") or item.get("symbolCode") or "").strip().upper()
    company = str(item.get("companyName") or item.get("company") or item.get("name") or "").strip()
    title   = str(item.get("subject") or item.get("title") or item.get("heading") or "").strip()
    category = str(item.get("category") or item.get("type") or "announcement").strip()
    url     = str(item.get("url") or item.get("link") or item.get("attachmentUrl") or "").strip()

    return {
        "symbol":       symbol or None,
        "company":      company or None,
        "title":        title or "No title",
        "category":     category,
        "published_at": published_at,
        "url":          url or None,
        "source":       "cse",
        "scraped_at":   now,
        "type":         "announcement",
    }


def _normalize_news(item: dict) -> dict:
    now = datetime.now(timezone.utc)
    pub_str = item.get("date") or item.get("publishedDate") or ""
    published_at = _parse_date(pub_str) or now

    return {
        "symbol":       None,
        "company":      None,
        "title":        str(item.get("heading") or item.get("title") or "").strip() or "No title",
        "category":     "market_news",
        "published_at": published_at,
        "url":          str(item.get("url") or item.get("link") or "").strip() or None,
        "source":       "cse",
        "scraped_at":   now,
        "type":         "market_news",
    }


def _parse_date(s: str) -> datetime | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(s[:len(fmt)], fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    # Try Unix ms
    try:
        ms = int(re.sub(r"\D", "", s[:13]))
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    except Exception:
        pass
    return None
