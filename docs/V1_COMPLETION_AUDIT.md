# V1 Completion Audit

Date: 2026-06-22

Canonical branch audited: `integration/cline-source-of-truth`

Current audited HEAD: `1233655fd19ee02247725c27c06d89e411b1d704`

Primary proof inputs:
- `V1_25_CAPABILITY_PROOF.md`
- `V1_25_CAPABILITY_PROOF.json`

Audit scope:
- Strict audit only
- No fixes implemented
- No dashboard redesign performed
- No providers added
- No secrets printed

## 1. Current Proven State

Current VPS proof summary from `V1_25_CAPABILITY_PROOF.md:26-32`:

| Status | Count |
|---|---:|
| LIVE_PROVEN | 11 |
| SOURCE_WIRED | 11 |
| PROVIDER_AVAILABLE | 0 |
| BLOCKED | 3 |
| NOT_WIRED | 0 |

Exactly LIVE_PROVEN from `V1_25_CAPABILITY_PROOF.md:118-138`:

| Capability | Provider | Model | Artifact / Job | Proof file evidence |
|---|---|---|---|---|
| `chat_text_generation` | `groq` | `meta-llama/llama-4-scout-17b-16e-instruct` | none | `V1_25_CAPABILITY_PROOF.md:118` |
| `reasoning` | `groq` | `meta-llama/llama-4-scout-17b-16e-instruct` | none | `V1_25_CAPABILITY_PROOF.md:119` |
| `coding_assistant` | `groq` | `meta-llama/llama-4-scout-17b-16e-instruct` | none | `V1_25_CAPABILITY_PROOF.md:120` |
| `web_research` | `groq` | `meta-llama/llama-4-scout-17b-16e-instruct` | artifact `dd394a94-c6d8-4ac2-9ce2-d857c98d6fcd`; vector diagnostics present | `V1_25_CAPABILITY_PROOF.md:121` |
| `embeddings` | `huggingface` | `BAAI/bge-small-en-v1.5` | none | `V1_25_CAPABILITY_PROOF.md:124` |
| `text_to_image` | `together` | `black-forest-labs/FLUX.1-schnell` | artifact `83a598db-3ea0-43ec-9629-f80308724a35` | `V1_25_CAPABILITY_PROOF.md:126` |
| `text_to_video_short_clip` | `genx` | `grok-imagine-video` | job `05dc4496-df60-4726-a92a-72b9c6a94602`; poll URL `/api/brain/media-jobs/05dc4496-df60-4726-a92a-72b9c6a94602` | `V1_25_CAPABILITY_PROOF.md:128` |
| `text_to_speech` | `groq` | `canopylabs/orpheus-v1-english` | artifact `afb3d50a-6b83-4874-b605-5f7245811197` | `V1_25_CAPABILITY_PROOF.md:129` |
| `speech_to_text` | `genx` | `genxlm-pro-v1-tr` | provider job `gnxsh_job_30595c2b667842e28daa315046c12ad3` | `V1_25_CAPABILITY_PROOF.md:130` |
| `avatar_library_avatar_image_generation` | `genx` | `gpt-image-2` | job `41e52b79-a537-4369-919d-996e539c3e54`; poll URL `/api/brain/media-jobs/41e52b79-a537-4369-919d-996e539c3e54` | `V1_25_CAPABILITY_PROOF.md:135` |
| `provider_auto_selection` | `groq` | `meta-llama/llama-4-scout-17b-16e-instruct` | none | `V1_25_CAPABILITY_PROOF.md:138` |

Important proof notes:
- `web_research` is now genuinely live-proven with non-empty vector IDs, retrieved vector diagnostics, provider/model, and persisted research artifact evidence. Source: `V1_25_CAPABILITY_PROOF.md:121`.
- `embeddings` is live-proven through Hugging Face, but that does not prove Hugging Face is generally top-tier across text/image/video/audio routes. Source: `V1_25_CAPABILITY_PROOF.md:124`.
- Async proof exists for short video, STT, and avatar image via job evidence, but that does not prove long-form media workflows are complete. Sources: `V1_25_CAPABILITY_PROOF.md:128,130,135`.

## 2. Source-Wired But Not Product-Ready

Current SOURCE_WIRED items from `V1_25_CAPABILITY_PROOF.md:122-142`:

| Capability | What exists in source | What is missing for live proof | User-facing workflow blocked |
|---|---|---|---|
| `summarization` | Admin/provider capability test surface exists. Source: `src/app/api/admin/provider-capability-test/route.ts`; proof: `V1_25_CAPABILITY_PROOF.md:122`. | Dedicated connected-app request schema and normalized result contract are not wired. | A first-class capability-only summarization product/API contract for apps. |
| `translation` | Admin/provider capability test surface exists. Source: `src/app/api/admin/provider-capability-test/route.ts`; proof: `V1_25_CAPABILITY_PROOF.md:123`. | Dedicated connected-app request schema and normalized result contract are not wired. | Capability-only translation for connected apps and clean product contract. |
| `image_editing_source_transform` | Canonical `image_edit` route exists. Sources: `src/app/api/brain/image-edit/route.ts:4-8`, `src/lib/providers/execution.ts`; proof: `V1_25_CAPABILITY_PROOF.md:127`. | All eligible provider/model attempts failed in proof. The repo also contains older docs saying image edit is placeholder/unavailable. Source conflict: `docs/MEDIA_RUNTIME_TRUTH.md:10-12`. | Source-image transform editing as a reliable operator or app workflow. |
| `agent_request_execution` | Brain agent request route is wired. Source: `src/app/api/brain/agent-request/route.ts`; proof: `V1_25_CAPABILITY_PROOF.md:131`. | Live proof requires `AMARKTAI_CONNECTED_APP_SECRET` or `AMARKTAI_APP_SECRET_AMARKTAI_NETWORK`. | Signed in-platform agent request execution. |
| `connected_app_capability_execution` | Capability-only connected app execution is source-wired through central runtime. Source: `src/lib/connected-app-capability-engine.ts:232-317`; proof: `V1_25_CAPABILITY_PROOF.md:132`. | Live proof requires active signed app registry entry and real signing secret; harness does not fabricate HMAC identity. | Real connected apps using signed capability execution end to end. |
| `image_to_video` | Canonical `image_to_video` route and source-image detection exist. Sources: `src/app/api/brain/video-generate/route.ts:4-13`, `src/lib/providers/execution.ts`; proof: `V1_25_CAPABILITY_PROOF.md:133`. | All eligible provider/model attempts failed in proof. | Image-driven motion generation workflow. |
| `long_form_multi_scene_video_assembly` | Multi-scene planning, scene jobs, FFmpeg assembly, artifact persistence, and admin projects route exist. Sources: `src/lib/long-form-video.ts:100-383`, `src/app/api/admin/video-projects/route.ts:38-68`; proof: `V1_25_CAPABILITY_PROOF.md:134`. | Proof requires DB-backed project creation and at least one generated clip in target environment. Current repo still uses local JSON as core store for video projects. Source: `src/lib/long-form-video.ts:5-11,89-98`. | End-to-end long-form rendered video workflow. |
| `provider_fallback` | Fallback loop exists in orchestrator. Source: `src/lib/orchestrator.ts:420-504`; proof: `V1_25_CAPABILITY_PROOF.md:139`. | Needs controlled first-provider failure and second-provider success in target runtime. | Verified operator confidence that fallback really recovers production traffic. |
| `strict_provider_proof_mode` | Single-provider proof surfaces exist. Source: `src/app/api/admin/provider-capability-test/route.ts`; proof: `V1_25_CAPABILITY_PROOF.md:140`. | Needs authenticated server-side invocation in target environment. | Clean, operator-safe one-provider proof workflow. |
| `route_outcome_logging` | Capability tracing and route outcome logging are wired. Sources: `src/lib/capability-tracing.ts`, `src/lib/orchestrator.ts`; proof: `V1_25_CAPABILITY_PROOF.md:141`. | Needs DB-backed runtime request and persisted trace inspection. | Trustworthy runtime trace review for production incidents. |
| `worker_job_retry_and_polling_completion` | Control-plane jobs, media jobs, queueing, and polling code exist. Sources: `src/lib/control-plane-jobs.ts`, `src/lib/media-job-store.ts`; proof: `V1_25_CAPABILITY_PROOF.md:142`. | Needs real queued async provider job plus Redis/BullMQ and persisted job state in target environment. | Reliable async completion, retry, and polling for media jobs. |

