# AmarktAI Network V1 Source Of Truth Checklist

Last updated: 2026-06-20

## Phase Scope

This document is the running V1 source-of-truth checklist. Current authorized scope is Phase 0 and Phase 1 only.

- Phase 0: audit, proof, source-of-truth checklist.
- Phase 1: provider truth/routing foundation and deploy asset reliability.
- Not authorized in this pass: long-form video implementation, avatar implementation, adult media implementation, brand workflows, self-learning, expensive media generation.

## Repo State

| Item | Value |
|---|---|
| Expected VPS repo | `/var/www/amarktai/platform` |
| Local repo used for patch prep | `C:\Users\digit\Code\Amarktai-Network-2` |
| Branch | `integration/cline-source-of-truth` |
| Current commit inspected locally | `c53bfe3` |
| Local working tree before edits | Clean |
| VPS transcript before this pass | Fast-forwarded to `13dbde3`; tests failed on one MiMo env override assertion; proof exited cleanly |

## Phase 0 Command Proof

| Command | Local result | VPS transcript result |
|---|---|---|
| `git status -sb` | Clean before edits | Branch clean except generated proof files before restore and untracked `hf-*.json` files |
| `git log --oneline -10` | Confirmed branch history through `c53bfe3` | Confirmed branch fast-forward to `13dbde3` in transcript |
| `npm test -- --run` | Passed: 43 files, 603 tests | Failed before `c53bfe3` on MiMo env override assertion |
| `npx tsc --noEmit --pretty false` | Passed | Not reached in transcript because command chain continued later; build passed |
| `npm run build` | Passed | Passed |
| `npx tsx scripts/v1-25-capability-proof.ts` | Passed; local no DB/provider keys | Passed on VPS with `.env`, DB, DB-backed keys, phase logging, and clean exit |

## Static Asset Proof

| Check | Result |
|---|---|
| Built asset discovered | `/_next/static/chunks/webpack-6aac5d3686ee1073.js` |
| Local HTTP check | `curl -I http://127.0.0.1:3000/_next/static/chunks/webpack-6aac5d3686ee1073.js` returned `HTTP/1.1 200 OK` |
| Phase 1 fix | `npm run build` now runs a repo-owned postbuild standalone asset copy |

## Credential Truth

| Provider | Local `getMeshCredential` | VPS transcript |
|---|---|---|
| GenX | Missing | DB-backed key resolution completed |
| Together | Missing | DB-backed key resolution completed |
| Hugging Face | Missing | DB-backed key resolution completed |
| Qwen/DashScope | Missing | DB-backed key resolution completed |
| MiMo | Missing | DB-backed key resolution completed |
| Groq | Missing | DB-backed key resolution completed |

Local credential proof is intentionally non-secret and reports only `MISSING` or `SET length=N`. VPS proof must remain the live credential source of truth.

## DB Truth Inspection

The repo schema includes the required truth tables/models:

- `AiProvider`
- `IntegrationConfig`
- `ProviderPerformance`
- `Artifact`
- `VideoGenerationJob`
- `MusicGenerationJob`
- `CapabilityTrace`
- `ControlPlaneJob`
- `ControlPlaneAttempt`

Local DB inspection could not run because local `DATABASE_URL` is absent. VPS transcript shows `.env` loaded, DB check completed, and provider key resolution completed. Future VPS audits must query these tables with secrets redacted.

## Proof Summary

| Runtime | LIVE_PROVEN | SOURCE_WIRED | PROVIDER_AVAILABLE | BLOCKED | NOT_WIRED |
|---|---:|---:|---:|---:|---:|
| Local Windows/no DB | 0 | 6 | 0 | 19 | 0 |
| VPS transcript after `13dbde3` | 11 | 6 | 0 | 7 | 1 |

The VPS proof is the live runtime source. The local proof only proves the CLI exits cleanly without DB/provider configuration.

## Phase Checklist

| Phase | State | Gate |
|---|---|---|
| Phase 0 audit | Done locally; VPS rerun needed after this commit | VPS `npm test -- --run`, `tsc`, build, proof all pass |
| Phase 1 provider truth foundation | Partially done in source | Provider/capability matrix stays current; blockers include fix paths |
| Phase 1 standalone deploy assets | Done in this pass | `npm run build` copies `.next/static` and `public` into `.next/standalone` |
| Phase 2 provider contract completion | Not started | Phase 1 VPS proof clean |
| Phase 3 media workflows | Not started | Provider contracts and artifact proof clean |
| Phase 4 avatar/voice/adult | Not started | Media/artifact gates clean |
| Phase 5 brand/research/self-learning | Not started | Tooling and memory stack proven |
| Phase 6 app workflows | Not started | Brain routes proven by app capability |
| Phase 7 dashboard creative operating system | Not started | Runtime truth proven |
| Phase 8 production hardening | Not started | End-to-end proof complete |

## Provider Status Matrix

