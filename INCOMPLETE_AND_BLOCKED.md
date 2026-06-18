# Incomplete And Blocked

Last audited: 2026-06-18

## VPS Proof Summary

The VPS proof supplied for this pass is the active source input for this document.

| Status | Count | Meaning for finish work |
|---|---:|---|
| `LIVE_PROVEN` | 2 | Only these capabilities may be presented as live-ready. |
| `BLOCKED` | 10 | Source exists, but runtime proof is gated by environment, DB, signing, worker, policy, local tool, or provider approval. |
| `NOT_WIRED` | 13 | Route/adapter/model mapping is missing or yields no executable provider candidate. |

Provider keys are present on the VPS for GenX, Hugging Face, Qwen, MiMo, Groq, and Together. Key presence is not capability proof. Provider catalog success is not capability proof. A route file existing is not capability proof.

MiMo is the only provider represented in the VPS proof as live-proven for chat/provider auto-selection. GenX is key-ready, but its model discovery produced zero normalized models; because `executeCapability` requires discovered model metadata or provider-contract evidence, GenX currently produces `NO_ROUTE_FOUND` instead of an executable route candidate.

## Not Wired From Proof

| Count | Area | Exact blocker | File/fix |
|---:|---|---|---|
| 12 | Provider-backed capability execution | `executeCapability` cannot find a configured provider model with model metadata or provider-contract evidence for the requested capability. This affects the provider-routed text, reasoning, coding, research, embeddings, rerank, image, image-edit, video, TTS, STT, image-to-video, and avatar families when discovery does not produce executable candidates. | Fix route/model mapping in `src/lib/providers/execution.ts`, `src/lib/providers/model-discovery.ts`, and provider-specific adapter contracts. Do not mark these live until proof returns `LIVE_PROVEN`. |
| 1 | Talking avatar video | The route hard-stops because no approved lip-sync/render adapter is wired. | Add a provider or local render adapter in `src/lib/ai-capability-adapters.ts`; route `/api/brain/avatar-video` through it; prove job/artifact output. |

## Blocked From Proof

| Count | Area | Exact blocker | File/fix |
|---:|---|---|---|
| 1 | Connected app capability execution | Live proof requires an active signed app registry entry and signing secret. The harness must not fabricate HMAC identity. | Run against a real connected-app registration and signing secret in `src/lib/connected-app-capability-engine.ts`. |
| 1 | Agent request execution | Request path exists, but proof did not complete a live runtime execution. | Finish the provider/model route proof around `/api/brain/agent-request`. |
| 1 | Long-form video assembly | Requires DB-backed video project state and at least one completed generated clip. | Prove `src/lib/long-form-video.ts` and `/api/admin/video-projects` with DB and generated clips. |
| 1 | Adult media generation | Requires DB-backed adult profile/policy state plus approved provider/model execution. | Prove `src/lib/adult-app-capabilities.ts` and adult media routes with explicit approval/configuration. |
| 1 | Qwen paid media gate | Paid media paths must be deliberately enabled before proof can execute. | Set and document `QWEN_PAID_ENABLED` only when paid routes are approved. |
| 1 | Hugging Face specialist execution | Some specialist tasks require explicit endpoint/model JSON rather than public catalog discovery alone. | Wire `HF_SPECIALIST_MODELS_JSON`, `HF_SPECIALIST_ENDPOINTS_JSON`, or dedicated endpoint configuration. |
| 1 | Async media proof | Requires provider job creation, worker/storage, and poll completion. | Prove media jobs through `src/lib/control-plane-jobs.ts` and `src/lib/media-job-store.ts`. |
| 1 | Research tools | Provider-only research is insufficient when crawler/render/extraction is required. | Prove local research tools and provider fallback in the research runtime. |
| 1 | Route outcome logging | Source logging exists, but proof needs a DB-backed runtime request and persisted trace/log row. | Prove `logRouteOutcome` and capability tracing persistence. |
| 1 | Provider fallback | Source fallback loop exists, but proof needs a controlled first-provider failure and second-provider success. | Add a harness mode or fixture that proves fallback without spoofing live provider success. |

## Source-Wired Or Provider-Available Is Not Done

| Area | Current truth | Next proof step |
|---|---|---|
| Provider keys | Keys may be present for GenX, HF, Qwen, MiMo, Groq, and Together. | Show key present separately from catalog/live provider test/capability proof. |
| Provider catalogs | Catalogs may work and may be public, live-authenticated, static fallback, or catalog-derived. | Surface catalog source in Settings and Capabilities; do not count catalog models as `LIVE_PROVEN`. |
| Routes/adapters | Several routes and source paths exist. | Require route/adapter execution plus provider result before setting `LIVE_PROVEN`. |
| Dashboard counts | Old "Wired/Partial/Unavailable" labels overclaimed readiness. | Use only `LIVE_PROVEN`, `SOURCE_WIRED`, `PROVIDER_AVAILABLE`, `BLOCKED`, and `NOT_WIRED`. |
