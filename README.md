# Amarktai Network

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-16
- **PR Number:** #118 follow-up on `integration/cline-source-of-truth`
- **Purpose:** Recover dashboard execution and complete provider runtime
  discovery without changing the final Brain architecture.
- **Completed:** Added the dynamic model-metadata/provider-contract evidence
  ladder, task-filtered Hugging Face discovery, current Together native
  adapters, canonical dashboard planning, dynamic provider diagnostics, Brain
  media polling recovery for async provider jobs, GitHub-tracked GenX static
  runtime catalog fallback when live GenX model discovery fails, and GenX
  fallback routing through degraded discovery-health.
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
  VPS-local GenX discovery fallback existed outside GitHub until this follow-up;
  VPS proof then exposed that degraded discovery-health could suppress the
  explicit GenX fallback route.
- **Proof:** TypeScript passed; 40 suites and 496 tests passed; production build
  passed with 183 pages in PR #118. VPS proof on 2026-06-16 confirmed install,
  Prisma generation, TypeScript, focused media contract tests, production
  build, local site health, and API health. GenX image failed with
  `NO_ROUTE_FOUND` before the degraded-health fallback routing fix; rerun VPS
  proof after pulling the latest branch.
- **Next Step:** Pull the branch, rerun the focused test and build, restart
  `amarktai-platform.service`, start a GenX image job, poll the returned Brain
  `pollUrl`, and confirm completed artifact/media output.

**The AI Ecosystem** — A cinematic, premium technology platform built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

## Current Operating Truth

- Source-of-truth branch: `integration/cline-source-of-truth`
- Runtime deploy target: `/var/www/amarktai/platform`
- Runtime services: `amarktai-platform.service` and
  `amarktai-worker.service`
- Database truth: MariaDB/MySQL via Prisma `provider = "mysql"`
- Public V1 domain truth: `amarktai.co.za` with `www.amarktai.co.za` as the
  public alias
- Standalone deploy truth: `.next/static` and `public` must be copied into
  `.next/standalone`
- Dashboard rule: the dashboard reflects Brain runtime truth; it is not the
  source of truth
- GenX image remains incomplete until a Brain image job returns a Brain
  `pollUrl`, that `pollUrl` completes, and a canonical artifact persists

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Animation | Framer Motion |
| Database ORM | Prisma |
| Database | MariaDB / MySQL |
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
DATABASE_URL="mysql://amarktai:STRONG_PASSWORD@127.0.0.1:3306/amarktai"
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
node .next/standalone/server.js
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
├── scripts/                # Deploy and proof scripts
├── deploy/                 # Nginx and systemd files
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
| `/platform` | Public platform overview |
| `/contact` | Contact + waitlist forms |
| `/admin/login` | Admin gateway (hidden) |
| `/admin/dashboard/command` | Command Center |
| `/admin/dashboard/studio` | Studio |
| `/admin/dashboard/connected-apps` | Connected Apps |
| `/admin/dashboard/artifacts` | Artifacts |
| `/admin/dashboard/jobs` | Jobs |
| `/admin/dashboard/settings` | Settings |

---

## Hidden Admin Discovery Flow

The public site includes a **hidden admin reveal interaction**.

To discover the admin access path:
1. Navigate to any public page (Home, About, Platform, Contact)
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
- MariaDB / MySQL
- Nginx

### Deploy Steps

```bash
# 1. Work from the source-of-truth branch in the VPS target directory
git checkout integration/cline-source-of-truth
cd /var/www/amarktai/platform

# 2. Set environment
cp .env.example .env

# 3. Install & build
npm ci
npx prisma generate
npx prisma validate
npx prisma db push
npm run build

# 4. Copy standalone assets
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public

# 5. Restart runtime services
sudo systemctl restart amarktai-platform.service
sudo systemctl restart amarktai-worker.service
```

### Live Domains (Single Source of Truth)

The current V1 public domain truth is:

| Domain | Role |
|---|---|
| `amarktai.co.za` | Main platform |
| `www.amarktai.co.za` | Public alias for the main platform |

### Nginx Setup

Use `deploy/nginx.conf` as the current repository nginx source of truth.

### Redeploy

```bash
cd /var/www/amarktai/platform
bash scripts/deploy.sh
```

---

## Admin Login

The admin login at `/admin/login` uses a three-tier credential fallback:

1. **Database** — a hashed `adminUser` row created via `npx ts-node prisma/seed.ts`
2. **Environment variables** — `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env`
3. **Hardcoded hash** — last-resort fallback (change in production)

If login returns "Invalid credentials":
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set correctly in `/var/www/amarktai/platform/.env`
- Or seed a DB admin user: `npx ts-node prisma/seed.ts`
- Default fallback email is `admin@amarktai.com`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MariaDB / MySQL connection string |
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
- [ ] `amarktai-platform.service` is active
- [ ] `amarktai-worker.service` is active
- [ ] `/_next/static/...` loads from the standalone deployment
- [ ] GenX image Brain `pollUrl` completes and persists a canonical artifact

---

## Deployment Notes — Redis, Qdrant & Memory Layer

The Amarktai Network memory and emotion systems have three storage tiers:

| Tier | Technology | Purpose | Required? |
|------|-----------|---------|-----------|
| Primary | MariaDB / MySQL (`Memory` table) | Persistent long-term memory | ✅ Always |
| Cache | Redis | Short-term session cache, emotion profiles, rate-limit counters | ⚠️ Recommended |
| Vector | Qdrant | Semantic similarity search, emotion vectors | ⚠️ Recommended |

### Docker / VPS (Recommended)

Current V1 operator truth uses MariaDB / MySQL for the application database.
The checked-in `docker-compose.yml` is not the current V1 database truth.

```bash
docker compose up -d
```

### Vercel / Serverless

Redis and Qdrant are **not** available on Vercel's default infrastructure. Without them:

- Memory retrieval degrades to database-only full-text search (slower, lower recall)
- Emotion profiles are stored in the application database instead of Redis (no TTL expiry)
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
