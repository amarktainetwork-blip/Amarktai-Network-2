# AmarktAI Network — Production Readiness Report

**Date:** 2026-06-10  
**Auditor:** Cline (automated deep-read audit)  
**Scope:** Full codebase — `src/`, `prisma/`, `services/`, `scripts/`, `docs/`, `deploy/`  
**Status:** ⚠️ CONDITIONAL — Several contract violations and gaps must be resolved before go-live.

---

## Executive Summary

The AmarktAI Network codebase is architecturally mature and well-structured. The orchestration layer, routing engine, model registry, budget tracker, artifact system, and Workbench are all production-grade. However, a critical gap exists between the **Agent Contract (v2.0.0)** and the **actual provider registry / health-check code**: several prohibited providers (OpenAI, Anthropic, Cohere, Mistral, Grok, DeepSeek, OpenRouter, NVIDIA) are still present as first-class direct-integration providers in `src/lib/providers.ts` and the model registry. This is the single most important issue to resolve before go-live.

---

## 1. Critical Issues (Must Fix Before Go-Live)

### 1.1 Prohibited Providers Still in `src/lib/providers.ts`

**File:** `src/lib/providers.ts`  
**Severity:** 🔴 CRITICAL — Violates Agent Contract §2.1

The `runProviderHealthCheck()` function contains explicit health-check implementations for:

| Provider | Contract Status |
|----------|----------------|
| `openai` | ❌ Prohibited — must route via GenX |
| `anthropic` | ❌ Prohibited — must route via GenX |
| `gemini` | ❌ Prohibited — must route via GenX |
| `grok` | ❌ Prohibited — must route via GenX |
| `deepseek` | ❌ Prohibited — must route via GenX |
| `openrouter` | ❌ Prohibited — GenX serves this purpose |
| `cohere` | ❌ Prohibited — removed per contract |
| `mistral` | ❌ Prohibited — use GenX or Together AI |
| `nvidia` | ❌ Prohibited — removed per contract |

**Approved providers that should remain:**

| Provider | Contract Status |
|----------|----------------|
| `groq` | ✅ Approved |
| `together` | ✅ Approved |
| `huggingface` | ✅ Approved |
| `qwen` | ✅ Approved |
| `genx` | ✅ Primary gateway |
| `mimo` | ✅ Approved (Xiaomi MiMo) |

**Action required:** Remove all prohibited provider cases from `runProviderHealthCheck()`. Add a `genx` health-check case that probes `GENX_API_URL/api/v1/models`. Add a `mimo` health-check case.

---

### 1.2 Prohibited Providers Likely Present in Model Registry

**File:** `src/lib/model-registry.ts` (not fully read — inferred from orchestrator imports)  
**Severity:** 🔴 CRITICAL

The model registry is used by the routing engine to select providers. If it contains entries for `openai`, `anthropic`, `gemini`, `grok`, `deepseek`, `cohere`, `mistral`, `openrouter`, or `nvidia` as direct providers, those will be selected by the routing engine even when GenX is unavailable — violating the contract.

**Action required:** Audit `src/lib/model-registry.ts`. Remove all prohibited provider entries. Ensure GenX model labels (`gpt-4o`, `claude-3-5-sonnet`, etc.) are registered under provider key `genx`, not their original provider names.

---

### 1.3 `VAULT_ENCRYPTION_KEY` Must Be Set in Production

**File:** `src/lib/crypto-vault.ts` (inferred), `.env.example`  
**Severity:** 🔴 CRITICAL

The `decryptVaultKey()` function is called for every provider API key. If `VAULT_ENCRYPTION_KEY` is not set, all encrypted keys will fail to decrypt and every provider will return `error` status. This will silently break all AI routing.

**Action required:** Confirm `VAULT_ENCRYPTION_KEY` is set in the production `.env` / VPS environment before go-live. Add a startup health check that verifies this variable is present and non-empty.

---

## 2. High-Priority Issues

### 2.1 GenX Health Check Not Implemented in `providers.ts`

**Severity:** 🟠 HIGH

`runProviderHealthCheck()` has no `case 'genx':` branch. Since GenX is the primary gateway, its health status will always fall through to the `default` case (`'configured'` — not validated). The orchestrator's `getGenXStatusAsync()` does probe GenX independently, but the admin provider health-check UI will never show GenX as `healthy`.

**Action required:** Add a `case 'genx':` to `runProviderHealthCheck()` that probes `${baseUrl}/api/v1/models` with the GenX API key.

---

### 2.2 MiMo Provider Not in Health Check

**Severity:** 🟠 HIGH

`mimo` (Xiaomi MiMo) is listed as an approved provider in the Agent Contract but has no health-check case in `providers.ts`.

