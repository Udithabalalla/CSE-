"""
Seed script: generates 2 years of synthetic OHLCV data for 8 CSE stocks
and inserts directly into MongoDB.

Run: python seed_data.py
"""

import asyncio
import random
from datetime import date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB",  "cse_analyzer")

STOCKS = [
    {"symbol": "JKH",  "sector": "Diversified",       "start_price": 185.0},
    {"symbol": "COMB", "sector": "Banking",            "start_price": 92.0},
    {"symbol": "DIAL", "sector": "Telecommunications", "start_price": 14.5},
    {"symbol": "DIST", "sector": "Beverage",           "start_price": 320.0},
    {"symbol": "CTC",  "sector": "Consumer Goods",     "start_price": 1050.0},
    {"symbol": "LIOC", "sector": "Energy",             "start_price": 74.0},
    {"symbol": "SAMP", "sector": "Banking",            "start_price": 52.0},
    {"symbol": "HNBF", "sector": "Finance",            "start_price": 18.5},
]

def generate_ohlcv(symbol: str, sector: str, start_price: float, start: date, end: date):
    records = []
    price = start_price
    current = start
    while current <= end:
        if current.weekday() >= 5:      # skip weekends
            current += timedelta(days=1)
            continue
        drift   = random.gauss(0.0002, 0.015)
        price   = max(price * (1 + drift), 0.5)
        spread  = price * random.uniform(0.005, 0.02)
        high    = round(price + spread, 2)
        low     = round(price - spread, 2)
        open_p  = round(random.uniform(low, high), 2)
        close_p = round(price, 2)
        volume  = random.randint(50_000, 2_000_000)
        records.append({
            "symbol":   symbol,
            "sector":   sector,
            "date":     current.isoformat(),
            "open":     open_p,
            "high":     high,
            "low":      low,
            "close":    close_p,
            "volume":   float(volume),
            "uploaded_by": "seed_script",
        })
        current += timedelta(days=1)
    return records


async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]

    end   = date.today()
    start = end - timedelta(days=730)   # ~2 years

    total = 0
    for stock in STOCKS:
        records = generate_ohlcv(
            stock["symbol"], stock["sector"], stock["start_price"], start, end
        )
        if records:
            await db.market_data.delete_many({"symbol": stock["symbol"]})
            await db.market_data.insert_many(records)
            total += len(records)
            print(f"  {stock['symbol']:6s}  {len(records):4d} records inserted")

    print(f"\nDone — {total} total records seeded into '{MONGO_DB}'")
    client.close()


if __name__ == "__main__":
    print(f"Seeding CSE sample data into {MONGO_URI} / {MONGO_DB} ...\n")
    asyncio.run(seed())