General source-wired/product gap:
- Several features are source-wired only because proof requires external env, signing, or live queued jobs.
- Several others are source-wired because the user-facing capability contract is still incomplete even though an admin/test surface exists.

## 3. Blocked Items

Current BLOCKED items from `V1_25_CAPABILITY_PROOF.md:125,136-137`:

| Capability | Exact blocker | Exact next action | Source / proof |
|---|---|---|---|
| `rerank_search_relevance` | Rerank route is source-wired, but live proof requires `HF_ENDPOINT_RERANK` or `HF_SPECIALIST_ENDPOINTS_JSON` for a Hugging Face specialist rerank endpoint, or `TOGETHER_DEDICATED_ENDPOINTS_JSON` for a Together dedicated rerank endpoint. | Configure one truthful rerank execution path, then rerun proof. | `V1_25_CAPABILITY_PROOF.md:125`; `src/lib/providers/provider-capability-contracts.ts:58-63,140-154` |
| `talking_avatar_video` | `src/app/api/brain/avatar-video/route.ts` delegates to `avatar_video`, but runtime has no approved Rhubarb/lip-sync binary/service adapter configured. | Install/configure a lip-sync adapter and expose executable path or service URL before proof. | `V1_25_CAPABILITY_PROOF.md:136`; `src/app/api/brain/avatar-video/route.ts:4-8`; `ACTIVE_OPEN_SOURCE_STACK.md:17` |
| `adult_media_policy_gated_generation` | No adult provider is approved for this app. Adult capability is gated by app/provider approval, not just route existence. | Configure and test one approved adult provider/model in the app adult capability profile, then rerun proof. | `V1_25_CAPABILITY_PROOF.md:137`; `src/lib/orchestrator.ts`; `src/app/api/admin/app-safety/route.ts:119-138` |

Other blocked conditions discovered in source and proof layers:

| Item | Exact blocker | Exact next action | Source |
|---|---|---|---|
| Hugging Face specialist routes | HF specialist endpoint envs are missing for rerank, image edit, video, image-to-video, music, TTS, STT in runtime truth surfaces. | Configure exact `HF_ENDPOINT_*` or `HF_SPECIALIST_ENDPOINTS_JSON` routes intended for launch and align truth surfaces with actual adapter behavior. | `V1_25_CAPABILITY_PROOF.md:49`; `V1_25_CAPABILITY_PROOF.json:125-240`; `src/lib/provider-runtime-truth.ts`; `src/lib/hf-specialist-config.ts:47-69` |
| Together video / I2V | `TOGETHER_VIDEO_RUNTIME_ENABLED=false`; historical `/videos` proof returned HTTP 404. | Only set the flag after actual Together `/videos` endpoint proof succeeds. | `V1_25_CAPABILITY_PROOF.md:50`; `V1_COMPLETION_TRACKER.md:72` |
| MiMo runtime API | `MIMO_RUNTIME_API_ENABLED=false`; token-plan catalog access is treated as distinct from proven backend runtime execution for gated capabilities. | Confirm backend runtime API access beyond token-plan visibility and set the flag only after proof. | `V1_25_CAPABILITY_PROOF.md:54`; `src/lib/providers/provider-capability-contracts.ts:72-74,199` |
| Rhubarb / lip-sync | Not installed or configured in active open-source stack. | Install Rhubarb or approved lip-sync service and wire path/URL. | `ACTIVE_OPEN_SOURCE_STACK.md:17` |

## 4. Provider/Model Truth Audit

### Summary

The repo has a substantial canonical provider-truth layer, but it still contains multiple competing routing layers, hardcoded provider orders, hardcoded model sets, seeded candidates, stale names, policy hints that can leak into runtime truth, and some bypasses of the central capability router.

### Hardcoded provider order

Hardcoded provider ordering exists in multiple layers:
- `src/lib/providers/provider-types.ts` defines canonical provider order.
- `prisma/seed.ts:412-418` seeds a different provider order.
- `src/lib/capability-routing-policy.ts:52-85` hardcodes category/provider ranking.
- `src/lib/ai-routing-policy.ts:73-78` hardcodes routing orders.
- `src/lib/brain/v1-capability-matrix.ts:265-268,272-367` hardcodes provider arrays per capability.
- `scripts/v1-25-capability-proof.ts:530,570,650,688` hardcodes provider iteration order.

Audit judgment:
- Provider order is not centrally singular.
- Some orders are policy/preference layers, not source-of-truth execution truth.
- This increases drift risk and can make provider priority appear like truth.

### Hardcoded model lists and seeded candidates

Hardcoded model sets exist in:
- `src/lib/universal-model-catalog.ts:118-163`
- `src/lib/provider-registry.ts:56-102`
- `src/lib/hf-specialist-config.ts:3-45`
- `src/lib/providers/provider-discovery.ts:135-158` for curated Hugging Face defaults
- `src/lib/ai-routing-policy.ts:121-132`
- `src/lib/provider-gateway.ts:26-46`
- `src/lib/app-profiles.ts:214-219,255-261,312-318,355-360,397-402,438-442`
- `src/lib/coding-agent.ts:139-177`
- `src/lib/multimodal-pipeline.ts:110-117`

Audit judgment:
- Hardcoded models still materially influence routing, app selection, proof surfaces, and workflow execution.
- Some hardcoded lists are acceptable as curated defaults or safety gates.
- They are not acceptable when they silently override live provider/model discovery or create stale fallback truth.

### Stale model names and drift

