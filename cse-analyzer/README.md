Prerequisites
Docker Desktop (for MongoDB + Redis)
Python 3.11+ (a venv already exists at cse-analyzer/backend/.venv)
Node.js 18+ (for the frontend)
1. Start infrastructure (MongoDB + Redis)
From the project root:

cd d:\CSE\cse-analyzer
docker compose up -d
This starts:

MongoDB on localhost:27017
Redis on localhost:6379
2. Configure the backend
Copy the example env file if you don’t already have .env:

cd d:\CSE\cse-analyzer\backend
copy .env.example .env
Edit .env if needed. Defaults are fine for local dev:

MONGO_URI=mongodb://localhost:27017
MONGO_DB=cse_analyzer
REDIS_URL=redis://localhost:6379/0
3. Start the backend API
Activate the virtual environment and run uvicorn:

cd d:\CSE\cse-analyzer\backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt   # only if deps aren't installed yet
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
API will be at:

http://localhost:8000
http://localhost:8000/docs (Swagger UI)
http://localhost:8000/health (health check)
4. Seed sample data (optional but recommended)
In a second terminal (with the venv active):

cd d:\CSE\cse-analyzer\backend
.\.venv\Scripts\Activate.ps1
python seed_data.py
This loads 2 years of synthetic OHLCV data for 8 CSE stocks into MongoDB.

5. Start the frontend
In another terminal:

cd d:\CSE\cse-analyzer\frontend
npm install    # only first time
npm run dev
Frontend runs at http://localhost:5173 and proxies API calls to the backend on port 8000.

6. Celery workers (optional)
Needed only for background tasks (predictions, CSE scraping). Run in separate terminals from backend with the venv active:

# Worker
celery -A app.workers.celery_app worker --loglevel=info --pool=solo
# Scheduler (for automated scraping)
celery -A app.workers.celery_app beat --loglevel=info
Use --pool=solo on Windows because Celery’s default prefork pool doesn’t work well there.

Quick start summary
Service	Command / URL
MongoDB + Redis
docker compose up -d
Backend
uvicorn app.main:app --reload --port 8000
Frontend
npm run dev → http://localhost:5173
Sample data
python seed_data.py
First use
Open http://localhost:5173
Register a new account (auth endpoints are at /auth/register and /auth/login)
Browse stocks and run analysis once seed data is loaded
Troubleshooting
Backend can’t connect to MongoDB — confirm Docker is running: docker compose ps
Frontend API errors — ensure the backend is on port 8000
pip install fails on TensorFlow — you need Python 3.11; the venv in backend/.venv should already be set up
Celery tasks hang on Windows — use --pool=solo as shown above
If you want, I can walk through starting all of these services in your environment step by step.
