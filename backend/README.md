# Onction Energy — Backend (FastAPI)

FastAPI + SQLModel API powering the public website (enquiry form, dynamic
pages) and the admin dashboard (auth, page builder, media library,
analytics). SQLite locally, Postgres in production — same code, just a
different `DATABASE_URL`.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed                 # creates the first dashboard login
uvicorn app.main:app --reload
```

API: http://localhost:8000 · Interactive docs: http://localhost:8000/docs

By default the seed script creates `admin@onctionenergy.com` /
`change-me-immediately` (see defaults in `app/config.py`). Set `ADMIN_EMAIL`
/ `ADMIN_PASSWORD` env vars (or a `.env` file, copy from `.env.example`)
before seeding to pick your own.

## Configuration

Copy `.env.example` to `.env` and fill in for production. Nothing is
required for local dev — every setting has a safe default (SQLite file,
dev-only JWT secret, object storage disabled until S3 vars are set).

| Var | Purpose |
|---|---|
| `DATABASE_URL` | `sqlite:///./onction.db` locally, `postgresql+psycopg://...` in prod |
| `JWT_SECRET` | Signs dashboard login tokens — **must** be a real secret in prod (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used once by `python -m app.seed` to create the first login |
| `S3_ENDPOINT_URL` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | Contabo Object Storage (or any S3-compatible bucket) for media uploads |
| `S3_PUBLIC_BASE_URL` | Optional CDN/domain in front of the bucket for serving uploaded files |
| `EXTRA_CORS_ORIGINS` | Comma-separated production frontend origin(s) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_USE_TLS` | Sends newsletters, event confirmations, and admin alerts. Provider-agnostic — works against a VPS mail server or any SMTP-compatible ESP (SES, SendGrid, Mailgun) unchanged |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | The From: address/name on outgoing mail |
| `ALERT_EMAIL` | Where new-enquiry / new-registration notifications go (defaults to `ADMIN_EMAIL`) |
| `PUBLIC_SITE_URL` | Used to build links inside main-site emails (unsubscribe, etc.) |
| `VENDOR_PORTAL_URL` | Used to build links inside vendor-portal emails (password reset) — the vendor portal is served on its own subdomain (`vendors.<domain>`), so this is separate from `PUBLIC_SITE_URL` |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/login` | — | Dashboard login, returns a JWT |
| GET | `/api/auth/me` | ✅ | Current admin |
| POST | `/api/enquiries` | — | Public — contact form submits here |
| GET | `/api/enquiries` | ✅ | Dashboard — list enquiries, newest first |
| GET | `/api/pages/public/{slug}` | — | Public — fetch a *published* page's blocks for rendering |
| GET | `/api/pages` | ✅ | Dashboard — list all pages (any status) |
| GET/POST/PUT/DELETE | `/api/pages[/{id}]` | ✅ | Dashboard — page CRUD |
| PUT | `/api/pages/{id}/blocks` | ✅ | Dashboard — save the page builder's block list |
| POST/GET | `/api/media` | ✅ | Dashboard — upload / list media assets |
| DELETE | `/api/media/{id}` | ✅ | Dashboard — delete a media asset |
| POST | `/api/analytics/track` | — | Public — pageview beacon (no PII stored; IP is hashed) |
| GET | `/api/analytics/traffic` | ✅ | Dashboard — visitor/traffic analytics |
| GET | `/api/analytics/business` | ✅ | Dashboard — enquiry/lead analytics |
| GET | `/api/admin/users` | ✅ | Dashboard — list team accounts |
| POST | `/api/admin/users` | ✅ | Dashboard — create a team account |
| DELETE | `/api/admin/users/{id}` | ✅ | Dashboard — deactivate a team account (not yourself) |
| GET | `/api/news/public` | — | Public — published posts, optional `?category=` filter |
| GET | `/api/news/public/{slug}` | — | Public — a single published post |
| GET/POST/PUT/DELETE | `/api/news[/{id}]` | ✅ | Dashboard — post CRUD (any status) |
| GET | `/api/events/public` | — | Public — published, upcoming-sorted events |
| GET | `/api/events/public/{slug}` | — | Public — a single published event |
| POST | `/api/events/public/{slug}/register` | — | Public — register (or waitlist once at capacity) |
| GET/POST/PUT/DELETE | `/api/events[/{id}]` | ✅ | Dashboard — event CRUD |
| GET | `/api/events/{id}/registrations` | ✅ | Dashboard — registrant list |
| GET | `/api/events/{id}/registrations/export` | ✅ | Dashboard — registrants as CSV |
| DELETE | `/api/events/{id}/registrations/{rid}` | ✅ | Dashboard — cancel a registration (auto-promotes the next waitlisted person) |
| POST | `/api/newsletter/subscribe` | — | Public — newsletter signup |
| GET | `/api/newsletter/unsubscribe?token=` | — | Public — one-click unsubscribe (linked from every send) |
| GET | `/api/newsletter/subscribers` | ✅ | Dashboard — subscriber list |
| GET/POST/PUT/DELETE | `/api/newsletter/campaigns[/{id}]` | ✅ | Dashboard — campaign CRUD (drafts only) |
| POST | `/api/newsletter/campaigns/{id}/send` | ✅ | Dashboard — sends to all subscribed addresses in the background; 503 if SMTP isn't configured |
| GET/POST/PUT/DELETE | `/api/tasks[/{id}]` | ✅ | Dashboard — action-items/task board |

✅ = requires `Authorization: Bearer <token>` from `/api/auth/login`.

### Vendor platform (`/api/vendor-platform/*`)

The merged vendor registration/management platform — vendors, invoices,
documents, services, notifications, audit log, and settings. Full interactive
reference is at `/docs` (Swagger, tagged `vendor-platform`); the high points:

| Area | Auth | Notes |
|---|---|---|
| `POST /api/vendor-platform/auth/register` | — | Public vendor self-registration |
| `POST /api/vendor-platform/auth/login` | — | Vendor login by vendor code (+ optional password) |
| `POST /api/vendor-platform/auth/forgot-password` / `reset-password` | — | Vendor password reset |
| `POST /api/auth/forgot-password` / `reset-password` | — | Admin password reset (same idea, admin-scoped) |
| `/api/vendor-platform/vendors[...]` | Admin (role-gated) | Vendor CRUD, status, notes |
| `/api/vendor-platform/invoices[...]` | Admin or the owning vendor | Shared endpoints — vendors see only their own |
| `/api/vendor-platform/documents[...]` | Admin or the owning vendor | Uploads go to the same S3-compatible bucket as media |
| `/api/vendor-platform/services[...]` | Admin writes, anyone reads active ones | Catalogue for invoice line items |
| `/api/vendor-platform/notifications[...]` | Admin or vendor | Scoped to the caller |
| `/api/vendor-platform/audit` | Admin (clear: Super Admin only) | |
| `/api/vendor-platform/settings` | GET public, PUT admin | Currency, prefixes, approval workflow toggles |

Admin roles (`AdminUser.role`): **Super Admin**, **Admin**, **Viewer** — set
when creating a team member, gates the vendor-platform write endpoints
above (`security.require_role`). Existing modules (pages/news/events/etc.)
are unaffected by roles.

Data is stored in `onction.db` (SQLite) by default, created automatically on
first run. Point `DATABASE_URL` at Postgres for production.