Examples of stale or drifting names:
- MiMo drift:
  - `mimo-v2-flash` in `src/lib/ai-routing-policy.ts:125`
  - `mimo-v2-pro` in `src/lib/multimodal-pipeline.ts:115`
  - current static catalog uses `mimo-v2.5`, `mimo-v2.5-pro`, `mimo-tts-1`, `mimo-v2.5-asr` in `src/lib/universal-model-catalog.ts:150-153`
- Together drift:
  - `meta-llama/Llama-3-70b-chat-hf` in `src/lib/ai-routing-policy.ts:126`
  - current static Together route uses `meta-llama/Llama-3.3-70B-Instruct-Turbo` in `src/lib/universal-model-catalog.ts:159`
- Hugging Face drift:
  - smoke defaults include `meta-llama/Llama-3.1-8B-Instruct` in `src/lib/live-smoke-tests.ts:123`
  - canonical HF text path elsewhere uses `mistralai/Mistral-7B-Instruct-v0.3`
- HF Wan video drift:
  - `Wan-AI/Wan2.1-T2V-14B-Diffusers` in `src/lib/universal-model-catalog.ts:132`
  - `Wan-AI/Wan2.1-T2V-14B` in `src/lib/providers/provider-discovery.ts:148,157`

### Policy hints treated as truth

Risk areas:
- HF runtime truth claims endpoint requirements for TTS/STT/image edit that are broader than canonical capability contracts. Evidence:
  - `src/lib/provider-runtime-truth.ts`
  - `src/lib/providers/provider-capability-contracts.ts:58-63,140-154`
- Adult-capable model hints are curated into catalog surfaces through `policy_gated_candidate` in `src/lib/providers/provider-discovery.ts:156-157,369-370,629-633`.

Audit judgment:
- Hardcoded adult model allowlists are acceptable only as policy/catalog safety gates.
- They must not enable adult generation without explicit adult mode, app permission, provider/model approval, safety classification, dashboard visibility, and audit logging.
- Current source mostly follows that principle, but the truth surfaces are not yet perfectly consistent.

### Direct provider/model choice surfaces

Still exposed in source:
- App-specific allowed/preferred models: `src/lib/app-profiles.ts:53-58,214-219,255-261,312-318,355-360,397-402,438-442`
- App package model selection: `src/lib/app-ai-package.ts:154-177`
- Admin brain selector: `src/app/api/admin/brain/selector/route.ts`
- Admin provider capability test: `src/app/api/admin/provider-capability-test/route.ts`
- Admin conversation stream: `src/app/api/admin/conversation/stream/route.ts`
- Provider gateway aliases: `src/lib/provider-gateway.ts:26-46`
- Coding agent direct provider/model choice: `src/lib/coding-agent.ts:139-177`
- Multimodal pipeline stage-specific provider/model selection: `src/lib/multimodal-pipeline.ts:110-117`

### Runtime bypasses of central capability routing

Canonical path:
- `src/lib/capability-router.ts:22-26` -> `executeCapabilityOrchestration`

Known bypasses:
- `src/app/api/admin/provider-capability-test/route.ts`
- `src/app/api/admin/brain/selector/route.ts`
- `src/app/api/admin/conversation/stream/route.ts`
- `src/lib/provider-gateway.ts`
- `src/lib/specialist-provider-routes.ts`
- `src/lib/coding-agent.ts`
- `src/lib/brain.ts`
- `src/lib/universal-provider-call.ts`
- `src/lib/workflow-engine.ts:247-257`

Audit judgment:
- The central router is real and important.
- The repo still contains multiple compatibility/direct-execution paths that can bypass central capability-only truth.
- The biggest architectural bypass for product workflows is `workflow-engine.ts:247-257`, which directly calls `callProvider(provider, model, ...)`.

## 5. Hugging Face Audit

### Why Hugging Face only normalizes/discovers about 15 useful models

Current proof shows:
- Hugging Face raw fetch count: `100`
- Hugging Face normalized count: `15`

Source: `V1_25_CAPABILITY_PROOF.md:62`

Primary reasons:

1. Discovery fetch is capped and not paginated.
- `src/lib/providers/provider-discovery.ts:447-455` sets `limit=100` and `full=true`.
- No pagination loop exists.

2. HF results are aggressively curated.
- `src/lib/providers/provider-discovery.ts:331-372`
- Only allowlisted IDs or strong capability-descriptor matches are retained.
- If nothing strongly matches, the fallback is `records.slice(0, 12)` at `src/lib/providers/provider-discovery.ts:349`.

3. Curated defaults are injected instead of widening truthful coverage.
- `src/lib/providers/provider-discovery.ts:353-371`

4. HF is denied provider-contract fallback.
- `src/lib/providers/model-discovery.ts:86-93`
- Specifically `if (provider === 'huggingface') return false` at `:87`

This means Hugging Face is structurally under-normalized compared with the number of raw records the provider fetch actually sees.

### Catalog fetch limit / pagination

Findings:
- Discovery request: `https://huggingface.co/api/models?limit=100&full=true`
  - `src/lib/providers/provider-discovery.ts:449-454`
- Hugging Face sync is also capped and non-paginated.
  - `src/lib/huggingface-catalog-sync.ts:33-41`

Audit judgment:
- Hugging Face is under-sampled.
- A provider with HF's size cannot be represented accurately by one non-paginated request plus aggressive curation.

### Filtering / classification logic

Important files:
- Capability-to-pipeline mapping: `src/lib/providers/provider-discovery.ts:26-49`
- Task-to-capability mapping: `src/lib/providers/provider-discovery.ts:51-120`
- Descriptor-based classification and inference: `src/lib/providers/provider-discovery.ts:598-609,618-633,688-699` and later descriptor matching logic in the same file

Audit judgment:
- HF is classified through a mix of task metadata, descriptor matches, curated defaults, and route-type heuristics.
- This can be accurate for a curated launch subset, but it is not enough to make HF a top provider across the full stack.

### Endpoint / specialist endpoint requirements

Current truth:
- HF specialist requirements are surfaced in proof and runtime truth for rerank, image edit, video, image-to-video, music, TTS, and STT.
- Proof evidence: `V1_25_CAPABILITY_PROOF.md:49`
- JSON evidence: `V1_25_CAPABILITY_PROOF.json:125-240`
- Specialist config file: `src/lib/hf-specialist-config.ts:47-69`
- Canonical capability contract file: `src/lib/providers/provider-capability-contracts.ts:58-63,140-154`

Audit judgment:
- The repo currently contains inconsistent HF truth layers.
- Some surfaces claim broader specialist-endpoint requirements than the canonical capability contract strictly enforces.
- This inconsistency is one reason HF looks more blocked than it probably needs to on some routes.

### Missing HF model categories

HF declared provider capabilities are broad:
- `chat`, `reasoning`, `coding`, `vision`, `ocr`, `image`, `image_edit`, `video`, `music`, `tts`, `stt`, `embeddings`, `rerank`, `documents`, `translation`, `avatar`, `adult_image`, `adult_video`
- Source: `src/lib/providers/provider-truth.ts:27-31`