| Provider | Credential path | Catalog state | Contract state | Default role | Diagnostic state | Fix path |
|---|---|---|---|---|---|---|
| GenX | `getMeshCredential`/provider config | Source-wired; VPS credential present | Text/image/video/music/TTS/STT adapters exist; music capped at 30s | Paid first-class premium provider | Some live model execution still needs VPS proof per capability | Reverify GenX model list/jobs/files/webhooks; improve per-capability best-model defaults; compose or reroute >30s music |
| Hugging Face | `getMeshCredential`/provider config | Public catalog curated; VPS credential present | Core image/STT/TTS/embeddings/rerank routes; specialist endpoints required for music/video/adult | Paid first-class specialist provider | `endpoint_required` for specialist media | Configure `HF_ENDPOINT_*` or `HF_SPECIALIST_ENDPOINTS_JSON`; validate model-specific response normalization and artifact persistence |
| Qwen/DashScope | `getMeshCredential`; free/allocated tokens first | Source-wired; VPS credential present | Chat/image/native AIGC/video task contracts represented | Low-cost/free-token candidate, especially image/video | Paid usage requires explicit approval | Reverify region endpoint and model access; keep paid Qwen disabled unless approved |
| MiMo | `getMeshCredential`; `MIMO_API_KEY`/`XIAOMI_API_KEY` | Source-wired; VPS credential present | Chat via OpenAI-compatible API; ASR via `chat/completions` `input_audio`; TTS route present | Paid first-class reasoning/audio provider | Backend runtime endpoint must remain separate from tool-plan assumptions | Confirm account model access and base URL; verify TTS/ASR live responses on VPS |
| Groq | `getMeshCredential`/provider config | Source-wired; VPS credential present | Chat, STT, TTS only | Free/fast text/audio provider | No image/video/music contract | Live-prove chat/STT/TTS; do not add unsupported media |
| Together | `getMeshCredential`/provider config | Source-wired; VPS credential present | Image executable; video async create/poll contract wired | Free/low-cost image/video fallback | Video account/model access still requires VPS live proof | Reverify `/videos`, poll, `outputs.video_url`, download-to-local artifact path |

## Capability Status Matrix

| Capability | Default route intent | Fallback route intent | Current proof state | Blocker/Fix path |
|---|---|---|---|---|
| Chat/text | Brain chooses GenX/Qwen/MiMo/Groq/Together/HF by policy | Fallback by health, cost, quality | VPS live-proven subset | Preserve rejected candidates and reasons |
| Reasoning/coding | GenX/Qwen/MiMo/Groq/Together | Same | VPS live-proven subset | Provider/model scoring must remain capability-specific |
| Image | Qwen/Together/GenX/HF | Policy fallback | VPS live-proven subset | Ensure artifact local storage and preview/download |
| Image edit | Qwen/GenX/Together/HF where source image exists | Fallback after source validation | VPS timeout observed for `image_editing_source_transform` | Add per-provider source image contract checks and cap attempts after provider contract failure |
| Short video | GenX/Qwen/Together | Fallback by model access and duration | Source-wired/VPS proof needs media smoke | Reverify account/model access; persist provider URL to local artifact |
| Image-to-video | Qwen/GenX | Provider fallback | Source-wired/blocker in proof | Validate real source image input and provider model support |
| TTS | MiMo/Groq/Together/GenX/HF | Provider fallback | VPS live-proven subset | Confirm MiMo/Groq/Together response bytes and local artifact |
| STT | Groq/GenX/HF/Together/MiMo | Provider fallback | VPS live-proven subset | Confirm MiMo `input_audio` route and transcript artifact behavior |
| Embeddings | Qwen/HF/Together where catalog supports | Provider fallback | Blocked locally; VPS live proof needed | Verify provider model availability and no artifact required |
| Rerank | HF/Together | Provider fallback | Blocked locally; VPS live proof needed | Confirm known rerank model request/response contract |
| Web research | Chat provider plus local tools | Provider fallback | Blocked locally; VPS needs tool proof | Install/wire Scrapy or Trafilatura; Playwright already present locally |
| Talking avatar | Future lip-sync adapter | None until tool installed | Blocked | Install/configure Rhubarb or replacement and adapter boundary |
| Long-form video | Future multi-scene planner/composer | Future | Blocked | Phase 3; needs ffmpeg/ffprobe and provider clip generation |
| Adult media | Policy-gated image/video/private endpoints | Provider fallback only with adult gate | Blocked locally | Phase 4; requires adult policy gate and provider/private endpoint setup |

## Diagnostic Blockers And Fix Paths

