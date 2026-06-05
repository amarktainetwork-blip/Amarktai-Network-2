# Dashboard Correction Audit — Post PR #74

**Date:** 2026-05-10
**Audit type:** Strict route and backend audit — NO implementation yet
**Scope:** Admin dashboard only. Public website, backend/governance, auth/session untouched.

---

## Files Inspected

| File | Purpose |
|------|---------|
| `src/app/admin/dashboard/page.tsx` | Current root dashboard page |
| `src/app/admin/dashboard/layout.tsx` | Dashboard shell/sidebar layout |
| `src/app/admin/dashboard/operations/page.tsx` | Operations page |
| `src/app/admin/dashboard/workbench/page.tsx` | Workbench page |
| `src/app/admin/dashboard/apps-agents/page.tsx` | Apps & Agents page |
| `src/app/admin/dashboard/memory-learning/page.tsx` | Memory & Learning page |
| `src/app/admin/dashboard/settings/page.tsx` | Settings page |
| `src/lib/dashboard-nav.ts` | Nav item registry |
| `src/app/api/admin/dashboard/route.ts` | Legacy dashboard API (Prisma CRM tables) |
| `src/app/api/admin/system/status/route.ts` | System runtime status |
| `src/app/api/admin/system/live-readiness/route.ts` | Go-live readiness checks |
| `src/app/api/admin/vps/route.ts` | VPS snapshots (CPU/RAM/disk) |
| `src/app/api/admin/apps/route.ts` | App list (DB + local VPS fallback) |
| `src/app/api/admin/app-health/route.ts` | Per-app health (requests, success rate, cost) |
| `src/app/api/admin/runtime-truth/route.ts` | Unified runtime capability truth |
| `src/app/api/admin/readiness/route.ts` | Go-live audit endpoint |
| `src/app/api/admin/jobs/route.ts` | BullMQ queue health, batch/video/learning counts |
| `src/app/api/admin/artifacts/route.ts` | Artifact list |
| `src/app/api/admin/repo-workbench/github/status/route.ts` | GitHub connection status |
| `src/app/api/admin/repo-workbench/status/route.ts` | Workbench workspace status |
| `src/app/api/admin/settings/status/route.ts` | Settings/provider truth |
| `src/app/api/admin/providers/route.ts` | Provider list |
| `src/app/api/admin/providers/health-check-all/route.ts` | Bulk provider health check |
| `src/app/api/admin/agents/route.ts` | Agent registry |

---

## 1. Current Route Map (after PR #74)

| URL | File | UI Owner |
|-----|------|----------|
| `/admin/dashboard` | `dashboard/page.tsx` | **Studio Assistant** (Chat, Research, Image, Video, Music, TTS, STT, Adult, Coding Handoff) |
| `/admin/dashboard/workbench` | `dashboard/workbench/page.tsx` | **GitHub Repo Workbench** |
| `/admin/dashboard/apps-agents` | `dashboard/apps-agents/page.tsx` | **Apps & Agents** |
| `/admin/dashboard/memory-learning` | `dashboard/memory-learning/page.tsx` | **Memory / Learning** |
| `/admin/dashboard/operations` | `dashboard/operations/page.tsx` | **Operations** (VPS, storage, provider health, jobs, costs, go-live readiness) |
| `/admin/dashboard/settings` | `dashboard/settings/page.tsx` | **Settings** (provider keys, routing, adult policy) |

### Nav item registry (`src/lib/dashboard-nav.ts`) — current

| ID | href | Label |
|----|------|-------|
| `studio` | `/admin/dashboard` | Studio |
| `workbench` | `/admin/dashboard/workbench` | Workbench |
| `apps-agents` | `/admin/dashboard/apps-agents` | Apps & Agents |
| `memory-learning` | `/admin/dashboard/memory-learning` | Memory & Learning |
| `operations` | `/admin/dashboard/operations` | Operations |
| `settings` | `/admin/dashboard/settings` | Settings |

### Key observation

`/admin/dashboard` **is currently the Studio**, not an Overview. The nav label confirms this (`id: 'studio'`, `label: 'Studio'`). There is **no Overview page**. Operations data lives in a separate page that is not yet absorbed into any overview.

