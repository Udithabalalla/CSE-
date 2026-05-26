# CSE Market Analyzer

Full-stack stock market analysis platform for the Colombo Stock Exchange.

**Stack**: FastAPI + React (TypeScript) + MongoDB + Celery/Redis

---

## Quick Start

### 1. Start infrastructure
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Celery Worker (separate terminal)
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, receive JWT |
| POST | `/data/upload` | Upload CSV/Excel (stocks/indices/macro) |
| GET | `/data/stocks` | List all stock symbols |
| GET | `/data/dashboard/summary` | Dashboard stats |
| POST | `/analysis/run` | Run analysis (trend/correlation/risk/sector) |
| GET | `/analysis/history` | User's analysis history |
| POST | `/predictions/generate` | Enqueue ML prediction task |
| GET | `/predictions/status/{task_id}` | Poll prediction status |
| GET | `/predictions/history` | User's prediction history |

---

## CSV Format

### Stocks / Indices
```
symbol,date,open,high,low,close,volume,sector
COMB.N0000,2024-01-02,125.50,128.00,124.00,127.50,1250000,Finance
```

### Macro Indicators
```
indicator,date,value
inflation_rate,2024-01-01,5.2
```
