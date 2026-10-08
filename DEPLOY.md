# Deploying to the Contabo VPS

Everything runs as four Docker containers: Postgres, the FastAPI backend, an
nginx container serving the built frontend (and reverse-proxying `/api` to
the backend, same-origin — no CORS to configure), and Caddy in front of all
of it handling HTTPS automatically. This whole stack was built and verified
locally against Postgres, Docker, and the reverse-proxy chain before being
handed off — `docker compose up -d` is genuinely all that's left to run.

The vendor registration/management platform (vendor self-registration,
invoices, documents, admin vendor tools) is merged into this same app — it
isn't a separate deployment. The one difference: the vendor-facing portal is
served on its own subdomain (`vendors.<yourdomain>`), routed by Caddy to the
same frontend/backend containers — see step 1 and the Caddyfile.

## 1) One-time VPS setup

SSH into the VPS and install Docker + Compose (skip if already installed):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

Point **two** DNS A records at the VPS's IP address before starting the
stack — Caddy requests a Let's Encrypt certificate for each hostname on
first boot, and that fails (and can eat into Let's Encrypt's per-hostname
rate limit if retried repeatedly) without DNS already resolving:

| Record | Points to |
|---|---|
| `onctionenergy.com` (+ `www`) | VPS IP — the main site/admin dashboard |
| `vendors.onctionenergy.com` | Same VPS IP — the vendor portal |

Verify both resolve *before* starting Caddy: `dig +short vendors.onctionenergy.com`
should print the VPS's IP, from a machine outside the VPS itself.

## 2) Get the code onto the VPS

```bash
git clone <your-repo-url> onction-energy
cd onction-energy
```

## 3) Configure

```bash
cp .env.example .env
```

Fill in `.env`:

| Var | Where it comes from |
|---|---|
| `POSTGRES_PASSWORD` | Make one up — it's internal to the Docker network, never exposed |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Your first dashboard login — change the password after first sign-in |
| `S3_ENDPOINT_URL` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | From your Contabo Object Storage account (see below) |
| `S3_PUBLIC_BASE_URL` | Leave blank to serve directly from the bucket's own endpoint, or set once you put a CDN/domain in front of it |
| `PUBLIC_SITE_URL` | `https://onctionenergy.com` — used to build links in main-site emails |
| `VENDOR_PORTAL_URL` | `https://vendors.onctionenergy.com` — used to build links in vendor-portal emails (password reset). Wrong value here means those email links 404. |

Edit **`Caddyfile`** — it already has two site blocks, one per domain (main
site + vendor portal). Replace `onctionenergy.com`, `www.onctionenergy.com`,
and `vendors.onctionenergy.com` with your real domain(s) in both blocks;
both simply reverse-proxy to the same `frontend` container, since the
frontend's React Router switches between the marketing site/admin and the
vendor portal based on hostname (see `frontend/src/main.jsx`) — no separate
build or container needed for the subdomain.

## 4) Contabo Object Storage — what to set up

1. In the Contabo customer control panel, create an **Object Storage**
   instance if you don't have one, and create a bucket for this site's
   media (e.g. `onction-media`).
2. Generate an S3 access key + secret for that bucket.
3. Set the bucket's public-read policy for the `uploads/` prefix (the app
   uploads with `ACL: public-read` per object, but some Contabo bucket
   configurations also require a bucket policy — check the control panel's
   "public access" toggle for the bucket).
4. Note your region's S3 endpoint (shown in the control panel, looks like
   `https://usc1.contabostorage.com`) — that's `S3_ENDPOINT_URL`.

## 5) Email (SMTP) — registrations, invoices, newsletters, admin alerts

Decision made: sending through your existing **cPanel/hosting-provided email
account**, not a dedicated mail server or third-party ESP. Here's where to
find the credentials and what to put in `.env`.

### Finding the credentials in cPanel

1. Log into cPanel (your host gives you a URL, often `yourdomain.com/cpanel`
   or `yourdomain.com:2083`, or access it via your hosting provider's
   client portal).
2. Open **Email Accounts**.
3. If the sending address doesn't exist yet, create one — e.g.
   `no-reply@onctionenergy.com` — and set a password for it (this password
   *is* `SMTP_PASSWORD`; if you don't remember it, use "Manage" → "Change
   Password" on that account, it doesn't need to match any human's inbox
   password).
4. Click **Connect Devices** (or "Manage") next to that account — cPanel
   shows the exact outgoing mail server settings for your hosting account:
   - **Outgoing server / SMTP host** — often `mail.onctionenergy.com`, or a
     shared hostname like `server123.yourhost.com` (varies by host)
   - **Port** — cPanel usually lists both `465` (SSL) and `587`
     (TLS/STARTTLS) as options; either works with this app
   - **Username** — the full email address, e.g. `no-reply@onctionenergy.com`
   - **Password** — the one you set in step 3

### Set these in `.env`

```
SMTP_HOST=mail.onctionenergy.com        # from cPanel's "Connect Devices" page
SMTP_PORT=465                           # or 587 — match what you use below
SMTP_USER=no-reply@onctionenergy.com
SMTP_PASSWORD=<the mailbox password>
SMTP_FROM_EMAIL=no-reply@onctionenergy.com
SMTP_FROM_NAME=Onction Energy
ALERT_EMAIL=admin@onctionenergy.com     # where "new vendor" / "new enquiry" alerts go
```

