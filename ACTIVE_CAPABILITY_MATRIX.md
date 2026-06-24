# Active Capability Matrix

Last audited: 2026-06-18

Canonical product matrix: `src/lib/brain/v1-capability-matrix.ts`

Canonical compact provider-routing capability registry: `src/lib/providers/capability-registry.ts`

## Required Runtime Status Model

These are the only runtime proof labels the dashboard and admin settings may present.

| Status | Meaning |
|---|---|
| `LIVE_PROVEN` | A runtime call completed successfully in the target environment. |
| `SOURCE_WIRED` | Route/source code exists, but this proof did not complete a live provider/runtime call. |
| `PROVIDER_AVAILABLE` | Provider key/catalog/live provider check is available, but the product capability is not live-proven. |
| `BLOCKED` | Execution is gated by environment, DB, signing, worker, policy, tool, or provider approval. |
| `NOT_WIRED` | The route/adapter/model mapping needed for this capability is missing or produces no executable candidate. |

## VPS Proof Snapshot

The VPS proof supplied for this pass is the source input for the dashboard truth contract:

| Status | Count |
|---|---:|
| `LIVE_PROVEN` | 2 |
| `SOURCE_WIRED` | 0 |
| `PROVIDER_AVAILABLE` | 0 |
| `BLOCKED` | 10 |
| `NOT_WIRED` | 13 |

The dashboard must not convert provider keys, provider catalog success, source routes, or provider availability into "ready" or "wired" capability counts. MiMo is only live-proven for chat/provider auto-selection in the VPS proof. Other providers may have keys and catalogs, but that is not capability proof until the route/adapter call completes.

GenX exact cause from this pass: the VPS input reports the GenX key path as ready while model discovery yields zero normalized models. `executeCapability` requires at least one discovered model with model metadata or provider-contract evidence; with a zero-model GenX discovery result, route planning has no executable candidate and correctly reports `NO_ROUTE_FOUND` from `src/lib/providers/execution.ts`.

## Minimum 7 PM Capability Truth

| Capability | Route/file | Artifact behavior | Job behavior | Proof classification |
|---|---|---|---|---|
| Flowing chat | `/api/brain/request`, `src/lib/orchestrator.ts` | No artifact by default | Sync | `LIVE_PROVEN` only for MiMo-backed chat/provider auto-selection in the VPS proof; otherwise provider/source evidence only. |
| Text generation/copywriting | `/api/brain/request` | Artifact only when explicitly requested or product contract marks output | Sync | `NOT_WIRED` when route mapping cannot select a discovered executable model. |
| Text to image | `/api/brain/image` | Image artifact on intentional generation | Sync or provider job | `NOT_WIRED` until provider model discovery maps to an executable image adapter and returns a generated artifact. |
| Image editing | `/api/brain/image-edit` | Image artifact on intentional generation | Sync | `NOT_WIRED`; source-image execution adapter/model mapping is not live-proven. |
| Text to video | `/api/brain/video-generate` | Video artifact on completion | Async job/polling | `NOT_WIRED` unless provider model mapping plus async polling complete in proof. |
| Long-form video | `src/lib/long-form-video.ts`, admin video projects | Video/project artifacts | Multi-step async | `BLOCKED`; requires DB-backed project, generated clips, and completed assembly proof. |
| TTS | `/api/brain/tts` | Voice/audio artifact | Sync | `NOT_WIRED` when provider discovery does not yield an executable TTS model/adapter. |
| STT/transcription | `/api/brain/stt` | Transcript artifact | Sync | `NOT_WIRED` when provider discovery does not yield an executable STT model/adapter. |
| Music generation | `/api/admin/music-studio`, `src/lib/music-studio.ts` | Music/audio artifact | Async likely | `BLOCKED` or `NOT_WIRED` until a provider model explicitly supports the requested music/song path. |
| Avatar image | `/api/brain/avatar` | Avatar artifact | Sync | `NOT_WIRED` until avatar generation maps to an executable image model/adapter. |
| Talking avatar video | `/api/brain/avatar-video` | Should be video or storyboard artifact | Async | `NOT_WIRED`; no approved lip-sync execution adapter is wired. |
| Brand kit | `src/lib/app-ai-package.ts`, app profiles, artifact store | Brand outputs only when exported | Sync/async per output | `SOURCE_WIRED`; not `LIVE_PROVEN` without a dedicated runtime proof contract. |
| Adult mode | `src/lib/adult-app-capabilities.ts`, adult routes | Adult media artifacts only when intentionally generated | Sync/async by media type | `BLOCKED`; policy/profile/provider approval and DB-backed proof are required. |
| Artifacts | `src/lib/artifact-store.ts` | Intentional outputs only | N/A | `SOURCE_WIRED`; artifact storage is source-wired but not a provider execution proof by itself. |
| Job status | `src/lib/control-plane-jobs.ts`, `src/lib/media-job-store.ts` | N/A | queued/processing/completed/failed | `SOURCE_WIRED`; live proof requires an actual async provider job and persisted poll result. |
| Provider failure reporting | `src/lib/ai-capability-adapters.ts`, `src/lib/orchestrator.ts`, `src/lib/providers/execution.ts` | N/A | N/A | `SOURCE_WIRED`; exact sanitized errors and provider attempts are reported. |
| Runtime proof harness | `scripts/v1-25-capability-proof.ts` | JSON/Markdown proof | Reports jobs/polls | Emits `LIVE_PROVEN`, `SOURCE_WIRED`, `PROVIDER_AVAILABLE`, `BLOCKED`, and `NOT_WIRED` only. |

## Capability Truth Rules

- `chat` and `reasoning` have `createsArtifact: false`.
- Media, research, documents, code/repo outputs, campaign exports, and brand exports are intentional artifact candidates.
- Discovery or catalog availability is not execution proof.
- A status of `LIVE_PROVEN` requires a completed runtime call, not a configured key or discovered model alone.