But HF is underused because many categories are not fully executable in canonical routing and many are represented by tiny curated sets.

### HF role by capability

| Area | Current role |
|---|---|
| Text | Underused; mostly one curated text model surface plus compatibility/admin drift |
| Image | Present but not dominant; text-to-image has live proof on Together, not HF |
| Image edit | Source-wired but specialist truth/config is incomplete |
| Video | Source-visible but specialist endpoint proof missing |
| Audio | TTS/STT adapter truth exists but runtime truth is inconsistent |
| Embeddings | Strongest HF success area; LIVE_PROVEN with `BAAI/bge-small-en-v1.5` |
| Rerank | BLOCKED pending specialist endpoint |
| Adult-gated | Candidate-only through policy-gated catalog entries; not unrestricted |

### Is HF being underused?

Yes.

Repo-backed reasons:
- normalization is tiny relative to raw fetch count
- no pagination
- no provider-contract fallback
- multiple stale/static model surfaces
- several categories are declared but not fully executable in canonical routing
- static routing order tends to favor other providers first

### Exact files needing changes to make HF a top provider

Most important files:
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/brain/v1-capability-matrix.ts`
- `src/lib/universal-model-catalog.ts`
- `src/lib/provider-registry.ts`
- `src/lib/ai-routing-policy.ts`
- `src/lib/capability-routing-policy.ts`
- `src/lib/universal-provider-call.ts`
- `src/lib/provider-runtime-truth.ts`
- `src/lib/hf-specialist-config.ts`
- `src/lib/specialist-provider-routes.ts`

### HF adult-capable candidate families that should be added only under adult gating

Candidate families surfaced in source:
- RealVisXL / DreamShaper / SDXL-derived adult-capable image families
- Flux NSFW families
- NSFW Wan / LTX adult-capable video families
- uncensored Gemma / Llama / Mistral / DeepSeek / Qwen text families

Source: `src/lib/adult-model-catalog.ts:60-320`

These should remain candidate-only and require all of:
- adult mode on
- app adult permission
- provider/model adult approval
- safety classification
- dashboard visibility
- audit logging

## 6. Xiaomi MiMo Audit

### Why MiMo is still not working properly

MiMo is partially live for generic text/chat-style execution, but it is not fully trustworthy as a first-class runtime across the capabilities implied by the repo.

### Credential path

Canonical credential/env aliases:
- `MIMO_API_KEY`
- `XIAOMI_API_KEY`

Source: `src/lib/providers/provider-truth.ts:170-195`

Key resolution path:
- `src/lib/provider-config.ts:37-57`
- `src/lib/service-vault.ts:48-66`

### Catalog discovery

MiMo discovery is wired through `/models`:
- `src/lib/providers/provider-truth.ts:179-185`

Proof shows MiMo catalog is visible:
- `V1_25_CAPABILITY_PROOF.md:60`

### Runtime flags

MiMo runtime gating is explicit:
- `MIMO_RUNTIME_API_ENABLED=false` in current proof truth
- `V1_25_CAPABILITY_PROOF.md:54`

Contract gating:
- `src/lib/providers/provider-capability-contracts.ts:72-74,86,106,113,199`

### Token-plan/tool-plan vs real runtime execution

Current repo truth:
- Chat/coding/reasoning can execute through generic compatible-mode style paths.
- TTS/STT/agents are still treated as gated or tool-plan-only until runtime API proof is real.

Evidence:
- MiMo TTS adapter path: `src/lib/ai-capability-adapters.ts:996-1033`
- MiMo ASR adapter path: `src/lib/ai-capability-adapters.ts:1036-1082`
- Generic direct compatible-mode execution plane: `src/lib/universal-provider-call.ts:41-49,135-170,237-284`

Audit judgment:
- MiMo is not a cleanly settled truth surface.
- The repo itself distinguishes token-plan catalog visibility from approved backend runtime execution.

### MiMo coding agent/model capability mapping

MiMo provider truth claims:
- `chat`, `reasoning`, `coding`, `vision`, `tts`, `stt`, `agents`
- `src/lib/providers/provider-truth.ts:187-193`

But actual discovery/runtime rules are narrower:
- `src/lib/providers/model-discovery.ts:88-90` only gives MiMo provider-contract fallback for `chat`, `reasoning`, `coding`, `tts`
- `src/lib/providers/provider-discovery.ts:621-627` marks MiMo `image` and `agents` as `ADAPTER_MISSING`

### Why MiMo coding agents are not being used

Reasons:
- There is no canonical MiMo coding-agent/tool-agent route in provider truth.
- Coding agent code bypasses the canonical capability router and chooses providers/models directly.
  - `src/lib/coding-agent.ts:139-177`
- MiMo `toolCalling` is false in provider truth.
  - `src/lib/providers/provider-truth.ts:188-193`
- MiMo `agents` capability is treated as adapter-missing or tool-plan-only.

Audit judgment:
- MiMo may be usable as a text model for coding responses.
- It is not proven as a genuine coding-agent executor in this repo.

### Source files controlling MiMo truth

- `src/lib/providers/provider-truth.ts`
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/providers/provider-capability-contracts.ts`
- `src/lib/provider-runtime-truth.ts`
- `src/lib/universal-provider-call.ts`
- `src/lib/ai-capability-adapters.ts`
- `src/lib/coding-agent.ts`
- `src/lib/provider-gateway.ts`
- `src/lib/multimodal-pipeline.ts`

### Exact proof needed to mark MiMo runtime execution live

Minimum truthful proof:
- a successful backend runtime invocation through the real execution path for the claimed MiMo capability
- provider selected = `mimo`
- model selected = real runtime model
- real output/artifact/transcript/job returned
- not just `/models` catalog access
- not just token-plan visibility
- for gated capabilities, `MIMO_RUNTIME_API_ENABLED=true` and confirmed backend runtime API access

Repo-backed statement of required next action:
- `Set MIMO_RUNTIME_API_ENABLED=true only when Xiaomi MiMo backend runtime API access is confirmed beyond token-plan catalog access.`
- Sources: `V1_25_CAPABILITY_PROOF.md:54`; `src/lib/provider-runtime-truth.ts`; `src/lib/providers/provider-capability-contracts.ts:199`

## 7. Content Generation Product Audit

Status key used here:
- `LIVE_PROVEN`: explicit proof file evidence
- `SOURCE_WIRED`: route/source exists, not fully proven
- `BLOCKED`: repo or proof explicitly blocks it
- `MISSING`: no meaningful productized implementation found