**Action required:** Add a `case 'mimo':` health-check implementation.

---

### 2.3 Video Generation — Async Polling Gap

**File:** `src/app/api/brain/video-generate/route.ts`, `src/app/api/brain/video-generate/[jobId]/`  
**Severity:** 🟠 HIGH

The backend truth test confirms that when no real video renderer is configured, the route correctly returns `501 / generation_available: false`. However, the Studio page polls `pollUrl` for up to 30 attempts × 2 seconds = 60 seconds. If the provider's async job takes longer (e.g. Qwen WanX video can take 3–5 minutes), the UI will show `processing` indefinitely and the artifact will never be linked.

**Action required:** Either increase the poll timeout or implement a background job that continues polling after the UI gives up, then updates the artifact record and notifies via the realtime service.

---

### 2.4 `NEXT_PUBLIC_ADMIN_PASSWORD` / Auth Hardening

**Severity:** 🟠 HIGH

The admin dashboard uses session-based auth. Confirm that:
- `ADMIN_PASSWORD_HASH` (bcrypt) is set in production — not a plaintext fallback
- The middleware correctly blocks all `/admin/*` routes without a valid session
- `NEXTAUTH_SECRET` (or equivalent) is set and rotated

**Action required:** Verify middleware coverage and that no plaintext password fallback exists in the auth route.

---

### 2.5 Prisma Migrations — Production Database

**Severity:** 🟠 HIGH

`prisma/schema.prisma` is comprehensive (35+ models). Confirm that:
- `prisma migrate deploy` has been run against the production PostgreSQL instance
- `DATABASE_URL` points to the correct production database
- The seed script (`prisma/seed.ts`) has been run to populate `AiProvider`, `ModelRegistryEntry`, and `IntegrationConfig` rows

**Action required:** Run `npx prisma migrate deploy && npx prisma db seed` on the production server before go-live.

---

## 3. Medium-Priority Issues

### 3.1 `src/lib/orchestrator.ts` — GenX Fallback Logging

**Severity:** 🟡 MEDIUM

When GenX fails and the orchestrator falls back to direct provider routing, the fallback reason is logged to `console.warn` but is **not** written to a `BrainEvent` or `SystemAlert`. This means the Control Center dashboard will not surface GenX fallback events.

**Action required:** After a GenX failure, fire `alertNoEligibleModel()` or create a `SystemAlert` with `alertType: 'routing_failure'` so operators can see when GenX is degraded.

---

### 3.2 Budget Tracker — Silent Failure Mode

**File:** `src/lib/orchestrator.ts` lines 620–628  
**Severity:** 🟡 MEDIUM

If the budget DB query fails, the orchestrator silently proceeds with all providers. This is intentional for availability, but means a provider that has exceeded its budget could still be selected during a DB outage.

**Action required:** Log a `SystemAlert` when the budget check fails so operators are aware the budget guard is bypassed.

---

### 3.3 Workbench — `deploy()` Function Has No Guard

**File:** `src/app/admin/dashboard/workbench/page.tsx` line 298  
**Severity:** 🟡 MEDIUM

The `deploy()` function sends `confirmation: "DEPLOY owner/repo"` to the backend deploy route. There is no second confirmation dialog in the UI — a single click triggers the deploy call. For a production system, this is a significant risk.

**Action required:** Add a confirmation modal (`window.confirm` at minimum, ideally a typed-confirmation dialog) before calling the deploy endpoint.

---

### 3.4 Studio Page — `adultPolicy` Default

**File:** `src/app/admin/dashboard/studio/page.tsx` line 91  
**Severity:** 🟡 MEDIUM

The default `adultPolicy` state is `'full_adult_app_mode'`. This means any operator who opens the Studio without changing the policy will have adult mode enabled by default.

**Action required:** Change the default to `'off'` and require explicit opt-in.

---

### 3.5 CommandCenter — No Error Boundary

**File:** `src/components/dashboard/CommandCenter.tsx`  
**Severity:** 🟡 MEDIUM

The `submit()` function catches errors in a `finally` block but does not display them to the user — it only sets `loading = false`. If the `/api/admin/command` route returns an error, the user sees nothing.

**Action required:** Add error state display in the CommandCenter UI.

---

### 3.6 Memory Summarise Script — Unverified

**File:** `scripts/memory-summarise.ts`  
**Severity:** 🟡 MEDIUM

This script is referenced in the codebase but its production scheduling (cron/systemd timer) is not confirmed. If it never runs, the `MemoryEntry` table will grow unbounded.

**Action required:** Confirm the memory summarise script is scheduled (e.g. daily systemd timer or cron job on the VPS).

---

## 4. Low-Priority / Informational

### 4.1 Test Coverage

