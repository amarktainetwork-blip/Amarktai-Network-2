# Amarktai Network

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-16
- **PR Number:** #118 follow-up on `integration/cline-source-of-truth`
- **Purpose:** Recover dashboard execution and complete provider runtime
  discovery without changing the final Brain architecture.
- **Completed:** Added the dynamic model-metadata/provider-contract evidence
  ladder, task-filtered Hugging Face discovery, current Together native
  adapters, canonical dashboard planning, dynamic provider diagnostics, Brain
  media polling recovery for async provider jobs, and a GitHub-tracked GenX
  static runtime catalog fallback when live GenX model discovery fails.
- **Working:** The canonical Brain, provider truth, jobs, artifacts, policy,
  signed connected-app entry, six-provider boundary, dashboard build, full PR
  #118 repository test suite, external Brain polling by local media job id, and
  GenX discovery candidates from the existing runtime catalog when
  `/api/v1/models` is unavailable.
- **Partial:** Live provider execution proof, token-level streaming, research,
  long-form composition, avatar, music, advanced MiMo voice/omni families, and
  the 2026-06-16 VPS smoke proof for GenX image artifact completion.
- **Broken At Start:** OpenAI-compatible catalogs that returned model IDs
  without task tags produced empty route candidates. Studio also preselected
  from an obsolete static route layer and passed rejected overrides. External
  media-job polling returned Unauthorized before the 2026-06-16 follow-up.
  VPS-local GenX discovery fallback existed outside GitHub until this follow-up.
- **Proof:** TypeScript passed; 40 suites and 496 tests passed; production build
  passed with 183 pages in PR #118. The VPS transcript proves the focused media
  contract test and build passed before the GenX fallback was moved into
  GitHub. The fallback commit still requires VPS test/build proof, and public
  smoke is blocked until the correct web process is restarted instead of the
  missing `amarktai-web.service` unit.
- **Next Step:** Preserve dirty VPS provider/orchestrator changes, pull the
  branch, identify the correct web process, restart it, start a GenX image job,
  poll the returned Brain `pollUrl`, and confirm completed artifact/media
  output.

**The AI Ecosystem** — A cinematic, premium technology platform built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Animation | Framer Motion |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Auth | iron-session + bcryptjs |
| UI Components | Lucide React, Recharts |
| Runtime | Node.js 20+ |

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/amarktai_network"
SESSION_SECRET="your-super-secret-session-key-min-32-chars-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Bootstrap Admin User

```bash
# Create initial admin account via Prisma seed or direct DB
npx ts-node prisma/seed.ts
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
npm run start
```

---

## Project Structure

```
amarktai-network/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # DB seed script
├── src/
│   ├── app/
│   │   ├── (pages)/        # Public pages
│   │   ├── admin/          # Admin dashboard + login
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Global styles + design tokens
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── layout/         # Header, Footer
│   │   └── ui/             # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts         # Admin auth helpers
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── session.ts      # iron-session config
│   │   └── utils.ts        # Utilities
│   └── middleware.ts       # Route protection
├── .env.example
├── deploy.sh               # Production deploy script
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Site Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/about` | Company story & values |
| `/apps` | Ecosystem showcase |
| `/contact` | Contact + waitlist forms |
| `/admin/login` | Admin gateway (hidden) |
| `/admin/dashboard` | Main overview |
| `/admin/dashboard/products` | Manage products |
| `/admin/dashboard/api-keys` | API key management |
| `/admin/dashboard/integrations` | App integrations |
| `/admin/dashboard/vps` | VPS monitoring |
| `/admin/dashboard/contacts` | Contact submissions |
| `/admin/dashboard/waitlist` | Waitlist entries |

---

## Hidden Admin Discovery Flow

The public site includes a **hidden admin reveal interaction**.

To discover the admin access path:
1. Navigate to any public page (Home, About, Apps, Contact)
2. Type `show admin` anywhere (not in a form input)
3. A reveal notification appears in the UI
4. Click "Proceed to secure login" or click the Admin link in the nav

This triggers the admin login page at `/admin/login`.

**Security note:** The admin login is password-gated via server-side session authentication. No secrets are exposed in frontend code.

---

## VPS Deployment

### Prerequisites