| Capability | Status | Basis |
|---|---|---|
| 30-second marketing reel | SOURCE_WIRED | Short-video generation exists and is proven at capability level, but no dedicated reel workflow/template/package is proven. Sources: `src/app/admin/dashboard/studio/page.tsx:97-105,129-145`; `V1_25_CAPABILITY_PROOF.md:128` |
| Branded short-form video | SOURCE_WIRED | Studio passes `brandKitId`, but clear brand application is not shown for ordinary short-form execution. Sources: `src/app/admin/dashboard/studio/page.tsx:121-124,249,406,421`; `src/app/api/admin/studio/execute/route.ts:199-203,262-264` |
| Long-form multi-scene video | SOURCE_WIRED | Pipeline exists with scene generation and FFmpeg assembly, but proof still classifies it source-wired. Sources: `src/lib/long-form-video.ts:100-383`; `V1_25_CAPABILITY_PROOF.md:134` |
| Image-to-video | SOURCE_WIRED | Route exists; proof says all eligible attempts failed. Sources: `src/app/api/brain/video-generate/route.ts:4-13`; `V1_25_CAPABILITY_PROOF.md:133` |
| Image editing/source transform | SOURCE_WIRED | Canonical route exists, but proof attempts failed. Sources: `src/app/api/brain/image-edit/route.ts:4-8`; `V1_25_CAPABILITY_PROOF.md:127` |
| Music/audio bed | SOURCE_WIRED | Music route/UI exists, artifact persistence exists, but not live-proven in current proof. Sources: `src/lib/brain/v1-capability-matrix.ts:364-365`; `src/app/api/admin/studio/execute/route.ts:155-176` |
| TTS voiceover | LIVE_PROVEN | `V1_25_CAPABILITY_PROOF.md:129` |
| STT/captions | LIVE_PROVEN for STT, SOURCE_WIRED for captions | STT is live-proven; subtitle/caption workflow is not separately proven. Sources: `V1_25_CAPABILITY_PROOF.md:130`; `src/app/api/brain/stt/route.ts:19-32` |
| Subtitles | MISSING | No dedicated subtitle track creation/export/burn-in workflow found. |
| Scene planning/storyboard | SOURCE_WIRED | Video planning exists, but that is planning, not rendered video. Sources: `src/app/api/brain/video/route.ts:4-8`; `docs/MEDIA_RUNTIME_TRUTH.md:13-15` |
| Artifact preview/download | SOURCE_WIRED platform-wide | Artifact library and preview/download exist, but that does not prove every media workflow is finished. Sources: `src/lib/artifact-store.ts:51-76,233-265`; `src/app/admin/dashboard/artifacts/page.tsx:146-221` |
| Brand-safe output | SOURCE_WIRED | Safety modes and adult gating exist, but no complete brand-safe review/approval workflow was found. Sources: `src/app/api/admin/app-safety/route.ts:86-138`; `src/lib/artifact-policy.ts:16-20` |

Audit judgment:
- Strongest product-ready subset today is text/image/short video/TTS/STT/artifacts/research.
- The full content-generation promise is not yet complete.

## 8. Brand Kit Audit

### What a proper AmarktAI brand kit must include

Minimum complete brand-kit product should include:
- logo/assets
- colors
- typography/fonts
- tone of voice
- audience/personas
- product/service descriptions
- offer/CTA rules
- visual style rules
- prohibited styles
- platform presets
- examples/references
- reusable templates
- per-app brand kits
- applied brand kit behavior during generation

### Current repo support

Supported in current backend model:
- logo URL
- logo artifact ID
- primary color
- secondary color
- single font preference
- tone of voice
- audience
- product notes
- usage notes
- app slug scoping in backend

Source: `src/lib/creative-workspaces.ts:20-35,88-113,155-165`

### Missing brand-kit capabilities

Missing or materially incomplete:
- multiple logo variants
- asset library beyond one logo reference
- full typography system
- iconography
- offer/CTA rules
- visual style rules
- prohibited styles / negative style rules
- platform presets
- examples/references
- reusable templates
- versioning / approval workflow
- legal/compliance packs
- locale/channel variants

### Per-app brand kits

Backend support exists:
- `src/lib/creative-workspaces.ts:52-85,119-152`

But admin UX currently weakens per-app isolation:
- hardcoded default app slug `amarktai-network` when saving kits/assets/projects
  - `src/lib/creative-workspaces.ts:69-70,92,130`
- Projects page hardcodes `appSlug: 'amarktai-network'`
  - `src/app/admin/dashboard/projects/page.tsx`
- Studio loads workspaces broadly, not as a strict per-app experience
  - `src/app/admin/dashboard/studio/page.tsx:164-167`

### Brand kit applied during content generation

Clearly applied:
- long-form video scene prompts include brand-kit prompt context
  - `src/lib/long-form-video.ts:124-134`
- long-form final assembly can add brand-color overlay
  - `src/lib/long-form-video.ts:336-367`

Only metadata-passed on broader studio execution:
- `src/app/api/admin/studio/execute/route.ts:199-203,262-264`

Connected apps only carry brand references in execution context; no complete resolution to workspace brand-kit store was confirmed:
- `src/lib/connected-app-capability-engine.ts:445-467`

Audit judgment:
- Brand kit support exists as lightweight metadata plus long-form video integration.
- It is not yet a complete brand-governed generation system.

## 9. Avatar Audit

| Area | Status | Basis |
|---|---|---|
| Avatar image generation | LIVE_PROVEN | `V1_25_CAPABILITY_PROOF.md:135` |
| Avatar library | SOURCE_WIRED | `src/app/admin/dashboard/avatars/page.tsx`; `src/lib/creative-workspaces.ts:37-50,119-152` |
| Reusable character profiles | SOURCE_WIRED but shallow | Current `AvatarAsset` schema is minimal. Source: `src/lib/creative-workspaces.ts:37-50` |
| Voice persona library | SOURCE_WIRED | `src/app/api/admin/voice-persona/route.ts:22-46,55-100`; `prisma/schema.prisma:1001-1007` |
| Talking avatar video | BLOCKED | `V1_25_CAPABILITY_PROOF.md:136`; `ACTIVE_OPEN_SOURCE_STACK.md:17` |
| Lip-sync / Rhubarb | BLOCKED | `ACTIVE_OPEN_SOURCE_STACK.md:17` |
| Avatar memory | MISSING | No general reusable avatar memory/continuity system found. |
| Avatar media history | SOURCE_WIRED | artifact/job linkage exists. Sources: `src/lib/creative-workspaces.ts:42-49`; `src/app/admin/dashboard/artifacts/page.tsx:160-177` |
| Avatar preview/download | SOURCE_WIRED | avatar cards + artifact library support preview/download |
| App-specific avatar permissions | SOURCE_WIRED/BLOCKED | capability declarations exist, but not a clean per-app avatar-permission product surface |

Audit judgment:
- Avatar images are real.
- Avatar asset management is basic.
- Talking avatars and richer persona continuity are not complete.

## 10. Connected Apps Audit

### Capability-only central runtime

Good current architecture:
- Connected apps are explicitly blocked from choosing provider/model/endpoint.
  - `src/lib/connected-app-capability-engine.ts:152-158`
- Execution goes through central capability routing.
  - `src/lib/connected-app-capability-engine.ts:232-317`

