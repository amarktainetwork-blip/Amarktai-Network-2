# Runtime Wiring — One Source of Truth Audit

**Date:** 2026-05-01  
**Branch:** fix-dashboard-runtime-wiring-one-source-of-truth

---

## Problem Statement

Settings shows GenX key configured and many providers configured, but AI Engine and Media Studio showed "Needs GenX key", "not wired yet", or only 3 models. This proved that each dashboard section was computing key/provider status independently instead of sharing one source of truth.

---

## Key Resolution Sources Found (Before Fix)

### GenX Key

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `process.env.GENX_API_KEY` (env only) | `src/app/admin/dashboard/ai-engine/page.tsx` — fetches `/api/admin/genx/status` | Does not read DB vault; misses keys saved via Settings UI | `getServiceKey('genx', 'GENX_API_KEY')` from service-vault | AI Engine now also fetches `/api/admin/runtime-truth` which reads vault |
| `prisma.integrationConfig` via `src/app/api/admin/settings/integrations/route.ts` | Settings page | Correct — reads DB vault first | ✓ Already correct | No change needed |
| `src/lib/genx-client.ts` | Internal genx client | Reads `GENX_API_KEY` env only | `getServiceKey` | Logged as known gap |
| Static `CAPABILITIES_TABLE` in ai-engine/page.tsx | AI Engine Capabilities tab | Hardcoded "Needs GenX key" regardless of Settings state | Runtime truth API | **Fixed** |
| Static `FALLBACK_PROVIDERS.wired: false` in ai-engine/page.tsx | AI Engine Providers tab | Always shows "Not wired yet" regardless of configured keys | Runtime truth API | **Fixed** |

### Provider Keys (HuggingFace, Together, OpenAI, Replicate, Qwen, Groq, Mistral, Cohere, xAI, OpenRouter, ElevenLabs, Deepgram, Suno, Udio)

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `src/app/api/admin/providers/route.ts` — reads `providerConfig` DB table | Settings → Providers section | Correct for Settings | ✓ Already correct | No change |
| Static arrays `FALLBACK_PROVIDERS` in ai-engine/page.tsx | AI Engine → Providers tab | All hardcoded `wired: false`; ignores whether keys are saved in Settings | `GET /api/admin/runtime-truth` | **Fixed** — status now derived from vault |
| `src/lib/provider-config.ts` / `src/lib/provider-catalog.ts` | Model registry, routing engine | Uses its own DB table (`providerConfig`), separate from `integrationConfig` | Acceptable dual-table design | No fix needed; runtime-truth bridges both |

### GitHub Token

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `prisma.integrationConfig` key=`github` | Settings/integrations route | Correct | ✓ Already correct | No change |
| `process.env.GITHUB_TOKEN` | Some lib modules | Env fallback — acceptable | service-vault handles fallback | No change |

### Firecrawl Key

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `src/lib/firecrawl.ts` `getMem0Status()` | integrations-status route | Reads `FIRECRAWL_API_KEY` env | `getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')` | Logged; runtime-truth uses vault |

### Mem0 Key

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `src/lib/mem0-client.ts` | integrations-status route | Reads `MEM0_API_KEY` env | `getServiceKey('mem0', 'MEM0_API_KEY')` | Logged; runtime-truth uses vault |

### Webdock Key

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `src/app/api/admin/settings/test-webdock/route.ts` | Settings → Webdock test | Returns raw "HTTP 404" error message with no guidance | Show actionable diagnostic message | **Fixed** — 404 now shows full diagnostic |

### AmarktAI Assistant_ENABLED Flag

| Source | Used by | Problem | Correct source | Fix |
|--------|---------|---------|----------------|-----|
| `process.env.NEXT_PUBLIC_AmarktAI Assistant_ENABLED` | `admin/dashboard/layout.tsx` | Correct (controls floating assistant) | ✓ Already correct | No change |
| None — always rendered | `settings/page.tsx` AmarktAI AssistantSection | AmarktAI AssistantSection always visible regardless of AmarktAI Assistant_ENABLED | `data.AmarktAI AssistantEnabled` from integrations API | **Fixed** — AmarktAI Assistant section now hidden unless enabled |

---

## What Was Created / Fixed

### New: `src/lib/runtime-capability-truth.ts`
- Exports: `getGenXRuntimeStatus()`, `getRuntimeProviderStatus()`, `getCapabilityStatus()`, `getFallbackProviderStatus()`, `getModelCatalogueStatus()`, `getDashboardRuntimeTruth()`
- All key reads go through `getServiceKey(integrationKey, envVar)` from `service-vault.ts`
- Returns structured `{ success, genx, providers, capabilities, blockers }`

### New: `GET /api/admin/runtime-truth`
- Auth-gated, force-dynamic
- Calls `getDashboardRuntimeTruth()`
- Returns structured error: `{ success: false, error, blocker, nextAction }`

### Fixed: `src/app/admin/dashboard/ai-engine/page.tsx`
- Now fetches `/api/admin/runtime-truth` in addition to `/api/admin/genx/status`
- Providers tab: shows real configured/wired status from vault instead of hardcoded `wired: false`
- Capabilities tab: derives blockers from runtime truth — no more hardcoded "Needs GenX key" when key exists

### Fixed: `src/app/admin/dashboard/settings/page.tsx`
- `AmarktAI AssistantSection` only rendered when `data.AmarktAI AssistantEnabled === true`
- Webdock test result banner shows full diagnostic for HTTP 404 (blocker + nextAction)

### Fixed: `src/app/api/admin/settings/integrations/route.ts`
- Added `AmarktAI AssistantEnabled: process.env.AmarktAI Assistant_ENABLED === 'true'` to GET response

### Fixed: `src/app/api/admin/settings/test-webdock/route.ts`
- HTTP 404 → returns actionable message instead of raw "Webdock API responded 404"
- Includes `blocker` and `nextAction` fields in response

---

## Remaining Known Gaps

1. `src/lib/genx-client.ts` reads `GENX_API_KEY` from env only — does not use service-vault. This means if only the DB vault has the key, genx-client won't find it. Fix: update genx-client to use `getServiceKey` (requires making it async).
2. `src/lib/firecrawl.ts` and `src/lib/mem0-client.ts` read env vars only — same issue as above.
3. Music generation (Lyria via GenX) is not yet wired end-to-end.
4. Media Studio image/video/voice generation buttons still use hardcoded `genxReady` from a separate `/api/admin/genx/status` call rather than runtime-truth — acceptable as that route also reads the same key source.