---

## 2. Proposed Final Route Map

| URL | Label | Content |
|-----|-------|---------|
| `/admin/dashboard` | **Overview** | App count, VPS state, CPU/RAM/disk, Redis/jobs, storage, provider status, GitHub/workbench status, blockers/remedies |
| `/admin/dashboard/studio` | **Studio Assistant** | Move current `/admin/dashboard` Studio UI here |
| `/admin/dashboard/workbench` | **GitHub Repo Workbench** | No change |
| `/admin/dashboard/apps-agents` | **Apps & Agents** | No change |
| `/admin/dashboard/memory-learning` | **Memory / Learning** | No change |
| `/admin/dashboard/settings` | **Settings** | No change |
| `/admin/dashboard/operations` | **(Redirect or hidden diagnostics)** | Redirect to `/admin/dashboard`, or keep as unlisted advanced diagnostics page |

---

## 3. Safest Route Migration Path

Order matters. Each step is independent and reversible.

### Step 1 — Create `/admin/dashboard/studio/page.tsx`
- Copy the current `dashboard/page.tsx` (Studio UI) to `dashboard/studio/page.tsx`
- No behavior change. Studio now lives at both routes temporarily.
- Validation: lint + build must pass.

### Step 2 — Create new `dashboard/page.tsx` (Overview)
- Replace current Studio root with an Overview page.
- Overview pulls from existing backend endpoints (see section 4).
- Studio is now **only** at `/admin/dashboard/studio`.

### Step 3 — Update `dashboard-nav.ts`
- Change `studio` href from `/admin/dashboard` to `/admin/dashboard/studio`
- Add new `overview` item at `/admin/dashboard` (first in list)
- Remove or rename `operations` nav item (either redirect or hide)

### Step 4 — Convert `/admin/dashboard/operations`
- **Option A (recommended):** Convert to a redirect to `/admin/dashboard`
- **Option B:** Keep page as unlisted advanced diagnostics (remove from nav, keep URL alive)
- Do not delete the file yet — data in Operations page is needed for Overview.

### Step 5 — Update sidebar branding
- Layout subtitle currently says `"Operations Console"` (in `layout.tsx` line 74)
- Change to `"AI Operating System"` or `"Root OS Console"` to match product direction

---

## 4. Backend Endpoints Available for Overview

All endpoints below are already implemented and protected by admin session auth.

### App count / connected apps
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/apps` | Full app list (DB + local VPS fallback with 5 starter apps) |
| `GET /api/admin/app-health?slug=<slug>` | Per-app: requests 7d, success rate, cost, connection status |
| `GET /api/admin/dashboard` | totalProducts, totalContacts, totalIntegrations, brainStats, recentBrainEvents |
| `GET /api/admin/agents?appSlug=dashboard` | Operator agent list and status |

### VPS state / CPU / RAM / disk
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/vps` | VPS resource snapshots (cpuPercent, ramPercent, diskPercent, netInKbps, netOutKbps) per product with `monitoringEnabled: true` |
| `GET /api/admin/system/status` | `getSystemRuntimeStatus()` — VPS status, services list |

**Note:** `/api/admin/vps` pulls from `VpsResourceSnapshot` DB table. Data only exists if VPS agent is writing snapshots. On fresh VPS without monitoring configured, this will return empty arrays.

### Redis / jobs
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/jobs` | BullMQ queue health, jobCounts, batchStats (pending/processing/completed/failed), videoStats, learningStats |

### Storage / artifacts
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/artifacts` | Artifact list (local VPS `artifacts/artifacts.json`) |
| `GET /api/admin/artifacts/media` | Media artifact list |
| Local store direct (server-side) | `checkWritable()`, `getStorageRoot()`, `listRecords()` from `local-json-store.ts` |