Important exception:
- Workflow engine directly calls providers instead of central capability routing.
  - `src/lib/workflow-engine.ts:247-257`

### App registry

Exists but not durable enough:
- `src/lib/connected-apps.ts` implements register/list/suspend/reactivate/delete.
- State is local JSON-backed, not DB-backed.

### Signed requests

Source-wired and real:
- HMAC verification in `src/lib/connected-app-capability-engine.ts:96-149`
- execute route in `src/app/api/connected-apps/capabilities/execute/route.ts`
- job polling route in `src/app/api/connected-apps/capabilities/jobs/[jobId]/route.ts`

### Permissions

Source-wired:
- capability scope enforcement: `src/lib/connected-app-capability-engine.ts:121-128`
- app scopes and registry types in `src/lib/connected-apps.ts`

### Budgets / cost policy

Partially wired:
- budget tracking exists in `src/lib/budget-tracker.ts`
- app package recommendation stores budget policy in `src/lib/app-ai-package.ts`
- connected apps resolve routing quality in `src/lib/connected-app-capability-engine.ts:237-241`

Gap:
- strong end-to-end per-app hard-stop budget enforcement was not clearly proven in connected-app execution path.

### App-specific memory / RAG

Config exists:
- `src/lib/app-profiles.ts:74-80,643-650`

Gap:
- no clear proof that connected-app execution automatically injects per-app retrieval/RAG on all relevant capability paths.

### Artifact ownership

Source-wired:
- `src/lib/connected-app-capability-engine.ts:383-421`
- `prisma/schema.prisma` artifact schema

### App route traces

Source-wired:
- `src/lib/capability-tracing.ts`
- trace schema in Prisma

### Required app workflows

| App workflow | Status | Audit note |
|---|---|---|
| Marketing App | SOURCE_WIRED | app profile exists; no dedicated final workflow builder/product dashboard |
| Horse App | SOURCE_WIRED | equine profile exists (`equiprofile`); no dedicated finished workflow surface |
| Crypto App | SOURCE_WIRED | profile exists; strong reasoning/profile rules, but shared dashboard only |
| Adult Creator App | BLOCKED | adult policy framework exists; adult media generation still blocked/policy-gated in proof |
| Customer Service / CRM | MISSING | no dedicated CRM app workflow surface found |
| Trading | SOURCE_WIRED | crypto/forex style support exists, but not a dedicated workflow product |
| Music | SOURCE_WIRED | music studio exists, but not a complete workflow product |
| Education | MISSING / weakly seeded | seeded product exists, but no strong dedicated app workflow surface found |
| Legal | MISSING | only public legal pages found, not a legal app workflow product |

Audit judgment:
- Connected apps have a strong architectural base.
- The product/workflow layer on top is still incomplete.
- The workflow engine bypass is a serious truth problem for a capability-only platform claim.

## 11. Dashboard Audit

### Current dashboard/admin pages that matter

Current major dashboard pages from `src/app/admin/dashboard/**/page.tsx`:
- `/admin/dashboard`
- `/admin/dashboard/command`
- `/admin/dashboard/studio`
- `/admin/dashboard/capabilities`
- `/admin/dashboard/connected-apps`
- `/admin/dashboard/jobs`
- `/admin/dashboard/artifacts`
- `/admin/dashboard/settings`
- `/admin/dashboard/providers`
- `/admin/dashboard/provider-matrix`
- `/admin/dashboard/music-studio`
- `/admin/dashboard/avatars`
- `/admin/dashboard/projects`

Canonical nav is still only:
- Command Center
- Studio
- Capabilities
- Apps
- Jobs
- Artifacts
- Settings

Source: `src/lib/dashboard-nav.ts:12-37`

### What is useful

Useful and worth preserving:
- Command Center
- Studio
- Capabilities
- Connected Apps
- Jobs
- Artifacts
- Settings

Support: `docs/DASHBOARD_RUNTIME_TRUTH.md:11-18,43-56`

### What is duplicated or confusing

Duplicated/confusing surfaces:
- Providers: useful for diagnostics, not for normal runtime workflow
- Provider Matrix: overlaps capability/provider truth surfaces
- Music Studio: overlaps Studio music workflow
- Avatars: overlaps what should be a Studio library
- Projects: overlaps creative workspaces/brand kits/studio project context

### What is missing

Missing or materially incomplete:
- unified provider truth panel
- model catalog browser UI worthy of the runtime
- brand kit management as a first-class canonical area
- workflow builder in canonical navigation
- per-app RAG/memory inspector
- route trace explorer
- proof/blocker dashboard
- subtitle/caption management
- adult policy/review queue

### What should be removed or merged

Recommended merge/removal direction:
- merge Music Studio into Studio
- merge Avatars into Studio library
- merge Projects/Brand Kits into Studio context/project tools
- move Providers to Settings diagnostics
- move Provider Matrix into Capabilities or Settings truth surfaces

### Final dashboard navigation recommendation

Required final dashboard areas and audit recommendation:

| Final area | Recommendation |
|---|---|
| Home/status | add as first-class status/proof dashboard |
| Provider truth | keep under Settings or dedicated truth page |
| Model catalog | add as canonical page or Capabilities subview |
| Capability studio | current Studio/Capabilities split can support this |
| Content studio | current Studio is the natural base |
| Brand kits | missing as canonical top-level area today |
| Avatar library | currently partial; should likely live under Studio |
| Music/audio studio | merge current Music Studio into Studio |
| Video projects | current Projects/Video Projects need unification |
| Research/RAG/memory | partial surfaces exist; needs canonical area |
| Connected apps | keep |
| App workflow builder | missing |
| Jobs/worker queue | keep |
| Artifacts | keep |
| Adult policy | partial; should be promoted |
| Proof/deploy readiness | partial and fragmented; should be promoted |
| Settings | keep |

Audit judgment:
- Current dashboard is useful as an operator console.
- It is fragmented and not yet the final V1 product surface.

## 12. Quality Audit

### Present in source

- prompt templates and prompt assembly exist in multiple flows
- quality presets/routing profiles exist
- provider selection by cost/quality/latency exists in routing policy
- multi-model orchestration/fallback exists
- route traces exist
- retries/polling infrastructure exists
- artifact validation exists in media assembly
- file duration validation exists via ffprobe in long-form video
- preview/download infrastructure exists in artifact system

Evidence:
- routing profiles: `src/lib/capability-routing-policy.ts`
- route scoring: `src/lib/providers/provider-scoring.ts`
- fallback loop: `src/lib/orchestrator.ts:420-504`
- long-form video validation: `src/lib/long-form-video.ts:292-407`
- artifact system: `src/lib/artifact-store.ts`

### Major quality gaps

- truth-source conflicts across docs and proof ledgers
- brand kit not consistently applied across content generation
- workflow engine bypasses central routing
- no dedicated subtitle/caption quality flow
- no final creative quality review queue
- per-app scoping is weak in current creative workspace/admin UX

Audit judgment:
- The system has real quality infrastructure, but not yet a consistent high-quality content product layer across all media types and workflows.

