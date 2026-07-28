# Deploying DreamHome ERP to Hostinger

Target layout (confirmed):

| App | Domain | Purpose |
|---|---|---|
| `apps/website` | `dreamhomebengaluru.com` | Public marketing site |
| `apps/web` | `erp.dreamhomebengaluru.com` | Internal ERP/CRM dashboard (auth-gated) |
| `apps/api` | `api.dreamhomebengaluru.com` | NestJS backend |

Hostinger's shared/Business/Cloud plans don't give root/Docker access, so each app runs as
its own hPanel **"Setup Node.js App"** process (Passenger-managed — it supervises the
process for you, no PM2/systemd needed). SSH access is available for file transfer and
one-off commands (migrations, seeding).

## 1. Database

Hostinger's shared/Business/Cloud plans typically only provision **MySQL**, not
PostgreSQL, through hPanel — and this schema relies on Postgres-only features (`String[]`
array columns like `User.permissions`, `Product.images`), so migrating to MySQL would be a
real rewrite, not a config change. Instead:

1. Create a free/paid Postgres database with a managed provider (e.g. [Neon](https://neon.tech) —
   generous free tier, automatic backups, works over plain `DATABASE_URL`).
2. Copy its connection string — this becomes `DATABASE_URL` for `apps/api`.
3. (If you'd prefer to check first: hPanel → Databases — if PostgreSQL genuinely is offered
   on your plan, you can use that instead. No schema/code changes either way, just a
   different host in `DATABASE_URL`.)

## 2. DNS

In hPanel → Domains, for `dreamhomebengaluru.com`:
- Root domain → already presumably pointed at Hostinger.
- Add subdomains `erp` and `api` (hPanel → Domains → Subdomains).

## 3. Build production artifacts (GitLab CI)

Prisma's query engine binary is platform-specific — building on a Windows/Mac dev machine
and uploading to Hostinger's Linux server can silently produce a broken `apps/api` package.
The repo's `.gitlab-ci.yml` builds on this project's registered Linux runner instead:

1. GitLab → this project → **CI/CD → Pipelines**.
2. Find the pipeline for the commit you want to ship (or **Run pipeline** to start a fresh
   one on `main`), then manually run the `deploy_artifacts` job (stage: `package`) — it's
   `when: manual`, so it never runs on an ordinary push.
3. When it finishes, open the job → **Browse** (or download) its artifacts under
   `dist-package/api`, `dist-package/web`, `dist-package/website`.
4. `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL` are hardcoded in `.gitlab-ci.yml`'s
   `deploy_artifacts.variables` to the real production URLs above — edit that file if the
   domain ever changes.

Each artifact is a self-contained folder — no `pnpm install` needs to run on Hostinger.

## 4. Upload to Hostinger

Unzip the three downloaded artifacts locally, then upload each to its own directory over
SSH/SFTP (adjust remote paths to your actual hPanel-assigned app directories):

```bash
scp -P 65002 -r dreamhome-api/*     u107969203@<host>:~/apps/api/
scp -P 65002 -r dreamhome-web/*     u107969203@<host>:~/apps/erp/
scp -P 65002 -r dreamhome-website/* u107969203@<host>:~/apps/website/
```

(hPanel's File Manager works too for smaller transfers, but SSH/SFTP is far faster for the
`node_modules` inside each artifact.)

## 5. Configure each app in hPanel → Setup Node.js App

For all three: Node.js version **20** (must be ≥ the `engines.node` requirement in the
root `package.json` — confirm 20+ is offered in Hostinger's version dropdown).

| App | App root | Startup file | Domain |
|---|---|---|---|
| api | `~/apps/api` | `dist/main.js` | `api.dreamhomebengaluru.com` |
| web | `~/apps/erp` | `apps/web/server.js` | `erp.dreamhomebengaluru.com` |
| website | `~/apps/website` | `apps/website/server.js` | `dreamhomebengaluru.com` |

(`web`/`website`'s startup file path is nested because Next's `standalone` output mirrors
the monorepo path — this was verified against a real local build, not assumed.)

### Environment variables (set via hPanel's Node.js App env var UI — never commit these)

**apps/api:**
```
NODE_ENV=production
DATABASE_URL=<your Neon/Postgres connection string>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRES_IN_SECONDS=900
JWT_REFRESH_EXPIRES_IN_SECONDS=604800
INTEGRATIONS_ENCRYPTION_KEY=<openssl rand -hex 32 — must be exactly 64 hex chars>
PORT=3001
CORS_ALLOWED_ORIGINS=https://dreamhomebengaluru.com,https://erp.dreamhomebengaluru.com
```
Generate each secret freshly for production — do not reuse local dev values. The app now
validates all of these at boot and refuses to start if any are missing/malformed.

**apps/web:**
```
NEXT_PUBLIC_API_URL=https://api.dreamhomebengaluru.com
PORT=3000
```

**apps/website:**
```
NEXT_PUBLIC_API_URL=https://api.dreamhomebengaluru.com
NEXT_PUBLIC_SITE_URL=https://dreamhomebengaluru.com
PORT=3002
```

## 6. Run migrations and seed (once, via SSH)

```bash
ssh -p 65002 u107969203@<host>
cd ~/apps/api
# Uses DATABASE_URL from the environment configured in hPanel for this app, or export it
# manually for this one-off shell command if hPanel doesn't inject it into SSH sessions.
NODE_ENV=production ADMIN_EMAIL="admin@dreamhomebengaluru.com" ADMIN_PASSWORD="<a real strong password>" \
  npx prisma migrate deploy
NODE_ENV=production ADMIN_EMAIL="admin@dreamhomebengaluru.com" ADMIN_PASSWORD="<a real strong password>" \
  npx prisma db seed
```

`prisma db seed` now **refuses to run** in production without `ADMIN_PASSWORD` set — it no
longer silently creates the well-known `admin123` default.

## 7. SSL

hPanel → SSL → enable the free Let's Encrypt certificate for each of the three (sub)domains.

## 8. First login

1. Visit `https://erp.dreamhomebengaluru.com/login`, sign in with the `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` used in step 6.
2. Immediately go to Profile and change the password to something only you know — the value
   used during seeding may have passed through shell history/hPanel logs.

## 9. Verify

- `curl https://api.dreamhomebengaluru.com/health` → `{"status":"ok"}` (this now checks
  real DB connectivity, not just "process is alive").
- Load `https://dreamhomebengaluru.com` — public product catalog renders.
- Log into `https://erp.dreamhomebengaluru.com` and confirm a dashboard page loads.
- From a browser console on a *different* origin, confirm a fetch to the API is blocked by
  CORS — confirms `CORS_ALLOWED_ORIGINS` is actually restricting access.

## Redeploying later

Re-run the `deploy_artifacts` GitLab CI job, re-download the three artifacts, re-upload (steps 3–4),
then restart each app from hPanel's Node.js App page — no migration/seed re-run needed
unless the Prisma schema changed (in which case: `npx prisma migrate deploy` again, seeding
is safe to skip since it no longer overwrites an existing admin's password).
