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

## Admin dashboard

`/admin` (React Router, code-split from the public bundle) is a login-gated
dashboard for running the site day-to-day:

- **Analytics** — visitor traffic and enquiry/lead metrics, charted per the
  project's dataviz standards.
- **Enquiries** — the contact form submissions, in one table.
- **Pages** — a block-based page builder (hero, text, image, video,
  testimonial, CTA, gallery, metrics blocks) for publishing new pages
  (e.g. `/services`, `/about`) beyond the landing page, without a redeploy.
- **Media** — uploads images/video straight to S3-compatible object storage
  (Contabo Object Storage in production).
- **News** — a Market/Company News section with its own listing (`/news`)
  and article pages, independent of the page builder.
- **Events** — Onction events and industry events with public registration,
  capacity limits, automatic waitlisting, and CSV export of registrants.
- **Newsletter** — a subscriber list (public signup in the footer),
  campaign composer, and one-click unsubscribe, sent over SMTP.
- **Tasks** — an action-items board (to do / in progress / done) with
  assignment across team accounts, for running day-to-day operations.
- **Team** — manage who has dashboard access (multiple admin accounts).

New enquiries and event registrations trigger an email alert to the admin
inbox (`ALERT_EMAIL`) — see [backend/README.md](backend/README.md) for the
SMTP configuration this depends on.

See [backend/README.md](backend/README.md) for the API and
[DEPLOY.md](DEPLOY.md) for standing the whole stack up on a VPS via Docker
Compose (Postgres + backend + nginx + Caddy for automatic HTTPS).

## Next steps

- Drag-and-drop block reordering in the page builder (currently up/down
  buttons — functional, just less slick).
- Wire the existing landing-page sections (Hero, About, Metrics, etc.) up as
  editable content too, not just net-new pages.