| Blocker | Evidence | Likely cause | Fix path | Files involved | User/account action |
|---|---|---|---|---|---|
| Local DB/credentials missing | Local proof: `DATABASE_URL` absent; credentials `MISSING` | Local workstation intentionally lacks VPS `.env` | Run live proof on VPS only; keep local proof as CLI health check | `scripts/load-repo-env.ts`, `scripts/v1-25-capability-proof.ts` | No |
| VPS test failure before `c53bfe3` | Transcript: MiMo endpoint assertion received env override | Unit test read `MIMO_BASE_URL` from VPS `.env` | Fixed by isolating provider truth test from deployment env | `src/lib/__tests__/phase1-provider-truth-layer.test.ts` | No |
| HF specialist media endpoints | Proof/classification: endpoint required | Public HF catalog does not guarantee executable private media endpoint | Configure `HF_ENDPOINT_MUSIC_GENERATION`, `HF_ENDPOINT_TEXT_TO_VIDEO`, `HF_ENDPOINT_IMAGE_TO_VIDEO`, or `HF_SPECIALIST_ENDPOINTS_JSON` | `src/lib/hf-specialist-config.ts`, `src/lib/ai-capability-adapters.ts` | Yes, if endpoint not provisioned |
| GenX >30s music | Duration cap test and adapter diagnostics | Current GenX music model returns short clips only | Route to provider supporting requested duration or segment/compose clips in Phase 3 | `src/lib/ai-capability-adapters.ts`, `src/lib/providers/provider-scoring.ts` | Possibly, for model access |
| Together video live proof | Source-wired; needs VPS media smoke | Account/model access or async result fetch may fail live | Verify `/videos`, poll by job id, fetch URL, persist local artifact | `src/lib/ai-capability-adapters.ts`, `src/lib/media-job-store.ts` | Maybe, if model not enabled |
| Qwen paid policy | Billing gate in provider scoring | Qwen paid models must not run without approval | Keep free/allocated token routes first; require explicit paid enablement | `src/lib/providers/provider-scoring.ts`, `src/lib/providers/provider-truth.ts` | Yes for paid usage |
| Redis/BullMQ | Local proof: not reachable | `REDIS_URL` absent/service not running locally | Install/start Redis and set `REDIS_URL`; run worker | `scripts/worker.mjs`, `src/lib/control-plane-jobs.ts` | Server setup |
| Qdrant | Local proof: not reachable | `QDRANT_URL` absent/service not running locally | Run Qdrant and set `QDRANT_URL` | `src/lib/vector-store.ts` | Server setup |
| Scrapy/Trafilatura | Local proof missing modules | Python packages absent | `python -m pip install scrapy trafilatura` | Research runtime/tool readiness | Server setup |
| ffmpeg/ffprobe | Local proof missing binaries | Tools not installed locally | `sudo apt-get install -y ffmpeg`; verify `ffprobe` | Long-form/video/music duration proof | Server setup |
| Rhubarb/lip-sync | Local proof missing binary | No lip-sync executable/service | Install Rhubarb or replacement and set path/service URL | Avatar video route/orchestrator | Server setup |

## Source Files Inspected

Inspected or searched before Phase 1 edits:

- `src/lib/brain.ts`
- `src/lib/provider-mesh-status.ts`
- `src/lib/provider-mesh.ts`
- `src/lib/providers.ts`
- `src/lib/provider-registry.ts`
- `src/lib/provider-performance.ts`
- `src/lib/providers/provider-truth.ts`
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/provider-scoring.ts`
- `src/lib/providers/provider-types.ts`
- `src/lib/capability-routing-policy.ts`
- `src/lib/universal-model-catalog.ts`
- `src/lib/ai-capability-adapters.ts`
- `src/lib/orchestrator.ts`
- `src/lib/media-studio.ts`
- `src/lib/canonical-media-artifact.ts`
- `src/lib/artifact-store.ts`
- `src/lib/media-job-store.ts`
- `src/lib/video-route-specs.ts`
- `src/lib/long-form-video.ts`
- `scripts/v1-25-capability-proof.ts`
- `package.json`
- `scripts/`
- `src/app/admin/dashboard/studio/page.tsx`
- `src/app/api/admin/studio/execute/route.ts`
- `src/app/api/brain/video-generate/[jobId]/route.ts`
- provider settings test routes for Qwen, HF, Together, Groq, generic provider

## Official Docs Checked

- GenX Router REST API: unified text/image/video/voice/audio router.
- Hugging Face Inference Providers and task API reference.
- Hugging Face Inference Endpoints for dedicated/private endpoint setup.
- Together video generation: async create job and poll result; output URL is under `outputs`.
- Alibaba/Qwen DashScope: Qwen image native endpoint and region-specific keys/endpoints.
- Xiaomi MiMo: OpenAI-compatible base URL and ASR via `/v1/chat/completions` with `input_audio`.
- Groq: chat completions, STT, and TTS endpoints.

## Next Phase Gates

Do not start Phase 2 until all of these pass on VPS after this change:

1. `git status -sb`
2. `npm test -- --run`
3. `npx tsc --noEmit --pretty false`
4. `npm run build`
5. `npx tsx scripts/v1-25-capability-proof.ts`
6. Static asset `curl -I` check returns 200 from the deployed/standalone runtime.
7. `V1_PROVIDER_CAPABILITY_MATRIX.md` remains updated with any new live proof.

