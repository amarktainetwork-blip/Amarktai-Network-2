# AmarktAI Network V1 Forensic Runtime Map

This report traces actual runtime execution paths from HTTP entrypoint to
provider selection to adapter execution to artifact/job persistence.

## Canonical Runtime Stack

For most product execution routes, the real path is:

`route -> delegateJsonCapability()/executeCapability() -> executeCapabilityOrchestration() -> planCanonicalExecution() -> discoverProvider()/modelsForCapability() -> {provider}_capability_adapter -> artifact/job persistence`

Primary source files:

- `src/lib/brain-route-delegate.ts`
- `src/lib/capability-router.ts`
- `src/lib/orchestrator.ts`
- `src/lib/providers/execution.ts`
- `src/lib/providers/registry.ts`
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/ai-capability-adapters.ts`
- `src/lib/artifact-store.ts`
- `src/lib/media-job-store.ts`
- `src/lib/execution/execution-runner.ts`
- `src/lib/brain/v1-capability-matrix.ts`

## Route Map

| Route | Request shape | Capability used | Router used | Adapter used | Discovery/model selection | Persistence path | Fallback | Strict provider proof | Dashboard caller |
|---|---|---|---|---|---|---|---|---|---|
| `/api/brain/request` | `{appId, appSecret, taskType, message, metadata?}` | dynamic via `resolveCapability()` then `orchestrate()` | legacy `orchestrate()` wrapping canonical orchestration | canonical runtime adapter | yes | `BrainEvent`, `UsageMeter`, `MemoryEntry`; artifact/job metadata not surfaced consistently | yes | partial | no direct dashboard page |
| `/api/brain/image` | `{prompt, providerOverride?, modelOverride?, appSlug?, executionId?}` | `image_generation` | `executeCapability()` | canonical provider adapter | yes | execution store + artifact DB; async local media job if provider returns job id | yes | yes | indirect admin/test use only |
| `/api/brain/image-edit` | JSON with `prompt|input`, optional image refs | `image_edit` | `delegateJsonCapability()` | would be canonical adapter if route available | yes | artifact DB if it ever succeeds | yes | no; currently partially wired | no direct dashboard page |
| `/api/brain/video` | JSON with `prompt|input|message` | `video_generation` | `delegateJsonCapability()` | canonical adapter | yes | canonical media job/artifact path if used | yes | partial | Studio scene-plan path tries to use it but payload mismatch exists |
| `/api/brain/video-generate` | JSON with `prompt|input|message`, optional image refs | `video_generation` or `image_to_video` | `delegateJsonCapability()` | canonical adapter | yes | local media job + control-plane DB + artifact DB on completion | yes | yes | indirect via Studio |
| `/api/brain/video-generate/[jobId]` | GET `jobId` | legacy poll route | legacy Prisma poller | provider-specific polling only | no new discovery | legacy `VideoGenerationJob` + artifact reconcile | no | partial/legacy only | none |
| `/api/brain/tts` | JSON `text|input|prompt`, optional `capability=adult_voice` | `tts` or `adult_voice` | `delegateJsonCapability()` | canonical adapter | yes | artifact DB (`voice`) | yes | yes | indirect via Studio / admin voice preview |
| `/api/brain/stt` | multipart with `file`, optional `provider`, `model`, `executionId`, `language` | `stt` | direct `executeCapability()` | canonical adapter | yes | transcript artifact path | yes | yes | indirect via Studio STT |
| `/api/brain/rerank` | JSON `query|input|prompt` and effectively `metadata.documents` | `rerank` | `delegateJsonCapability()` | canonical adapter | yes | none | yes | partial | none |
| `/api/brain/embeddings` | JSON `input|text|prompt` | `embeddings` | `delegateJsonCapability()` | canonical adapter | yes | none | yes | partial | none |
| `/api/brain/research` | `{query, depth?, appSlug?, executionId?}` | `research` | `researchRuntime.execute()` -> canonical execute | canonical adapter | yes | execution store + research artifact | yes | yes | indirect admin/test use |
| `/api/brain/avatar` | `{prompt, appId?, style?}` | internal `image_generation` with avatar artifact overrides | direct canonical orchestration | canonical adapter | yes | avatar artifact path | yes | yes | none |
| `/api/brain/avatar-video` | JSON `prompt|input|text` | `avatar_video` | `delegateJsonCapability()` -> orchestrator hard-stop | none effectively | no useful discovery | none | no | no; honest stub | none |
| `/api/brain/adult-text` | JSON `prompt|input|message` | `adult_text` | `delegateJsonCapability()` | canonical adapter | yes | artifact if produced | yes after policy | yes | none |
| `/api/brain/adult-image` | JSON `prompt|input` | `adult_image` | `delegateJsonCapability()` | canonical adapter | yes | image artifact path | yes after policy/provider narrowing | yes | none |
| `/api/brain/adult-video` | `{prompt, appSlug, providerOverride?, modelOverride?}` | `adult_video` | custom route + canonical execute or long-form project | canonical adapter for short-form, project pipeline for long-form | yes | long-form project store + media jobs + artifact DB; short-form canonical media job path | yes | partial | Studio blocks before calling |
| `/api/brain/suggestive-image` | `{prompt, appSlug, providerOverride?, modelOverride?, executionId?}` | `suggestive_image` | custom route then `executeCapability()` | canonical adapter | yes | image artifact path | yes after policy rewrite/gating | yes | none |
| `/api/brain/suggestive-video` | JSON `prompt|input` | `suggestive_video` | `delegateJsonCapability()` | canonical adapter | yes | canonical video/media job path if route exists | yes | partial | none |
| `/api/brain/agent-request` | `{appId, appSecret, taskType?, message, userId?, metadata?, traceId?}` | dynamic through app agent | `processAppAgentRequest()` -> `orchestrate()` | canonical adapter underneath | yes | `BrainEvent` only, no canonical execution parity | yes | partial | none |
| `/api/connected-apps/capabilities/execute` | signed connected-app JSON request | body capability | `executeConnectedAppCapability()` -> `executeCapability()` | canonical adapter | yes | connected-app capability jobs JSON + DB artifacts | yes | yes | no |
| `/api/admin/studio/execute` | `StudioBody` | body capability | `dispatchStudio()` -> canonical orchestration or delegated routes | canonical adapter / music/video delegated route | yes | local execution store + underlying artifact/media job stores | yes | partial | Studio |
| `/api/admin/provider-capability-test` | `{provider, capabilityId, modelId?, prompt?, endpointUrl?}` | body capability id | direct specialist/admin proof route | `callUniversalProvider()`, `runHuggingFaceInference()`, `runQwenWanxImage()` | no canonical planning | none | no | partial/admin only | no direct dashboard page |
| `/api/admin/settings/test-provider` | `{key}` | provider readiness only | generic dispatcher to provider-specific tests | none canonical | sometimes | persists notes to `integrationConfig` / `aiProvider` | no | no for AI providers by design | Providers dashboard |

## High-Signal Runtime Mismatches

1. `/api/brain/video` scene-plan path mismatch
- `src/app/api/admin/studio/execute/route.ts` sends `{ script: ... }`
- `src/app/api/brain/video/route.ts` only accepts `prompt|input|message`
- Result: Studio scene-plan-only path is currently broken by request-shape mismatch.

2. `/api/brain/request` is not a clean capability-native media route
- `orchestrate()` collapses canonical execution into a text-oriented response.
- Async media job semantics are not surfaced cleanly through this route.

3. `/api/brain/agent-request` is thinner than `/api/brain/request`
- It does not reuse retrieval-engine, federated-memory, or memory-save parity.
- It also injects app-agent rules by concatenating text into the prompt instead of using the separate system-prompt path.

4. `/api/brain/rerank` and `/api/brain/embeddings` accept less than their taxonomy suggests
- rerank effectively needs `metadata.documents`
- embeddings still requires a top-level non-empty string input

5. `/api/brain/video-generate/[jobId]` is legacy
- Current canonical async poll path is `/api/brain/media-jobs/:jobId`.

## Dashboard-to-Route Relationships

Direct dashboard/runtime callers:
- Studio dashboard -> `/api/admin/studio/execute`
- Settings dashboard -> `/api/admin/settings/status`, `/api/admin/settings/runtime-tools`, `/api/admin/system/ai-capabilities-truth`
- Providers dashboard -> `/api/admin/system/provider-diagnostics` and `/api/admin/settings/test-provider`
- Capabilities dashboard -> `/api/admin/system/ai-capabilities-truth`

Indirect admin/internal callers of Brain routes:
- `/api/admin/brain/test`
- `/api/admin/studio/stt`
- `/api/admin/voice/preview`

## Runtime Truth Takeaways

1. The canonical execution owner is `executeCapabilityOrchestration()`.
2. Provider-specific settings tests are not runtime capability proof unless they execute a real provider/runtime route.
3. Legacy/admin compatibility routes still exist and can confuse debugging if mistaken for the canonical product path.
