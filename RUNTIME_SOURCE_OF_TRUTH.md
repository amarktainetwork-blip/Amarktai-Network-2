# Runtime Source Of Truth

## Canonical runtime path

For app-facing execution, the source of truth is:

`route -> executeCapability()/orchestrate() -> executeCapabilityOrchestration() -> planCanonicalExecution() -> provider discovery/model discovery/route scoring -> provider adapter -> artifact/job persistence`

Primary files:

- `src/lib/orchestrator.ts`
- `src/lib/capability-router.ts`
- `src/lib/providers/execution.ts`
- `src/lib/providers/registry.ts`
- `src/lib/providers/provider-truth.ts`
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/ai-capability-adapters.ts`
- `src/lib/artifact-store.ts`
- `src/lib/media-job-store.ts`

## Canonical rules enforced in this cleanup

- Apps request capabilities only.
- Public/app-facing Brain routes do not allow provider or model forcing.
- Admin proof routes may still force a single provider/model for diagnostics and proof.
- Dashboard/status surfaces are readers of runtime truth, not owners of runtime truth.
- Provider IDs are restricted to: `genx`, `qwen`, `huggingface`, `together`, `groq`, `mimo`.
- `minimax` is not a provider ID.
- Together-hosted model IDs containing `minimax/` are not blocked solely because of the model name.

## Current app-facing route behavior

- Delegate-based Brain routes now reject provider/model forcing with `400` instead of silently ignoring it.
- `/api/brain/request` rejects `metadata.provider_override` and `metadata.model_override`.
- `/api/brain/image`, `/api/brain/stt`, `/api/brain/suggestive-image`, and `/api/brain/adult-video` also reject provider/model forcing.
- `/api/admin/provider-capability-test` remains the explicit single-provider proof surface.
- `/api/admin/settings/test-*` routes remain settings/probe surfaces, not canonical execution proof.

## Dashboard and settings truth boundaries

- `src/lib/runtime-capability-truth.ts`: runtime projection layer for dashboard/status consumers.
- `src/lib/platform-settings-truth.ts`: settings inventory/probe projection layer.
- `src/app/api/admin/truth/route.ts`: legacy compatibility aggregation only.
- `src/lib/dashboard-truth.ts`: deleted as dead duplicate projection.

## Verification Rule

- For this Next.js app, use `npm run build` as the authoritative TypeScript validity check during commit-readiness verification.
- Standalone `npx tsc --noEmit` is not authoritative until the separate `.next/types` generation mismatch is fixed.
- Current evidence: `next build` passes and generates the app route type tree that Next expects, while standalone `tsc` still reports missing `.next/types/**/*.ts` route files because the Next-managed include resolves more generated paths than are present in this environment.
