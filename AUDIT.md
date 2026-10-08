# Platform Audit — Onction Energy

**Date:** 8 October 2026 · **Scope:** the whole repository at `main` (public site,
admin dashboard, vendor platform, FastAPI backend, Docker/Caddy deployment).
**Method:** code review of every backend router and the security, storage and
email layers; frontend review for token handling and unsafe rendering;
dependency scans (`npm audit`, `pip-audit`); the three most serious findings
were reproduced against the real backend code (see [Evidence](#evidence)).

## Summary

The platform is well structured and most of the fundamentals are right:
passwords are bcrypt-hashed, admin and vendor sessions are separated by a
token `scope` claim, vendors are correctly confined to their own invoices and
documents, password-reset endpoints don't leak which emails exist, Postgres is
never exposed outside Docker, and Caddy provides automatic HTTPS.

**It should not go live as-is.** Three issues let an outsider or a low-privilege
user take over accounts. All three are small code changes.

| Severity | Count | Meaning |
|---|---|---|
| 🔴 Critical | 3 | Account takeover or full compromise; fix before launch |
| 🟠 High | 4 | Serious abuse or data exposure; fix before or right after launch |
| 🟡 Medium | 6 | Real weaknesses with narrower impact |
| ⚪ Low / hygiene | 7 | Worth doing; not urgent |

---

## 🔴 Critical — fix before launch

### C1. A blank `JWT_SECRET` is silently accepted
`docker-compose.yml:25` passes `JWT_SECRET: ${JWT_SECRET}` through. If `.env`
leaves it empty (as `.env.example` ships), the backend runs with an **empty
signing key** (`backend/app/config.py:22`), so anyone can forge an admin token
and use the whole dashboard. The same pattern applies to `ADMIN_PASSWORD`
(`docker-compose.yml:27`).
**Fix:** refuse to start when `JWT_SECRET` is shorter than 32 characters or still
the dev default; use `${JWT_SECRET:?set JWT_SECRET in .env}` in compose.

### C2. Vendor accounts open with the vendor code alone
`backend/app/routers/vendor_platform_auth.py:86` only checks a password **if one
has been set**. Every newly registered vendor has none, so knowing the code
(`OSL-2026-ABC-1234`, which is emailed, printed on paperwork and shown on screen)
is enough to sign in, read the account, submit invoices and upload documents.
**Fix:** require a password at registration (or send a one-time set-password
link), and never issue a token without one.

### C3. Any dashboard user, including a read-only **Viewer**, can create a Super Admin
`backend/app/routers/admin_users.py:20` (create) and `:41` (deactivate) only
require *a* logged-in admin. A Viewer can create a Super Admin for themselves, or
deactivate every other admin.
**Fix:** gate both with `require_role("Super Admin")`, and block creating a role
higher than your own.

## 🟠 High

### H1. No rate limiting anywhere
Admin login, vendor login (also brute-forcing vendor codes), forgot-password
(email bombing), vendor registration, enquiries, newsletter signup, event
registration and the analytics beacon are all unlimited.
**Fix:** a per-IP limit in Caddy or nginx for `/api/*/login`, `/forgot-password`,
`/register` and the public POSTs (for example `slowapi` in FastAPI, or nginx `limit_req`).

### H2. Vendor compliance documents are public on the internet
`backend/app/storage.py:81` uploads everything with `ACL="public-read"`,
including vendor certificates, tax IDs and invoices. The URLs are random but
permanent and unauthenticated; anyone they're forwarded to can open them.
**Fix:** store vendor documents privately and serve short-lived presigned URLs
after an ownership check; keep `public-read` only for site media.

### H3. Outdated backend dependencies with published advisories
`pip-audit` reports advisories against `pyjwt 2.9.0` (17, fixed by 2.15.0),
`python-multipart 0.0.9` (7, fixed by 0.0.31) and `starlette 0.38.6` (7, pulled in
by `fastapi 0.115.0`; fixed in later releases), several of them denial-of-service
via crafted multipart requests. Frontend: `npm audit` found **0** vulnerabilities.
**Fix:** bump FastAPI (which brings a patched Starlette), `python-multipart` and
`pyjwt`, then re-run the deploy checklist in `DEPLOY.md`.

### H4. Page-builder links can carry `javascript:` URLs
`frontend/src/blocks/BlockRenderer.jsx` renders admin-entered `ctaHref`,
`buttonHref`, `href`, `linkHref` and the video `iframe src` unchecked. Combined
with C3 and with tokens kept in `localStorage` (M3), a low-privilege admin could
plant a script on a public page that steals a Super Admin's session.
**Fix:** allow only `https:`, `mailto:`, `tel:` and relative URLs (in the backend
on save and in the renderer); restrict video embeds to known hosts.

## 🟡 Medium

| # | Finding | Where | Fix |
|---|---|---|---|
| M1 | Uploads read the whole file (up to 200 MB) into memory; with C2, unauthenticated parties can upload. Type check trusts the client's `Content-Type`. | `backend/app/storage.py:66` | Stream to S3, lower limits for vendor documents, check file signatures |
| M2 | Analytics counts every visitor as one: behind Caddy → nginx, `request.client.host` is always the nginx container. Every pageview also sends that address to `ipapi.co`. | `backend/app/routers/analytics.py:45`, `analytics_utils.py:68` | Read `X-Forwarded-For` from the trusted proxy; cache or batch geo lookups and name the third party in the privacy policy |
| M3 | Admin and vendor tokens live in `localStorage` for 12 h, so any XSS (see H4) can steal them. | `frontend/src/admin/lib/adminApi.js:12`, `vendor-portal/lib/vendorApi.js:12` | Move to `HttpOnly` `SameSite` cookies, or shorten the lifetime and add refresh |
| M4 | No security headers: no HSTS, CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `X-Content-Type-Options`. | `Caddyfile`, `frontend/nginx.conf` | Add a `header` block in Caddy |
| M5 | Visitor-supplied text goes into admin alert emails unescaped (vendor company name, document name, event registrant name), so it can inject links or markup into the team's inbox. The enquiry form already escapes correctly. | `vendor_platform_auth.py:62`, `vendor_documents.py`, `events.py:90` | `html.escape()` every interpolated value, as `enquiries.py` does |
| M6 | No automated database backups; `DEPLOY.md` documents a manual `pg_dump` only. | `docker-compose.yml` | Nightly `pg_dump` to Object Storage with retention, plus a tested restore |

## ⚪ Low / hygiene

- **Reset tokens are stored in plain text** (`backend/app/routers/auth.py:49`, vendor equivalent). Store a hash.
- **Event capacity race:** count-then-insert (`events.py:71`) can overbook under concurrent registrations. Lock the row or use a constraint.
- **SVG uploads are allowed** (`storage.py:12`). They're served from the bucket's own domain, which limits the impact, but rasterise or drop them.
- **No migrations framework:** schema changes are hand-written `ALTER TABLE`s in `database.py:24`, and `init_db()` runs twice (`main.py:34,48`). Adopt Alembic before the schema grows further.
- **No backend tests and no CI.** The only automated tests are the Playwright suite for the ecosystem map (`frontend/tests/`).
- **Build artifact committed:** `frontend/dist.zip` (1.9 MB) is tracked in git.
- **Docs drift:** the README still describes SQLite as the backend database; production uses Postgres. The backend has no container healthcheck.

---

## What's already solid

- bcrypt password hashing; minimum 8-character passwords on create and reset.
- Admin and vendor JWTs are distinguished by `scope`, so one can't be used as the other.
- Vendors are correctly scoped to their own invoices, documents and notifications (checked across `invoices.py`, `vendor_documents.py`, `vendor_notifications.py`).
- Forgot-password responds identically whether or not the email exists.
- Role checks (`require_role`) on vendor-platform approvals, payments, settings and audit-log clearing.
- The enquiry form HTML-escapes everything it emails.
- Postgres is internal to the Docker network; `/api` is same-origin through nginx (no CORS surface); Caddy issues and renews HTTPS certificates automatically.
- No secrets committed to git (scanned tracked files for keys, private keys and hard-coded passwords).
- Frontend dependencies: 0 known vulnerabilities.

## Recommended order

1. **Before launch:** C1, C2, C3 (each a few lines), plus H4's URL allow-list.
2. **Launch week:** H1 rate limits, M4 security headers, M6 backups, H3 dependency bumps.
3. **Next:** H2 private documents, M2 analytics accuracy, M5 email escaping, M1 streaming uploads.
4. **Ongoing:** M3 cookie sessions, Alembic migrations, backend tests and CI.

## Evidence

C1–C3 were reproduced by running the real backend (FastAPI `TestClient`,
throwaway SQLite database, `JWT_SECRET` blank as compose would pass it):

```
1) JWT secret in use when JWT_SECRET is blank: ''
2) vendor login with code only, no password -> 200 token issued: True
3) Viewer creates a Super Admin -> 201 Super Admin
```

Dependency scans: `npm audit --omit=dev` → 0 vulnerabilities;
`pip-audit` on `backend/requirements.txt` (with FastAPI's pinned Starlette) →
advisories in `pyjwt`, `python-multipart` and `starlette` as listed in H3.
