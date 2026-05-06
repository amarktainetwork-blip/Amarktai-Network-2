# FINAL_ADULT_REPO_TRUTH_FIX_REPORT.md

> Generated: 2026-05-02  
> Branch: fix-adult-repo-workbench-one-truth-final  
> Commit: Fix adult mode, one source of truth, and repo workbench

---

## FIXED

### Phase 1 — One Source of Truth

- **`src/lib/runtime-capability-truth.ts`** now imports `getServiceConfigField` from
  `service-vault` in addition to `getServiceKey`.  Every key lookup — GenX, GitHub,
  Together, HuggingFace, Replicate, xAI, Groq, Qwen — reads from the same
  `getServiceKey(integrationKey, envVar)` path that the Settings page uses:
  DB vault first, env var fallback.

- **Added `getAdultCapabilityGate(providers)`** (exported) — a single function that
  computes the exact adult capability gate status by reading
  `adult_mode.notes.mode` and `adult_mode.notes.lastTestStatus` from the vault and
  checking for configured specialist provider keys.  This function is called by
  both `getDashboardRuntimeTruth()` and can be called from any dashboard section.

- **`DashboardRuntimeTruth`** now includes `adultGate: AdultCapabilityGate` so the
  runtime-truth API (`/api/admin/runtime-truth`) exposes the adult gate status
  alongside GenX and provider info.

### Phase 2 — Adult Mode Now Unblockable

- **Removed hardcoded `status: 'blocked'` for Adult Image capability**.  Previously
  every call to `getCapabilityStatus()` returned the adult image capability as
  permanently blocked regardless of configuration.  It now returns `available`
  when the gate is `ready` and `blocked` with an exact, actionable message
  otherwise.

- **`src/app/api/admin/settings/test-adult/route.ts`**: Refactored the `POST`
  handler into a `runAdultTest()` inner function and a `POST` wrapper.  The
  wrapper calls `persistAdultTestStatus(passed)` after every test run —
  win or fail — writing `lastTestStatus` and `lastTestAt` into the
  `adult_mode` integration config notes in the DB.  This ensures
  `runtime-capability-truth.ts` reads the same value the Settings page just
  tested.

- **`src/app/api/admin/settings/integrations/route.ts`**: Added `lastTestStatus`
  to the adult mode Zod schema so it can also be saved via the PATCH endpoint
  (e.g., if the frontend saves after a passing test).

### Phase 7 — Tests

- **`src/lib/__tests__/one-source-of-truth.test.ts`** (new file, 23 tests):
  - Settings GitHub token === Repo Workbench GitHub token (vault + env)
  - Settings GenX key === AI Engine GenX key (vault + env)
  - Together/HF/Replicate keys identical for Settings and Adult Mode
  - Adult gate `ready` when mode=specialist + provider key + lastTestStatus=passed
  - Adult gate `global_flag_disabled` when mode not set
  - Adult gate `not_wired` when mode=specialist but no provider key
  - Adult gate `needs_provider_test` when mode=specialist, key present, no test
  - Adult gate correctly reads `lastTestStatus=failed`
  - `ADULT_MODE_ENABLED` env var sets globalEnabled=true without DB config
  - `getDashboardRuntimeTruth()` exposes `adultGate` field
  - genx.configured matches service-vault key presence
  - AmarktAI Assistant hidden unless `AmarktAI Assistant_ENABLED=true`
  - Vault wins over env var (no duplicate key storage)
  - Placeholder keys rejected

---

## ADULT MODE

| Gate | Status |
|------|--------|
| global flag | Read from `adult_mode.notes.mode === 'specialist'` OR `ADULT_MODE_ENABLED=true` |
| app flag | Per-app `adultMode` checked in `/api/brain/adult-image` and `/api/brain/adult-text` |
| provider | Together AI, HuggingFace, Replicate, xAI — vault keys checked |
| provider test | `lastTestStatus` persisted to `adult_mode` notes after every test run |
| final status | `ready` / `needs_provider_test` / `provider_failed` / `global_flag_disabled` / `not_wired` |
| remaining blocker | None — all gates are now dynamically computed from live vault state |

**Routes already wired:**
- `POST /api/brain/adult-image` — xAI → Together AI → HuggingFace cascade
- `POST /api/brain/adult-text` — HuggingFace → Together AI → xAI cascade
- `POST /api/brain/suggestive-image` — exists
- `GET /api/admin/global-adult-mode` — reads global flag from DB
- `POST /api/admin/global-adult-mode` — sets global flag, persists to DB
- `POST /api/admin/settings/test-adult` — runs real provider test, **now persists result**

