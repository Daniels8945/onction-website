# Deploying to the Contabo VPS

Everything runs as four Docker containers: Postgres, the FastAPI backend, an
nginx container serving the built frontend (and reverse-proxying `/api` to
the backend, same-origin — no CORS to configure), and Caddy in front of all
of it handling HTTPS automatically. This whole stack was built and verified
locally against Postgres, Docker, and the reverse-proxy chain before being
handed off — `docker compose up -d` is genuinely all that's left to run.

## 1) One-time VPS setup

SSH into the VPS and install Docker + Compose (skip if already installed):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

Point your domain's DNS **A record** at the VPS's IP address before starting
the stack — Caddy requests a Let's Encrypt certificate on first boot and
that fails without DNS already resolving.

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

Edit **`Caddyfile`** and replace `onctionenergy.com, www.onctionenergy.com`
with your real domain(s).

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

## 5) Email (SMTP) — newsletters, event confirmations, admin alerts

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` in `.env`. You
chose sending straight from the Contabo VPS rather than a dedicated email
service, so a few things to know:

- **Set up a mail server on the VPS** (or a separate small VPS dedicated to
  mail — keeping it off the same box as the web app is safer for reputation)
  — e.g. Postfix, or a lightweight container like `boky/postfix`. That's
  outside this docker-compose stack since it needs its own hostname/PTR
  record setup; ask if you'd like this scripted too.
- **Add SPF, DKIM, and DMARC DNS records** for your sending domain — without
  these, most inboxes will spam-box or reject the mail outright, especially
  bulk newsletter sends. Contabo's control panel or your DNS provider can
  set these up; the mail server software will give you the exact record
  values to add.
- **A fresh VPS IP has no sending reputation.** Expect deliverability to be
  rough at first, especially for the newsletter (bulk mail is judged harder
  than transactional mail). If this becomes a real problem, the fix is
  switching `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` to Amazon SES's or
  SendGrid's SMTP relay — no code changes needed, since the app only ever
  talks plain SMTP.
- Until SMTP is configured, admin alert emails (new enquiry, new
  registration) fail silently (logged, not fatal) and sending a newsletter
  campaign returns a clear "not configured" error rather than pretending to
  send.

## 6) Bring the stack up

```bash
docker compose up -d --build
docker compose run --rm backend python -m app.seed   # creates the first admin login
```

Check everything's healthy:

```bash
docker compose ps
docker compose logs -f caddy     # watch certificate issuance on first boot
```

Visit `https://yourdomain.com/admin/login` and sign in with the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` you set. From there, add teammates under
**Team** — they don't need anything in `.env`, just an account created from
the dashboard.

## Day-to-day operations

| Task | Command |
|---|---|
| Deploy new code | `git pull && docker compose up -d --build` |
| View logs | `docker compose logs -f backend` (or `frontend`, `db`, `caddy`) |
| Database shell | `docker compose exec db psql -U onction` |
| Back up the database | `docker compose exec db pg_dump -U onction onction > backup.sql` |
| Restart just the backend | `docker compose restart backend` |

## What I still need from you

- **Domain name(s)** to put in the `Caddyfile` and point DNS at the VPS.
- **VPS access** — either SSH in yourself and run the steps above, or share
  access if you'd like this deployed for you.
- **Contabo Object Storage credentials** (endpoint, access key, secret,
  bucket name) per step 4 above.
- Confirm the **admin email/password** you want for the first dashboard
  login (or use the values you put in `.env` — you can change the password
  later, there's just no self-service "forgot password" flow yet).
- **A decision on the mail server** — do you want it on the same VPS as the
  web app, or a separate small VPS/mail-specific host (better for sender
  reputation, keeps a spam-filtered IP from also being your web server's
  IP)? Either way I'll need to set up SPF/DKIM/DMARC DNS records for
  whichever domain sends the mail.