## 13. Production Readiness Audit

### Verified current proof/build baseline

Current truth supplied and reflected in repo proof:
- VPS tests passed: `629/629`
- VPS build passed
- VPS proof summary: `LIVE_PROVEN 11`, `SOURCE_WIRED 11`, `BLOCKED 3`, `NOT_WIRED 0`

Proof evidence: `V1_25_CAPABILITY_PROOF.md:26-32`

### Services and dependencies

Current proof/open-source stack evidence:

| Item | Current audited state | Evidence |
|---|---|---|
| Redis | healthy on VPS proof path | `V1_25_CAPABILITY_PROOF.md:104` |
| Qdrant | healthy on VPS proof path | `V1_25_CAPABILITY_PROOF.md:105` |
| Playwright | available | `V1_25_CAPABILITY_PROOF.md:106` |
| Scrapy | available | `V1_25_CAPABILITY_PROOF.md:107` |
| Trafilatura | available | `V1_25_CAPABILITY_PROOF.md:108` |
| ffmpeg | available | `V1_25_CAPABILITY_PROOF.md:109` |
| ffprobe | available | `V1_25_CAPABILITY_PROOF.md:110` |
| Rhubarb/lip-sync | missing / blocked | `V1_25_CAPABILITY_PROOF.md:111`; `ACTIVE_OPEN_SOURCE_STACK.md:17` |
| Artifact storage | writable on VPS proof path | `V1_25_CAPABILITY_PROOF.md:112` |

### Production-readiness blockers discovered in source

High-severity issues:
- middleware uses fallback session secret if `SESSION_SECRET` is absent
  - `src/middleware.ts:5-13`
- `/api/admin/connected-apps` lacks explicit session/auth guard
  - `src/app/api/admin/connected-apps/route.ts:21-88`
- `/api/workflows` lacks explicit session/auth guard
  - `src/app/api/workflows/route.ts:12-93`
- middleware only protects `/admin/*`, not `/api/admin/*`
  - `src/middleware.ts:19-24,41-47`
- critical product state still local-JSON-backed
  - creative workspaces: `src/lib/creative-workspaces.ts:1-8`
  - long-form projects: `src/lib/long-form-video.ts:5-11`
  - connected apps: `src/lib/connected-apps.ts`

### Deployment checklist support

Deployment readiness doc exists and is detailed:
- `docs/audits/V1_DEPLOYMENT_READINESS.md:15-116`

Audit judgment:
- The repo has strong proof and readiness infrastructure.
- It should not be described as production-ready for the whole V1 promise.
- Security hardening, state durability, and workflow completion remain significant gaps.

## 14. Missing Feature Inventory

| Feature | Status | Files involved | Exact blocker | Exact next action | Priority |
|---|---|---|---|---|---|
| HF discovery scale-up | SOURCE_WIRED | `src/lib/providers/provider-discovery.ts`, `src/lib/providers/model-discovery.ts` | HF discovery is capped, over-curated, non-paginated, and denied provider-contract fallback | Add pagination and widen truthful normalization/contract handling | High |
| HF specialist truth alignment | BLOCKED | `src/lib/provider-runtime-truth.ts`, `src/lib/providers/provider-capability-contracts.ts`, `src/lib/hf-specialist-config.ts` | HF endpoint requirements are inconsistent across truth layers | Align canonical contract, runtime truth, and specialist config | High |
| MiMo runtime truth cleanup | BLOCKED | `src/lib/providers/provider-truth.ts`, `src/lib/providers/provider-capability-contracts.ts`, `src/lib/universal-provider-call.ts`, `src/lib/ai-capability-adapters.ts` | token-plan/catalog visibility is mixed with runtime truth; flags remain off | Prove backend runtime API and align direct/canonical execution truth | High |
| Workflow engine central routing | SOURCE_WIRED | `src/lib/workflow-engine.ts` | Workflow AI step bypasses central capability router | Route workflow AI execution through capability-only central runtime | High |
| Auth on admin/workflow APIs | BLOCKED | `src/middleware.ts`, `src/app/api/admin/connected-apps/route.ts`, `src/app/api/workflows/route.ts` | API surfaces are not protected by current middleware matcher | Add explicit server-side auth/session enforcement | High |
| Durable app registry | SOURCE_WIRED | `src/lib/connected-apps.ts` | local JSON store is not robust enough as production system-of-record | Move connected app registry to durable DB-backed store | High |
| Durable creative workspace state | SOURCE_WIRED | `src/lib/creative-workspaces.ts` | brand kits/avatars/projects are local-JSON-backed | Move to durable DB-backed store | High |
| Durable long-form project state | SOURCE_WIRED | `src/lib/long-form-video.ts` | long-form projects/scenes depend on local JSON store | Move to durable DB-backed store | High |
| Image edit proof | SOURCE_WIRED | `src/app/api/brain/image-edit/route.ts`, `src/lib/providers/execution.ts` | proof attempts failed; source truth conflicts with older docs | Prove a real source-image transform route or classify exact runtime blocker | High |
| Image-to-video proof | SOURCE_WIRED | `src/app/api/brain/video-generate/route.ts`, `src/lib/providers/execution.ts` | proof attempts failed | Reprove real I2V start/poll/artifact path | High |
| Long-form video proof | SOURCE_WIRED | `src/lib/long-form-video.ts`, `src/app/api/admin/video-projects/route.ts` | requires DB-backed project and completed clips in target env | Run end-to-end proof after durable state and clip generation success | High |
| Music/audio-bed proof | SOURCE_WIRED | `src/lib/music-studio.ts`, `src/app/api/admin/music-studio/route.ts` | route exists but not live-proven in current proof | Prove real generated playable audio artifact | Medium |
| Subtitles/caption pipeline | MISSING | STT/media workflow files | no dedicated subtitle export/burn-in workflow found | Add subtitle artifact/workflow contract | Medium |
| Brand kit productization | SOURCE_WIRED | `src/lib/creative-workspaces.ts`, `src/app/admin/dashboard/projects/page.tsx`, `src/app/api/admin/studio/execute/route.ts` | brand-kit model is too shallow and inconsistently applied | Expand schema and apply brand rules across content routes | High |
| Per-app creative scoping | SOURCE_WIRED | `src/lib/creative-workspaces.ts`, `src/app/admin/dashboard/projects/page.tsx`, `src/app/admin/dashboard/studio/page.tsx` | hardcoded default app slug and broad workspace loading | Enforce real per-app scoping in UI and execution context | High |
| Talking avatar | BLOCKED | `src/app/api/brain/avatar-video/route.ts`, lip-sync boundary | no approved Rhubarb/lip-sync execution path | Install/configure lip-sync adapter and prove artifact output | High |
| Avatar memory | MISSING | avatar/workspace/profile layers | no general reusable avatar continuity system | Add reusable avatar persona/memory model | Medium |
| Voice clone/design | MISSING/BLOCKED | voice/avatar capability layers | no consent record + durable voice-profile artifact + approved adapter | Add consented voice clone design workflow | Medium |
| Adult creator workflow | BLOCKED | adult policy/orchestration layers | no approved adult provider/model for app proof path | Configure policy-approved adult provider/model and prove route | High |
| Workflow builder UI | MISSING | dashboard/workflow UI surfaces | backend workflow route exists, but canonical builder is missing | Build canonical workflow builder UI on central runtime | Medium |
| Model catalog UI | SOURCE_WIRED | admin catalog APIs + dashboard | API exists, UI incomplete | Build canonical model catalog browser | Medium |
| Route trace explorer | SOURCE_WIRED | tracing/orchestrator/dashboard surfaces | trace data exists but not a strong operator UX | Add route/provider-attempt trace explorer | Medium |
| Proof/deploy dashboard | SOURCE_WIRED | readiness/proof APIs + dashboard | truth surfaces fragmented | Consolidate proof/blocker/readiness panel | Medium |