- Ubuntu 22.04+ VPS
- Node.js 20+
- PostgreSQL 15+
- PM2 (`npm install -g pm2`)
- Nginx

### Deploy Steps

```bash
# 1. Clone repo
git clone https://github.com/your-org/amarktai-network /var/www/amarktai-network
cd /var/www/amarktai-network

# 2. Set environment
cp .env.example .env
nano .env  # fill in DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_APP_URL

# 3. Install & build
npm ci
npx prisma generate
npx prisma migrate deploy  # or: npx prisma db push
npm run build

# 4. Start with PM2
pm2 start npm --name "amarktai-network" -- start
pm2 save
pm2 startup

# 5. Configure Nginx (see below)
```

### Live Domains (Single Source of Truth)

This VPS hosts exactly three live domains:

| Domain | App | Port |
|---|---|---|
| `amarktai.com` | AmarktAI Network (Next.js) | 3000 |
| `marketing.amarktai.com` | Marketing app | 3001 |
| `travel.amarktai.com` | Travel app | 3002 |

**Canonical Nginx configs** are in `nginx/sites-available/`.  No other subdomains
(e.g. `faith-haven.amarktai.com`) should be active.

### Nginx Setup

```bash
# 1. Copy configs to Nginx
sudo cp nginx/sites-available/amarktai.com           /etc/nginx/sites-available/
sudo cp nginx/sites-available/marketing.amarktai.com /etc/nginx/sites-available/
sudo cp nginx/sites-available/travel.amarktai.com    /etc/nginx/sites-available/

# 2. Enable the three live domains
sudo ln -sf /etc/nginx/sites-available/amarktai.com           /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/marketing.amarktai.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/travel.amarktai.com    /etc/nginx/sites-enabled/

# 3. Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

Or use the automated cleanup script (see below).

### Nginx amarktai.com config (summary)

```nginx
# HTTP → HTTPS
server {
    listen 80;
    server_name amarktai.com www.amarktai.com;
    return 301 https://amarktai.com$request_uri;
}