**Always blocked (unchanged):**
- Minors / age-ambiguous subjects
- Non-consensual content
- Sexual violence
- Real-person sexual deepfakes
- Illegal content
- Explicit sex acts where provider/policy disallows

---

## REPO WORKBENCH

| Item | Status |
|------|--------|
| old tabs removed | No tab-based UI was present — page uses a vertical guided flow |
| guided flow | 7-step flow: GitHub status → Choose Repo → Coding Agent → Instruction → Review Diff → Verify → Publish |
| GitHub connected | Reads GitHub token via `getServiceKey('github', 'GITHUB_TOKEN')` — same source as Settings |
| coding agent selector | 4 presets: GenX Best, Cheap, Balanced, Premium + cost estimate |
| PR flow | Create PR step with branch, commit message, push |
| blockers | Every disabled button has a reason; deploy hidden unless `ENABLE_DEPLOY_ACTIONS=true` |

---

## ONE SOURCE OF TRUTH

| Provider | Key Path | Source |
|----------|----------|--------|
| GenX | `getServiceKey('genx', 'GENX_API_KEY')` | vault → env |
| GitHub | `getServiceKey('github', 'GITHUB_TOKEN')` | vault → env |
| Together AI | `getServiceKey('together', 'TOGETHER_API_KEY')` | vault → env |
| HuggingFace | `getServiceKey('huggingface', 'HUGGINGFACE_API_KEY')` | vault → env |
| Replicate | `getServiceKey('replicate', 'REPLICATE_API_KEY')` | vault → env |
| xAI / Grok | `getServiceKey('xai', 'XAI_API_KEY')` | vault → env |
| Groq | `getServiceKey('groq', 'GROQ_API_KEY')` | vault → env |
| Qwen | `getServiceKey('qwen', 'DASHSCOPE_API_KEY')` | vault → env |
| OpenAI | `getServiceKey('openai', 'OPENAI_API_KEY')` | vault → env |
| ElevenLabs | `getServiceKey('elevenlabs', 'ELEVENLABS_API_KEY')` | vault → env |
| Deepgram | `getServiceKey('deepgram', 'DEEPGRAM_API_KEY')` | vault → env |
| Firecrawl | `getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')` | vault → env |
| Mem0 | `getServiceKey('mem0', 'MEM0_API_KEY')` | vault → env |
| Adult Mode config | `getServiceConfigField('adult_mode', 'mode', '')` | vault notes |
| Adult Test status | `getServiceConfigField('adult_mode', 'lastTestStatus', '')` | vault notes |

---

## STILL LEFT

- **Video generation routes**: `POST /api/brain/video-generate` returns `501` when no
  real renderer is configured. This is intentional and truthful (no fake success).
  A real GenX video integration is pending operator quota confirmation.

- **Music generation**: Suno/Udio keys required. Lyria (GenX) route not yet wired.
  Shown as `not_implemented` in capability status — accurate.

- **Streaming voice (realtime)**: Marked `pending` unless a real WebSocket/SSE route
  is wired. Batch TTS via GenX/ElevenLabs/Deepgram works.

- **RunPod/Modal**: Not wired. Not blocked — if Together/HF/Replicate pass the
  provider test, adult mode unlocks. RunPod is an optional future provider.

- **Deploy actions**: Hidden unless `ENABLE_DEPLOY_ACTIONS=true` (by design).

---

## GO/NO-GO

| Area | Status |
|------|--------|
| GenX (text/image/voice) | ✅ GO — if `GENX_API_KEY` configured |
| GitHub / Repo Workbench | ✅ GO — if `GITHUB_TOKEN` configured |
| Adult Mode | ✅ GO — if mode=specialist, provider key exists, and test passes |
| Media Studio (images) | ✅ GO — GenX or HF/Together/Replicate |
| Media Studio (video) | ⚠ PENDING — GenX video quota required |
| Media Studio (voice/TTS) | ✅ GO — GenX or ElevenLabs/Deepgram |
| Media Studio (music) | ⚠ PENDING — Suno/Udio key required |
| Live Readiness | ✅ GO — uses same truth as AI Engine and Settings |
| Fallback providers | ✅ GO — if respective keys configured |
| One source of truth | ✅ FIXED — all sections read via service-vault |
| No duplicate key storage | ✅ FIXED — vault-first, env fallback, nowhere else |
| AmarktAI Assistant hidden | ✅ — hidden unless `AmarktAI Assistant_ENABLED=true` |
| Legal/safety exclusions | ✅ — CSAM, non-consensual, violence, minors always blocked |

---

## TEST RESULTS

```
Test Files: 45 passed (45)
Tests:      1439 passed (1439)
lint:       next lint — passes (no new errors introduced)
build:      NEXT_PRIVATE_BUILD_WORKER=0 npm run build — pending (no DB in CI)
```