## 15. Recommended Finishing Roadmap

### Phase 1: Provider/model truth cleanup, especially Hugging Face and MiMo

Goal:
- Make provider/model discovery and runtime truth internally consistent, especially for HF and MiMo.

Exact deliverables:
- HF discovery pagination/normalization cleanup
- HF specialist-endpoint truth alignment
- MiMo runtime truth alignment between token-plan visibility and backend execution
- remove stale model names from active routing layers
- reduce provider/model truth drift across static catalogs and policies

Proof required:
- updated proof and runtime truth surfaces must agree
- HF and MiMo blocker states must be exact and non-contradictory
- no stale model references in active route layers used by product/runtime truth

Files likely touched:
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/providers/provider-capability-contracts.ts`
- `src/lib/provider-runtime-truth.ts`
- `src/lib/hf-specialist-config.ts`
- `src/lib/universal-model-catalog.ts`
- `src/lib/ai-routing-policy.ts`
- `src/lib/capability-routing-policy.ts`
- `src/lib/provider-registry.ts`
- `src/lib/providers/provider-truth.ts`

Stop condition:
- HF and MiMo truth is internally consistent and all remaining blockers are explicit, truthful, and singular.

### Phase 2: Content workflow foundation: brand kits, marketing reel, content quality contracts

Goal:
- Turn media generation from isolated capabilities into branded content workflows.

Exact deliverables:
- richer brand-kit schema
- per-app brand-kit scoping
- real brand-kit application in generation routes
- dedicated marketing reel workflow contract
- quality/review contract for branded outputs

Proof required:
- at least one branded content workflow shows clear brand-kit application from source input to artifact output

Files likely touched:
- `src/lib/creative-workspaces.ts`
- `src/app/admin/dashboard/projects/page.tsx`
- `src/app/admin/dashboard/studio/page.tsx`
- `src/app/api/admin/studio/execute/route.ts`
- app intelligence/brand context files

Stop condition:
- brand kit is not just metadata; it affects output generation and is scoped correctly per app.

### Phase 3: Media workflows: image edit, image-to-video, long-form video, music, captions

Goal:
- Finish the most important missing content workflows.

Exact deliverables:
- prove image edit route
- prove image-to-video route
- prove long-form video assembly end to end
- stabilize music/audio-bed generation
- add subtitles/captions workflow

Proof required:
- proof surfaces or dedicated workflow proofs for image edit, I2V, long-form, and music
- subtitle artifact output evidence

Files likely touched:
- `src/app/api/brain/image-edit/route.ts`
- `src/app/api/brain/video-generate/route.ts`
- `src/lib/long-form-video.ts`
- `src/lib/music-studio.ts`
- artifact/media job layers

Stop condition:
- short-form and long-form content workflows can complete with durable outputs and honest job/preview/download behavior.

### Phase 4: Avatar library and talking avatar

Goal:
- Complete avatar workflows beyond static avatar image generation.

Exact deliverables:
- lip-sync boundary
- talking avatar execution path
- stronger reusable avatar profile schema
- avatar memory/history improvements
- voice persona integration where appropriate

Proof required:
- talking avatar proof with real artifact output

Files likely touched:
- `src/app/api/brain/avatar-video/route.ts`
- avatar/media/lip-sync integration files
- `src/lib/creative-workspaces.ts`

Stop condition:
- talking avatar is no longer blocked and avatar library is more than a shallow asset list.

### Phase 5: Connected apps and app workflows

Goal:
- Make connected apps and workflows truly capability-only, durable, and trustworthy.

Exact deliverables:
- workflow engine routed through central capability router
- durable connected app registry
- explicit app-specific memory/RAG behavior
- stronger budget enforcement and app workflow surfaces

Proof required:
- signed connected-app execution proof
- workflow execution proof through central runtime, not direct provider call

Files likely touched:
- `src/lib/connected-app-capability-engine.ts`
- `src/lib/connected-apps.ts`
- `src/lib/workflow-engine.ts`
- app registry/profile/budget layers

Stop condition:
- connected apps can execute capability-only workflows with durable state and truthful audit trails.

### Phase 6: Dashboard overhaul

Goal:
- Consolidate current dashboard into a truthful final operator product surface.

Exact deliverables:
- merge duplicate media surfaces
- canonical provider truth/model catalog pages
- workflow builder UI
- brand kit and avatar library surfaces
- proof/readiness/traces views

Proof required:
- dashboard surfaces consume normalized runtime truth rather than fragmented local truths

Files likely touched:
- `src/app/admin/dashboard/**`
- related admin APIs that drive final navigation areas
- `src/lib/dashboard-nav.ts`

Stop condition:
- final dashboard nav matches the intended V1 operator surface with minimal duplication.

### Phase 7: Final proof/deploy/production readiness

Goal:
- Finish readiness hardening and final runtime proof.

Exact deliverables:
- lock down admin/workflow auth gaps
- eliminate fallback-secret behavior
- finish durable state migrations for critical features
- rerun proof and readiness checks on VPS

Proof required:
- full test/typecheck/build pass
- VPS proof reflecting the newly finished workflows
- readiness surfaces show no contradictory blocker claims

Files likely touched:
- `src/middleware.ts`
- admin/workflow routes
- persistence layers
- deployment/readiness scripts and docs

Stop condition:
- security, proof, and readiness surfaces are aligned and all remaining unfinished work is explicitly limited, not hidden by drift.

## Final Audit Summary

Biggest current problems:
- provider/model truth still has multiple competing layers, especially for Hugging Face and MiMo
- workflow engine still bypasses central capability routing
- critical admin/workflow APIs are not hardened by the current auth boundary
- creative/project/app state is still local-JSON-backed in too many core areas
- brand kits, long-form media, subtitles, and talking avatars are not yet finished product workflows
- dashboard is useful but still fragmented and not the final operator surface

Current honest state:
- the repo has a real, meaningful live-proven core
- `web_research`/RAG is genuinely live-proven
- several important media and app-workflow features remain source-wired or blocked
- the project should not be described as complete or production-ready from this source/proof state
