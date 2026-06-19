# Onction Energy — Website Rebuild

A complete rebuild of the Onction Energy site as a **React + Vite + Tailwind**
frontend with a **FastAPI + SQLModel + SQLite** backend.

The landing page structure is adapted from **Tata Power TPTCL** (layout/UI),
**GMR Power Trading** (content architecture) and **PTC India Business
Solutions** (the service set) — but every claim is rewritten to reflect
Onction's real positioning: a NERC-licensed bulk electricity trader and WAPP
market participant operating across West Africa.

```
onction-energy/
├── frontend/        # React + Vite + Tailwind landing page
└── backend/         # FastAPI + SQLModel API (enquiry form)
```

## Quick start

Open two terminals.

### 1) Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000  (docs at /docs)
```

### 2) Frontend (Vite)

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend on port 8000, so the
enquiry form works out of the box with both running.

## What's on the page

Sticky header → 3-slide hero (animated grid + teal current) → credentials
strip → metrics band → tabbed About → Business Solutions cards → Integrated
Trading Capability → GR0W pillars → Why Onction highlights → SDG 7 commitment →
enquiry form (saved to the database) → footer.

## Building for production

```bash
cd frontend
npm run build                      # outputs to frontend/dist
```

Set `VITE_API_BASE` in `frontend/.env` to your deployed API URL, and add your
production frontend origin to the CORS list in `backend/app/main.py`.

## Next steps (when you expand beyond the landing page)

- Add the inner pages: full **Services**, **About Us**, **GR0W**,
  **Board of Directors**, **Contact**.
- Add React Router for multi-page navigation.
- Protect `GET /api/enquiries` with auth and build a small admin view.
- Swap SQLite for Postgres for production.
