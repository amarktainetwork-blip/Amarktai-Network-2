# AmarktAI V1 Documentation

AmarktAI is a capability-first AI runtime.

`User or connected app -> capability request -> Brain runtime -> provider discovery/routing -> provider adapter -> job/artifact/result`

## Current Truth Documents

- `../RUNTIME_SOURCE_OF_TRUTH.md`
- `../ACTIVE_PROVIDER_CONTRACTS.md`
- `../ACTIVE_CAPABILITY_MATRIX.md`
- `../ACTIVE_OPEN_SOURCE_STACK.md`
- `../INCOMPLETE_AND_BLOCKED.md`
- `../DELETE_REVIEW_REQUIRED.md`

## Canonical Runtime Owners

| Area | File |
|---|---|
| Provider contracts | `src/lib/providers/provider-truth.ts` |
| Provider/model discovery | `src/lib/providers/provider-discovery.ts`, `src/lib/providers/model-discovery.ts` |
| Compact capability registry | `src/lib/providers/capability-registry.ts` |
| V1 product matrix | `src/lib/brain/v1-capability-matrix.ts` |
| Execution/fallback/artifacts/jobs | `src/lib/orchestrator.ts` |
| Provider adapters | `src/lib/ai-capability-adapters.ts` |
| Dashboard readiness | `src/lib/runtime-capability-truth.ts` |
| Proof report | `scripts/v1-25-capability-proof.ts` |

## Stale Docs Warning

Older docs in this folder may mention `MODEL_REGISTRY`, OpenAI examples, provider/model overrides, or old provider marketplaces. Those are not active runtime truth unless the current truth documents above say so.

## Verification

```powershell
npm test -- --run
npm run build
npx.cmd tsx scripts/v1-25-capability-proof.ts
git diff --check
```