`SMTP_USE_TLS` doesn't need setting for port 465 — the app auto-detects that
port and uses implicit TLS; STARTTLS is used for anything else (587, etc.).

### A few things to know

- **Add SPF and DKIM records** for the sending domain if you haven't — most
  inboxes spam-box or reject mail without them, especially bulk newsletter
  sends. cPanel's **Email Deliverability** page will tell you if these are
  missing and give you the exact DNS record values to add.
- A shared-hosting mailbox is usually fine for the low-volume transactional
  emails this app sends (registration/invoice/status notices), but bulk
  newsletter campaigns are more likely to get rate-limited or flagged by
  cPanel hosts. If that becomes a problem, switching to Amazon SES's or
  SendGrid's SMTP relay is a `.env`-only change — no code changes, since the
  app only ever speaks plain SMTP.
- Until SMTP is configured, these emails fail silently (logged as a
  warning, never break the request that triggered them) — vendor
  registration/invoice actions and admin alerts just won't send. Sending a
  newsletter campaign, on the other hand, returns a clear "not configured"
  error rather than pretending to send.

## 6) Bring the stack up

```bash
docker compose up -d --build
docker compose run --rm backend python -m app.seed   # creates the first admin login
```

The first admin created this way gets the **Super Admin** role (full
access, including clearing the vendor-platform audit log). Anyone else you
add later from the Team page can be Admin, Super Admin, or Viewer.

Check everything's healthy:

```bash
docker compose ps
docker compose logs -f caddy     # watch certificate issuance on first boot — should show
                                  # "certificate obtained successfully" for both domains
```

## 7) Test the deployment

Do this once, right after first boot, to confirm both the main site/admin
and the merged vendor platform actually work end to end — not just that
containers are "Up".

**Main site + admin**
1. Visit `https://onctionenergy.com` — the marketing site loads.
2. Visit `https://onctionenergy.com/admin/login`, sign in with
   `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Confirm the dashboard loads with no
   console errors.
3. Submit the public contact form once — confirm it appears under
   **Enquiries**, and (if SMTP is configured) that `ALERT_EMAIL` receives a
   notification.

**Vendor platform — admin side**
4. In the dashboard sidebar, under **Vendor Platform** → **Vendors**, click
   **+ Add vendor**, create one with a real email address you can check.
   Confirm it appears in the list with an auto-generated vendor code
   (`OSL-2026-...`).
5. Open that vendor's profile, change status to **Approved** — confirm (a)
   the change saves, and (b) if SMTP is configured, the vendor's email
   address receives an approval notice.
6. Go to **Services**, add one test service.
7. Go to **Invoices** → **+ New invoice**, create one against the vendor
   from step 4. Approve it, then record a payment. Confirm the vendor
   receives an email at each step (submitted → approved → paid) if SMTP is
   configured.
8. Go to **Documents**, upload a test file against that vendor, approve it,
   confirm the download link works (proves S3/object storage is wired up
   correctly — a 503 here means `S3_*` env vars are missing/wrong).
9. Go to **Audit Log** — confirm every action above shows up. Try **Clear
   log** with a non-Super-Admin account and confirm it's blocked (403).
10. Go to **Vendor Settings**, confirm the currency/prefix values save.

**Vendor platform — public portal**
11. Visit `https://vendors.onctionenergy.com/register` (note: different
    hostname from the main site) and self-register as a new test vendor.
    Confirm you land on a page showing a vendor code, and (if SMTP is
    configured) receive a registration confirmation email.
12. Confirm that new registration shows up as **Pending Review** under
    **Vendors** in the admin dashboard, with an admin alert email sent (if
    SMTP is configured).
13. Go to `https://vendors.onctionenergy.com/login`, log in with the vendor
    code and password from step 11. Confirm a wrong password is refused, and
    that the code alone never signs in. (Vendors added from the admin side have
    no password until they use **Forgot password**, which needs SMTP.)
14. From the admin side, approve that vendor. Back in the vendor portal,
    confirm the dashboard reflects **Approved** status and invoices can now
    be submitted.
15. As that vendor, submit an invoice and upload a document. Confirm both
    appear correctly on the admin side (Invoices / Documents pages).
16. Test **Forgot password** from `/vendor/login` — confirm the emailed
    link points at `vendors.onctionenergy.com/reset-password` (not
    `onctionenergy.com/vendor/reset-password` — if it's the latter,
    `VENDOR_PORTAL_URL` isn't set correctly in `.env`).

If SMTP isn't configured yet, everything above should still work except the
emails — check `docker compose logs backend` for `Email send failed to ...`
warnings rather than a broken request.

## Day-to-day operations

| Task | Command |
|---|---|
| Deploy new code | `git pull && docker compose up -d --build` |
| View logs | `docker compose logs -f backend` (or `frontend`, `db`, `caddy`) |
| Database shell | `docker compose exec db psql -U onction` |
| Back up the database | `docker compose exec db pg_dump -U onction onction > backup.sql` |
| Restart just the backend | `docker compose restart backend` **then** `docker compose restart frontend` — nginx resolves the `backend` hostname once at startup and caches it, so a backend-only restart without also restarting frontend causes a `502` until frontend is restarted too |

## Still open

- **Contabo Object Storage credentials** (endpoint, access key, secret,
  bucket name) — needed for both site media and vendor document uploads;
  without them, uploads fail with a clear 503 rather than silently.
- Confirm the **admin email/password** you want for the first dashboard
  login.