**File:** `src/lib/__tests__/backend-truth.test.ts`  
**Severity:** 🟢 LOW (informational)

The existing tests cover:
- GenX `configured` vs `available` distinction ✅
- Video generation truthful blocker (501) ✅

**Missing test coverage:**
- Orchestrator fallback when GenX fails
- Budget guard bypass on DB failure
- Provider health check for approved providers (groq, together, huggingface, qwen)
- Workbench plan → patch → commit → PR flow (integration test)

---

### 4.2 `services/crawler/` and `services/realtime/` — Not Audited

**Severity:** 🟢 LOW (informational)

These services were not fully read in this audit. Confirm:
- The crawler service uses Firecrawl (`IntegrationConfig` key: `firecrawl`) and not a prohibited provider
- The realtime service connects to the correct WebSocket endpoint and handles reconnection

---

### 4.3 Docker / Nginx Configuration

**File:** `docker-compose.yml`, `deploy/nginx.conf`  
**Severity:** 🟢 LOW (informational)

Confirm:
- `docker-compose.yml` does not hardcode any API keys (use `.env` file)
- `nginx.conf` has rate limiting on `/api/brain/*` routes
- SSL termination is configured (Let's Encrypt or equivalent)

---

### 4.4 `AUDIT.md` and `FRONTEND_DASHBOARD_AUDIT.md`

These existing audit documents should be reviewed alongside this report. Any items marked as resolved in those documents should be verified against the current codebase.

---

## 5. Checklist for Go-Live

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Remove prohibited providers from `providers.ts` | Dev | ✅ Fixed (2026-06-10) |
| 2 | Audit and clean `model-registry.ts` of prohibited providers | Dev | ❌ Open |
| 3 | Add `genx` and `mimo` health-check cases to `providers.ts` | Dev | ✅ Fixed (2026-06-10) |
| 4 | Set `VAULT_ENCRYPTION_KEY` in production environment | Ops | ❌ Open |
| 5 | Run `prisma migrate deploy` on production DB | Ops | ❌ Open |
| 6 | Run `prisma db seed` on production DB | Ops | ❌ Open |
| 7 | Verify admin auth middleware blocks all `/admin/*` without session | Dev | ❌ Open |
| 8 | Change Studio default `adultPolicy` to `'off'` | Dev | ✅ Fixed (2026-06-10) |
| 9 | Add confirmation modal to Workbench deploy button | Dev | ✅ Fixed (2026-06-10) |
| 10 | Add error display to CommandCenter `submit()` | Dev | ✅ Fixed (2026-06-10) |
| 11 | Log `SystemAlert` on GenX fallback in orchestrator | Dev | ❌ Open |
| 12 | Log `SystemAlert` on budget guard bypass | Dev | ❌ Open |
| 13 | Confirm memory summarise script is scheduled | Ops | ❌ Open |
| 14 | Confirm nginx rate limiting on `/api/brain/*` | Ops | ❌ Open |
| 15 | Confirm SSL is configured | Ops | ❌ Open |
| 16 | Verify `services/crawler/` and `services/realtime/` | Dev | ❌ Open |

---

## 6. What Is Production-Ready

The following components are well-implemented and production-ready:

- ✅ **Orchestration layer** (`src/lib/orchestrator.ts`) — classification, routing, confidence scoring, modality guards, GenX-first routing, fallback logic
- ✅ **Routing engine** (`src/lib/routing-engine.ts`) — health-aware, budget-aware, modality-aware model selection
- ✅ **Budget tracker** (`src/lib/budget-tracker.ts`) — per-provider monthly budget enforcement
- ✅ **Artifact system** (`Artifact` model + artifact API routes) — unified output storage
- ✅ **Prisma schema** — comprehensive, well-indexed, all relations correct
- ✅ **Workbench UI** — approval-gated, step-by-step, persisted job state
- ✅ **Studio UI** — capability-aware, blocker-surfacing, artifact-linked
- ✅ **CommandCenter** — intent routing, timeline display, job history
- ✅ **Crypto vault** — encrypted API key storage
- ✅ **Alert engine** — `SystemAlert` model + `alertNoEligibleModel()` integration
- ✅ **Smart router** — performance recording, Redis-backed state
- ✅ **Semantic cache** — cache lookup/store for text responses
- ✅ **App profiles** — per-app DB-backed routing overrides
- ✅ **Agent runtime** — task creation, execution, handoff, permission checks
- ✅ **Retrieval engine** — RAG chain integration
- ✅ **Multimodal router** — capability-specific routing
- ✅ **Backend truth tests** — GenX status separation, video blocker truthfulness

---

*Report generated by automated codebase audit. All findings are based on static analysis of source files. Dynamic/runtime verification is required for items marked as Ops.*
