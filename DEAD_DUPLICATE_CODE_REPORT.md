# Dead, Duplicate, and Misleading Code Report

## Definitely Dead or Stranded

- `src/app/api/admin/dashboard/route.ts`
  - legacy admin metrics endpoint with no clear active dashboard consumer
- likely `src/app/api/admin/playground/[id]/route.ts`
  - legacy per-project CRUD path not used by current Command Center

## Hidden / Parallel Dashboard Surfaces

- `src/app/admin/dashboard/providers/page.tsx`
- `src/app/admin/dashboard/projects/page.tsx`
- `src/app/admin/dashboard/music-studio/page.tsx`
- `src/app/admin/dashboard/avatars/page.tsx`

These are not in the canonical 7-item dashboard nav but still exist as active routes.

## Active but Misleading

- `src/app/api/admin/truth/route.ts`
  - claims to be the single dashboard truth source, but current dashboard pages use multiple narrower truth surfaces
- `src/lib/dashboard-truth.ts`
  - compatibility/legacy truth projection, not canonical runtime truth
- `src/lib/agent-audit.ts`
  - always returns `PARTIAL`, so it is not a real readiness audit
- `src/lib/agent-registry.ts`
  - operator catalog uses a non-canonical routing preview
- `src/app/api/admin/apps/route.ts`
  - still contains placeholder-style seeded app data visible to active dashboard callers
- `src/lib/webhook-manager.ts`
  - comments imply retry accuracy, but retry queueing is partly miswired

## Duplicate Truth Layers

Provider truth duplicates:
- `src/lib/provider-mesh.ts`
- `src/lib/providers/provider-truth.ts`
- `src/lib/provider-registry.ts`
- `src/lib/platform-settings-truth.ts`
- `src/lib/runtime-capability-truth.ts`
- `src/lib/dashboard-truth.ts`

Model truth duplicates:
- `src/lib/universal-model-catalog.ts`
- `src/lib/model-registry.ts`
- `src/lib/ai-model-catalog.ts`
- `src/lib/approved-ai-catalog.ts`

Capability/route truth duplicates:
- `src/lib/brain/v1-capability-matrix.ts`
- `src/lib/brain/v1-route-matrix.ts`
- `src/lib/media-capability-registry.ts`
- `src/lib/capability-routing-policy.ts`
- `src/lib/ai-routing-policy.ts`

## Bypassed / Non-Canonical Execution Layers

- `src/lib/ai-routing-policy.ts`
  - admin smart-routing and legacy routing helper, not canonical execution truth
- `src/lib/live-ai-routing.ts`
  - compatibility/live preview routing, not canonical execution owner
- `src/lib/provider-gateway.ts`
  - admin/system convenience executor, bypasses canonical orchestration
- `src/lib/capability-routing-policy.ts`
  - admin/studio routing selection helper, not the real execution owner

## Dead or Weakly Used Adapter/Function Surfaces

- `executeQwenMultimodal()` in `src/lib/ai-capability-adapters.ts`
  - likely unreachable through current canonical executable taxonomy
- many HF task-specialist input branches in `huggingFaceInputs()`
  - only reachable through admin/specialist surfaces, not canonical Brain product routes
- `provider-registry.ts` helper stack:
  - `validateProviderModel()`
  - `discoverProviderModels()`
  - `validateProviderModelAsync()`
  - broadly not in the canonical execution path

## Cleanup Later List

Delete or archive after migration:
- `src/app/api/admin/dashboard/route.ts`
- `src/app/api/admin/playground/[id]/route.ts`
- hidden dashboard pages not in canonical nav if their functionality is subsumed elsewhere

Consolidate later:
- provider truth surfaces down to one runtime truth and one settings inventory truth
- model truth surfaces down to one canonical model catalog + one runtime discovery layer
- remove fake readiness layers and legacy admin wrappers

Keep but relabel clearly:
- `src/app/api/admin/providers` and `src/app/admin/dashboard/providers`
  - as diagnostics only
- legacy compatibility poll routes
- voice wrapper routes if still needed for compatibility
