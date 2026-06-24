# Failure Root Causes

This report explains the current live/runtime failures using source analysis plus the live evidence supplied by the user.

## A. GenX `NO_ROUTE_FOUND`

### What source proves
- `getProviderKey('genx')` resolves correctly through canonical mesh credential lookup.
- GenX discovery can produce image models either from live discovery or from the static runtime fallback.
- GenX image support exists in canonical provider truth.
- The exact `NO_ROUTE_FOUND` return is in `src/lib/orchestrator.ts` when `planCanonicalExecution()` yields zero candidates.

### Exact no-route path
- `src/lib/orchestrator.ts`
  - planner call and zero-candidate return branch
- `src/lib/providers/registry.ts`
  - no candidate reason string
- `src/lib/execution/execution-runner.ts`
  - leaves `modelPlan.model = null` when there were no provider/model attempts

### Likely root cause chain
1. Request enters canonical orchestration for `image_generation`.
2. Execution planning starts with `modelPlan.model = null`.
3. `planCanonicalExecution()` finds no surviving candidates for the current runtime conditions.
4. Orchestrator returns `NO_ROUTE_FOUND` before any provider attempt occurs.
5. Because there was no attempt, execution metadata never backfills a model into the execution record.

### Not proven by source as the cause
- not caused by missing GenX key aliasing
- not caused by missing static GenX image models
- not caused by missing `provider_contract` fallback evidence

## B. Qwen dashboard failure

### What source proves
- Qwen alias resolution is correct: `QWEN_API_KEY`, `DASHSCOPE_API_KEY`.
- `QWEN_PAID_ENABLED` gating is active and strict for models marked `free_quota_eligible: false`.
- Runtime supports Qwen image, video/Wanx, image-to-video, and embeddings.
- The dashboard/provider test path is not equivalent to the canonical runtime path.

### Root cause chain
1. `test-qwen` runs discovery plus a direct chat-completions probe.
2. It is intentionally marked `capabilityExecutionProven: false` because it does not prove all Qwen capability families.
3. Qwen image/video/embeddings are exercised through different runtime routes and adapters than the settings test.
4. Studio also records provider/model preferences as ignored metadata rather than passing them into orchestration.

### Conclusion
- Dashboard Qwen failures are better explained by dashboard-test/runtime mismatch than by absence of Qwen runtime support.

## C. Hugging Face TTS fell back to Groq

### What source proves
- `/api/brain/tts` uses `delegateJsonCapability()`.
- That delegate does not pass `providerOverride` or `modelOverride` into `executeCapability()`.
- Instead it stores provider/model preferences only as ignored metadata.

### Root cause chain
1. Caller sends `provider=huggingface` to `/api/brain/tts`.
2. `delegateJsonCapability()` drops that as a real routing constraint.
3. Canonical planner runs unconstrained.
4. Groq can legitimately win as the selected TTS provider.
5. So HF was not actually forced, and Groq use is not necessarily post-HF fallback.

### Existing HF TTS path
- Canonical HF TTS model path currently points at:
  `https://router.huggingface.co/hf-inference/models/facebook/mms-tts-eng`

## D. Hugging Face rerank failure

### What source proves
- Canonical rerank planning uses broad live discovery for HF text-ranking models.
- Execution then posts a generic rerank payload to whichever discovered model was selected.
- Discovery does not prefilter by actual access entitlement for the specific account/key.

### Root cause chain
1. HF discovery surfaces broad `text-ranking` candidates.
2. Planner can select one of them.
3. Execution uses a generic ranking request contract.
4. Access mismatch or contract mismatch can make every selected model fail.

### Source-backed conclusion
- HF rerank is implemented enough to be a local contract path, but broad-catalog routing makes it fragile.
- The more honest status is local-contract-only until narrowed and live-proven.

## E. Video failure / invalid Together and HF model attempts

### What source proves
- Safe video model contracts exist only for GenX and Qwen.
- Together is still marked executable for `text_to_video` in the taxonomy.
- Runtime planning is discovery-driven and can surface Together video candidates from broad model descriptors.
- Together video executor posts arbitrary discovered models to `/videos` without a provider-safe allowlist.
- HF can be discovered as video-capable from provider truth, but canonical text-to-video taxonomy does not mark HF executable.

### Why MiniMax-like names can appear
- Provider discovery infers capabilities from model ids/descriptors.
- If Together’s catalog exposes third-party-branded video models, they can become video candidates.
- This is a discovery/scoring overbreadth issue, not canonical provider identity.

### Root cause chain
1. Canonical video contracts are strict only for GenX/Qwen.
2. Together remains executable in taxonomy despite lacking an equivalent safe model-contract subset.
3. Dynamic discovery/scoring can therefore surface invalid Together video candidates.
4. HF can also be surfaced broadly for video truth but later fails because no canonical executable route/adapter contract exists for HF text-to-video.

## Highest-Risk Runtime Bugs Proven by Source

1. Capability-to-taxonomy mapping split can misroute explicit capabilities like embeddings/rerank/translation/ocr to `chat` fallback definitions.
2. `/api/brain/tts` and other delegate-driven routes ignore provider/model forcing.
3. Adult capability truth diverges between canonical runtime planning and projected dashboard/media route surfaces.
4. Studio `scenePlanOnly` sends the wrong payload shape to `/api/brain/video`.
5. Workflow/webhook external side-effect paths are not aligned with the approval framework.