### Provider status / tests
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/runtime-truth` | Unified truth: all providers, capabilities, genx status, adultGate, storage |
| `GET /api/admin/settings/status` | Settings truth: per-provider configured/status, tools, storage |
| `GET /api/admin/providers` | Provider list |
| `GET /api/admin/providers/health-check-all` | Bulk provider health check (live tests) |
| `GET /api/admin/provider-governance` | Capability governance matrix |

### GitHub / workbench
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/repo-workbench/github/status` | GitHub auth status |
| `GET /api/admin/repo-workbench/github/repos` | Repo list |
| `GET /api/admin/repo-workbench/status` | Workspace root writable, canImport, canPatch, canPush, canCreatePr |
| `GET /api/admin/repo-workbench/jobs/latest` | Latest workbench job |

### Blockers / remedies / go-live readiness
| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/readiness` | Full go-live readiness audit: PASS/FAIL/OPTIONAL/DISABLED per check |
| `GET /api/admin/system/live-readiness` | Extended live-readiness with workspace probe, DB, queue, health ping |
| `GET /api/admin/genx/status` | GenX-specific status |
| `GET /api/admin/alerts` | System alerts |

---

## 5. Missing Backend Contracts (Truly Missing)

These are data points the Overview page would need that **do not yet have a clean single-call endpoint**:

| Missing Data | Status | Notes |
|--------------|--------|-------|
| Single "Overview" aggregated endpoint | Missing | No `GET /api/admin/overview`. Overview page must compose from 3–5 calls. Acceptable for now. |
| Connected app count (single number) | Not direct | Must call `GET /api/admin/apps` and count results. Not a blocker. |
| Real-time CPU/RAM/disk widget | Conditional | `GET /api/admin/vps` works but requires `monitoringEnabled` products in DB AND VPS agent writing snapshots. On a fresh VPS without monitoring running, this returns empty. A "no VPS data yet" state is needed. |
| Redis connection status (standalone) | Not direct | Redis status is only surfaced via `GET /api/admin/jobs` (queue.healthy). No standalone `/api/admin/redis/status` exists. Acceptable workaround: use jobs endpoint. |
| Disk usage from OS-level (du/df) | Missing | No server-side OS disk check in current API. Disk comes from DB `VpsResourceSnapshot`. A local fallback using `df` or `statvfs` does not exist in current backend. Low priority — use snapshot data or skip if empty. |
| Connected app "active/stale" roll-up count | Computed | `GET /api/admin/app-health?slug=<slug>` is per-slug. An aggregated roll-up across all apps would require N calls or a new endpoint. Not blocking Overview v1. |

---

## 6. UI Clutter to Remove Later

These items should **not be deleted yet**, but are candidates for cleanup in a future prompt.

| Item | Location | Action |
|------|----------|--------|
| `"Operations Console"` sidebar subtitle | `layout.tsx` line 74 | Change label to match product direction ("AI Operating System" or "Root OS Console") |
| `operations` nav item | `dashboard-nav.ts` | Remove from nav after Operations is absorbed into Overview, or keep as hidden link |
| `/admin/dashboard/operations/page.tsx` | Route file | Convert to redirect → `/admin/dashboard` after Overview is complete. Do not delete yet. |
| `GET /api/admin/dashboard` route | `api/admin/dashboard/route.ts` | This uses Prisma CRM tables (Product, ContactSubmission, WaitlistEntry, AppIntegration, BrainEvent). It is a legacy admin reporting route. Not currently called by any dashboard page. May be cleaned up separately. |
| Legacy alias redirects (`operations→actions`, `alerts→actions`, etc.) | `operations/page.tsx` head comment, memory note | Already redirecting. Keep redirect in place. Remove nav clutter only. |
| `FRONTEND_DASHBOARD_AUDIT.md` | Repo root | Old audit file. Move to `docs/forensic/` or remove in a cleanup PR. |
| `AUDIT.md` | Repo root | Old audit file. Same as above. |
| `VPS_VERIFICATION.md` | Repo root | Old. Move to `docs/forensic/` or remove. |
| Unused adult modes `adult_video` / `adult_voice` | `dashboard/page.tsx` `unavailableAdultModes` | Already gated behind blockers. Leave in place — they are properly blocked, not fake. |
| `DarkMetric`, `DarkField`, `RouteFact`, `JobState`, `DarkSelect` helper components | Bottom of `dashboard/page.tsx` | When Studio moves to `/admin/dashboard/studio/page.tsx`, these helpers move with it. No change needed now. |

---

## 7. Safe Implementation Order (Next Prompt)

1. **[Step 1]** Create `src/app/admin/dashboard/studio/page.tsx`
   - Copy current `dashboard/page.tsx` (Studio UI) verbatim
   - Run lint + build to confirm no break

2. **[Step 2]** Create new `src/app/admin/dashboard/page.tsx` (Overview)
   - Server component, fetches from: `runtime-truth`, `system/status`, `jobs`, `apps`, `readiness`
   - Show: app count, VPS state, provider health summary, jobs/queue health, storage status, blockers
   - Do not include fake statuses

3. **[Step 3]** Update `src/lib/dashboard-nav.ts`
   - Add `overview` item: `href: '/admin/dashboard'`, label: `'Overview'`, first in list
   - Change `studio` href from `/admin/dashboard` to `/admin/dashboard/studio`
   - Mark `operations` item for removal from nav (keep route alive)

4. **[Step 4]** Update `src/app/admin/dashboard/layout.tsx`
   - Fix sidebar subtitle from `"Operations Console"` → `"AI Operating System"`

5. **[Step 5]** Convert `src/app/admin/dashboard/operations/page.tsx`
   - Either: add redirect `export { redirect } from 'next/navigation'` pointing to `/admin/dashboard`
   - Or: keep page but remove from nav

6. **[Step 6]** Run full validation: `npm run lint && npm test && npm run build`

---

## 8. Screenshot Checklist (Required Before Deploy)

Take these screenshots **before** making any route changes:

### Before (current state)
- [ ] `/admin/dashboard` — Full Studio UI (Chat/Research/Image/Video/Music/TTS/STT/Adult/Coding modes visible)
- [ ] `/admin/dashboard/operations` — Operations page (go-live readiness, provider health, storage, jobs, costs)
- [ ] Dashboard sidebar — showing current nav: Studio, Workbench, Apps & Agents, Memory & Learning, Operations, Settings
- [ ] `/admin/dashboard/workbench` — Workbench page (current state)
- [ ] `/admin/dashboard/apps-agents` — Apps & Agents page
- [ ] `/admin/dashboard/memory-learning` — Memory & Learning page
- [ ] `/admin/dashboard/settings` — Settings page (provider cards visible)

### After (post-migration, before deploy)
- [ ] `/admin/dashboard` — New Overview page (app count, VPS, providers, jobs, blockers)
- [ ] `/admin/dashboard/studio` — Studio (same content as old root, just at new URL)
- [ ] Dashboard sidebar — showing new nav: Overview, Studio, Workbench, Apps & Agents, Memory & Learning, Settings
- [ ] `/admin/dashboard/operations` — Redirect working (or page still shows but absent from nav)
- [ ] Mobile sidebar — responsive nav working with new items

---

## 9. Validation Results

> Run after creating this file (audit only — no implementation):

```
npm run lint   → confirm no lint errors from audit doc
npm test       → confirm test suite unaffected
npm run build  → confirm no build errors
```

Results are recorded in the next section after running.

---

## Summary

| Item | Status |
|------|--------|
| Current `/admin/dashboard` UI owner | Studio (not Overview) |
| Overview page exists | ❌ Missing — must be created |
| Studio at `/admin/dashboard/studio` | ❌ Missing — must be created |
| Operations data available for Overview | ✅ Via `runtime-truth`, `system/status`, `jobs`, `readiness` |
| VPS CPU/RAM/disk real-time | ⚠️ Conditional — requires `VpsResourceSnapshot` rows in DB |
| Redis status standalone | ⚠️ Not direct — use `GET /api/admin/jobs` |
| Connected app count | ⚠️ Derived — call `GET /api/admin/apps` and count |
| Auth/session/protected APIs | ✅ Untouched |
| Public website | ✅ Untouched |
| Backend/governance | ✅ Untouched |
| Adult support | ✅ Untouched |
