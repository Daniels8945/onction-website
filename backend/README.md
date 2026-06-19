# Onction Energy — Backend (FastAPI)

FastAPI + SQLModel + SQLite API powering the website's enquiry form.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://localhost:8000 · Interactive docs: http://localhost:8000/docs

## Endpoints

| Method | Path             | Description                          |
|--------|------------------|--------------------------------------|
| GET    | /api/health      | Health check                         |
| POST   | /api/enquiries   | Create an enquiry (used by the form) |
| GET    | /api/enquiries   | List enquiries (newest first)        |

> `GET /api/enquiries` is unprotected for now — add auth before exposing it.

Data is stored in `onction.db` (SQLite), created automatically on first run.
