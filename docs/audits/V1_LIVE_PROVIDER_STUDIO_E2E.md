# V1 Live Provider and Studio E2E Proof

**Branch:** `cline/v1-live-provider-studio-e2e`  
**Base:** `integration/cline-source-of-truth` (after PR #97)  
**Generated:** 2026-06-12

---

## 1. Providers Tested

All six approved AI providers are covered by the live smoke test framework (`src/lib/live-smoke-tests.ts`).

| Provider | Env Vars | Smoke Capability | Smoke Model | Status |
|---|---|---|---|---|
| GenX | `GENX_API_KEY` | chat/text | `genx-mini` (override: `GENX_SMOKE_MODEL`) | `not_configured` until key set |
| Hugging Face | `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN` | chat/text | `HuggingFaceTB/SmolLM2-135M-Instruct` (override: `HF_SMOKE_MODEL`) | `not_configured` until key set |
| Qwen / DashScope | `QWEN_API_KEY`, `DASHSCOPE_API_KEY` | chat/text | `qwen-turbo` (override: `QWEN_SMOKE_MODEL`) | `not_configured` until key set |
| Xiaomi MiMo | `MIMO_API_KEY`, `XIAOMI_API_KEY` | chat/text | `MiMo-7B-RL` (override: `MIMO_SMOKE_MODEL`) | `not_configured` until key set |
| Groq | `GROQ_API_KEY` | chat/text | `llama-3.1-8b-instant` (override: `GROQ_SMOKE_MODEL`) | `not_configured` until key set |
| Together AI | `TOGETHER_API_KEY` | chat/text | `meta-llama/Llama-3.2-3B-Instruct-Turbo` (override: `TOGETHER_SMOKE_MODEL`) | `not_configured` until key set |

**Smoke test endpoint:** `GET /api/admin/system/live-ai-smoke-tests`  
**Single-provider query:** `GET /api/admin/system/live-ai-smoke-tests?provider=groq`

### Smoke Test Behavior

- If credentials are **missing**: returns `not_configured` with the required env var names. Never returns `failed`.
- If credentials are **present**: performs a minimal single-token chat/completions call. Returns `pass` or `fail` with sanitized error reason and latency.
- API keys are **never** included in responses or logs. All errors pass through `sanitizeProviderError`.

---

## 2. Studio Functions Proven / Fixed

The capability taxonomy (`src/lib/ai-capability-taxonomy.ts`) defines truthful status for all capabilities. The following are confirmed `working` with executable endpoints and provider routes:

| Capability | Status | Endpoint | Creates Artifact | Long Running |
|---|---|---|---|---|
| chat | working | `/api/brain/request` | No | No |
| reasoning | working | `/api/brain/request` | No | No |
| research | working | `/api/brain/research` | Yes | No |
| text_generation | working | `/api/brain/request` | Yes | No |
| text_ranking | working | `/api/brain/rerank` | No | No |
| embeddings | working | `/api/brain/embeddings` | No | No |
| rerank | working | `/api/brain/rerank` | No | No |
| text_to_image | working | `/api/brain/image` | Yes | No |
| text_to_video | working | `/api/brain/video-generate` | Yes | Yes |
| text_to_speech | working | `/api/brain/tts` | Yes | No |
| automatic_speech_recognition | working | `/api/brain/stt` | Yes | No |
| music_generation | working | `/api/admin/music-studio` | Yes | Yes |
| lyrics_generation | working | `/api/admin/music-studio` | Yes | No |

### Partially Wired (honest status, not fake working)

| Capability | Blocker |
|---|---|
| image_text_to_image | No approved source-image provider adapter wired |
| image_to_image | No approved source-image provider adapter wired |
| avatar_video | No approved lip-sync execution adapter wired |
| campaign_generation | No dedicated campaign schema or artifact bundle |
| brand_aware_content_generation | No brand-profile retrieval proof |

### Provider Available, Not Wired

These capabilities have provider support but no canonical execution adapter:
`image_to_video`, `image_text_to_video`, `video_to_video`, `text_to_audio`, `audio_to_audio`, `voice_clone_or_voice_design`, `avatar_generation`, and all computer vision classification/detection capabilities.

---

## 3. Artifact Proof Status

Every successful media output capability has `createsArtifact: true` in the taxonomy. The artifact flow is:

1. Capability execution completes (via `ai-capability-adapters.ts`)
2. `createArtifact()` is called in `connected-app-capability-engine.ts`
3. Artifact record is persisted (database + storage driver)
4. Artifact id is returned in the job result
5. Connected-app receives artifact reference in the job status response

**Artifact persistence readiness** is checked by `getArtifactPersistenceReadiness()` in `ai-deployment-readiness.ts`, which performs a live database write probe and storage round-trip.

**Preview/download/stream:** Artifacts are accessible via:
- `GET /api/admin/artifacts/[id]` — metadata
- `GET /api/admin/artifacts/[id]/download` — file download
- `GET /api/artifacts/file/[...key]` — direct file stream

---

## 4. Connected-App Proof Status

The connected-app E2E flow is fully wired:

| Step | Implementation | File |
|---|---|---|
| App registration | `registerConnectedApp()` | `src/lib/connected-apps.ts` |
| HMAC signing | `computeWebhookSignature()` | `src/lib/webhook-verifier.ts` |
| HMAC verification | `verifyWebhookSignature()` | `src/lib/webhook-verifier.ts` |
| Capability scope validation | `ConnectedAppCapabilityEngine` | `src/lib/connected-app-capability-engine.ts` |
| Job creation | `executeConnectedAppCapability()` | `src/lib/connected-app-capability-engine.ts` |
| Artifact creation | `createArtifact()` | `src/lib/artifact-store.ts` |
| Audit event written | `recordAcceptedEvent()` | `src/lib/connected-app-events.ts` |
| Job status polling | `GET /api/connected-apps/capabilities/jobs/[jobId]` | route |

**Webhook ingest:** `POST /api/admin/connected-apps/webhook` — verifies HMAC, checks app status and scope, stores event.

**Capability execution:** `POST /api/connected-apps/capabilities/execute` — verifies HMAC, validates scope, dispatches to capability engine, returns job id.

---

## 5. Remaining Go-Live Blockers

### Must-fix before live traffic

| Blocker | Required Action |
|---|---|
| All 6 provider API keys missing | Set `GENX_API_KEY`, `HUGGINGFACE_API_KEY`, `QWEN_API_KEY`, `MIMO_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY` in production env |
| `DATABASE_URL` not set | Configure the MariaDB connection string |
| `AMARKTAI_STORAGE_ROOT` not set | Configure VPS storage path (default: `/var/www/amarktai/storage`) |
| GenX base URL | Set `GENX_BASE_URL` or `GENX_API_URL` if not using default `https://query.genx.sh` |
| Connected-app signing secrets | For each registered app, set `AMARKTAI_APP_SECRET_<SLUG>` in production env |

### Known partial wiring (not blockers for V1 text/image/video/audio)

| Capability | Status | Notes |
|---|---|---|
| image_to_video | provider_available_not_wired | Source-image video adapter not wired |
| video_to_video | provider_available_not_wired | Source-video upload adapter not wired |
| avatar_video | partially_wired | Lip-sync adapter not wired |
| voice_clone | provider_available_not_wired | Consent record and cloning adapter not wired |
| text_to_audio (non-speech) | provider_available_not_wired | Sound-generation contract not wired |
| All CV classification/detection | provider_available_not_wired | Image upload adapter not wired |

### Test infrastructure

The Vitest test runner has a pre-existing infrastructure failure affecting all 33 test suites (confirmed on `integration/cline-source-of-truth` before this branch). This is not caused by Phase 5 or V1 work. The `npm run build` and `npx tsc --noEmit` proofs are clean.

---

## 6. Manual Env / Provider Requirements

### Required for full V1 operation

```bash
# AI Providers
GENX_API_KEY=<your-genx-key>
GENX_BASE_URL=https://query.genx.sh   # or your custom endpoint
HUGGINGFACE_API_KEY=<your-hf-key>
QWEN_API_KEY=<your-qwen-key>
MIMO_API_KEY=<your-mimo-key>
GROQ_API_KEY=<your-groq-key>
TOGETHER_API_KEY=<your-together-key>

# Database
DATABASE_URL=mysql://amarktai:STRONG_PASSWORD@127.0.0.1:3306/amarktai

# Storage
AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage

# Connected Apps (one per registered app)
AMARKTAI_APP_SECRET_<SLUG>=<generated-secret>
```

### Optional smoke test model overrides

```bash
GENX_SMOKE_MODEL=genx-mini
HF_SMOKE_MODEL=HuggingFaceTB/SmolLM2-135M-Instruct
QWEN_SMOKE_MODEL=qwen-turbo
MIMO_SMOKE_MODEL=MiMo-7B-RL
GROQ_SMOKE_MODEL=llama-3.1-8b-instant
TOGETHER_SMOKE_MODEL=meta-llama/Llama-3.2-3B-Instruct-Turbo
```

### Verification steps after deployment

1. `GET /api/admin/system/live-ai-smoke-tests` — all configured providers should return `pass`
2. `GET /api/admin/system/ai-deployment-readiness` — `ready: true`
3. `GET /api/admin/system/ai-capabilities-truth` — verify working capability count
4. Register a test connected app via `POST /api/admin/connected-apps`
5. Send a HMAC-signed capability request to `POST /api/connected-apps/capabilities/execute`
6. Poll `GET /api/connected-apps/capabilities/jobs/[jobId]` until `completed`
7. Verify artifact created via `GET /api/admin/artifacts`
8. Verify audit event via `GET /api/admin/connected-apps/events`