# HTTPS → Next.js app on port 3000
server {
    listen 443 ssl;
    server_name amarktai.com www.amarktai.com;
    ssl_certificate     /etc/letsencrypt/live/amarktai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amarktai.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Issue SSL certificates with Certbot (run once per domain):

```bash
certbot --nginx -d amarktai.com -d www.amarktai.com
certbot --nginx -d marketing.amarktai.com
certbot --nginx -d travel.amarktai.com
```

### VPS Cleanup / Audit

Two helper scripts are included in `scripts/`:

```bash
# Audit only — no changes made
sudo bash scripts/nginx-audit.sh

# Apply cleanup: disable stale configs, install canonical configs, reload Nginx
sudo bash scripts/vps-cleanup.sh

# Dry-run: preview what vps-cleanup.sh would do without applying it
sudo bash scripts/vps-cleanup.sh --dry-run
```

`vps-cleanup.sh` will:
1. Back up the current `/etc/nginx/sites-enabled/` and `sites-available/`
2. Disable any configs not in the three live domains (e.g. `faith-haven.amarktai.com`)
3. Copy canonical configs from `nginx/sites-available/` and symlink them
4. Remove the default Nginx placeholder if present
5. Run `nginx -t` — rolls back and aborts if it fails
6. Reload Nginx

### Redeploy

```bash
cd /var/www/amarktai-network
bash deploy.sh
```

---

## Admin Login

The admin login at `/admin/login` uses a three-tier credential fallback:

1. **Database** — a hashed `adminUser` row created via `npx ts-node prisma/seed.ts`
2. **Environment variables** — `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env`
3. **Hardcoded hash** — last-resort fallback (change in production)

If login returns "Invalid credentials":
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set correctly in `/var/www/amarktai-network/.env`
- Or seed a DB admin user: `npx ts-node prisma/seed.ts`
- Default fallback email is `admin@amarktai.com`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Min 32-char secret for iron-session |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of the app |
| `ADMIN_EMAIL` | ✅ (prod) | Admin login email (defaults to `admin@amarktai.com`) |
| `ADMIN_PASSWORD` | ✅ (prod) | Admin login password fallback when no DB user exists |

---

## Database Setup

```bash
# Push schema (dev / first deploy)
npm run db:push

# Run migrations (production with migration history)
npx prisma migrate deploy

# Open Prisma Studio (dev only)
npm run db:studio
```

---

## Post-Deploy Checks

- [ ] Site loads at public URL
- [ ] Contact form submits successfully
- [ ] Waitlist form submits successfully
- [ ] Admin login works at `/admin/login`
- [ ] Dashboard loads after login
- [ ] Session persists correctly
- [ ] Hidden `show admin` reveal works on public pages
- [ ] SSL certificate active
- [ ] PM2 process auto-restarts on reboot

---

## Deployment Notes — Redis, Qdrant & Memory Layer

The Amarktai Network memory and emotion systems have three storage tiers:

| Tier | Technology | Purpose | Required? |
|------|-----------|---------|-----------|
| Primary | PostgreSQL (`Memory` table) | Persistent long-term memory | ✅ Always |
| Cache | Redis | Short-term session cache, emotion profiles, rate-limit counters | ⚠️ Recommended |
| Vector | Qdrant | Semantic similarity search, emotion vectors | ⚠️ Recommended |

### Docker / VPS (Recommended)

`docker-compose.yml` includes PostgreSQL 16 + Redis 7 + Qdrant — all three tiers work automatically:

```bash
docker compose up -d
```

### Vercel / Serverless

Redis and Qdrant are **not** available on Vercel's default infrastructure. Without them:

- Memory retrieval degrades to **Postgres-only** full-text search (slower, lower recall)
- Emotion profiles are stored in Postgres instead of Redis (no TTL expiry)
- Semantic similarity search is disabled

**To restore full functionality on Vercel**, add external services and set these env vars:

```env
REDIS_URL=redis://...          # e.g. Upstash Redis
QDRANT_URL=https://...         # e.g. Qdrant Cloud
QDRANT_API_KEY=...
```

### Provider Health Scheduling

Provider health is refreshed:
- **On demand**: Admin dashboard → AI Providers → individual health check
- **Bulk refresh**: `POST /api/admin/providers/health-check-all` (admin session or `Bearer $CRON_SECRET`)
- **Automated (recommended)**: Set a cron job / Vercel Cron to call this endpoint every 15 minutes:

```
# crontab (VPS)
*/15 * * * * curl -s -X POST https://your-domain.com/api/admin/providers/health-check-all \
  -H "Authorization: Bearer $CRON_SECRET"
```

```json
// vercel.json (Vercel Cron)
{
  "crons": [{
    "path": "/api/admin/providers/health-check-all",
    "schedule": "*/15 * * * *"
  }]
}
```

---

## Apps in the Ecosystem

| App | Status |
|---|---|
| EquiProfile | Live |
| Amarktai Marketing | In Development |
| Amarktai Crypto | Invite Only |
| Amarktai Forex | Invite Only |
| Amarktai Family | In Development |
| Faith Haven | In Development |
| Learn Digital | In Development |
| Jobs SA | In Development |
| Amarktai Secure | Concept |
| Crowd Lens | Concept |

---

## AI Operating Rules

All future AI work must:

1. Update [`docs/CHANGELOG_AI.md`](docs/CHANGELOG_AI.md).
2. Update [`docs/PROVIDER_MATRIX.md`](docs/PROVIDER_MATRIX.md) when provider
   capabilities change.
3. Update [`docs/OPERATING_TRUTH.md`](docs/OPERATING_TRUTH.md) when architecture
   changes.
4. Never hardcode providers, models, or capabilities as universal routing
   policy.
5. Treat GitHub as the only source of truth.

Apps never call AI providers directly. The required execution path is:

```text
APP
  -> BRAIN
  -> CAPABILITY
  -> ROUTER
  -> PROVIDER
  -> ARTIFACT
  -> APP
```

Async media jobs returned by the Brain must expose a Brain `pollUrl` and a local
Brain `jobId`. Apps must poll the Brain URL, not raw provider job endpoints.
GenX discovery uses live `/api/v1/models` first and may fall back to the
existing runtime catalog as provider-contract evidence if live discovery fails;
that fallback creates routing candidates only, not execution proof.

Read [`docs/CODEX_CONTEXT.md`](docs/CODEX_CONTEXT.md) first when starting a new
AI implementation session.

---

## License

Proprietary — Amarktai Network © 2025. All rights reserved.
