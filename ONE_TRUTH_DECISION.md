# One Truth Decision

## Canonical source files

- Runtime execution owner: `src/lib/orchestrator.ts`
- Runtime entry delegate: `src/lib/capability-router.ts`
- Provider execution adapters: `src/lib/ai-capability-adapters.ts`
- Provider contract truth: `src/lib/providers/provider-truth.ts`
- Provider discovery truth: `src/lib/providers/provider-discovery.ts`
- Model discovery truth: `src/lib/providers/model-discovery.ts`
- Dynamic route planning truth: `src/lib/providers/execution.ts`
- Dynamic candidate scoring/selection truth: `src/lib/providers/registry.ts`
- Declared capability contract truth: `src/lib/brain/v1-capability-matrix.ts`

## Readers and delegates

- `src/lib/capability-router.ts`: thin delegate into `executeCapabilityOrchestration()`
- `src/lib/runtime-capability-truth.ts`: dashboard/runtime projection over canonical runtime truth
- `src/lib/platform-settings-truth.ts`: settings/inventory projection over provider mesh and readiness helpers
- `src/lib/brain/v1-route-matrix.ts`: diagnostic matrix derived from V1 capability matrix plus readiness/catalog data
- `src/app/api/admin/truth/route.ts`: legacy compatibility aggregation endpoint only
- `src/app/api/admin/settings/test-provider/route.ts`: provider test dispatcher, not runtime execution truth
- `src/app/api/admin/provider-capability-test/route.ts`: admin proof route, not canonical runtime execution owner

## Files deleted

- `src/lib/dashboard-truth.ts`
  - Proof: repo-wide search found no in-repo code importers after `/api/admin/truth` was rewritten.
  - Reason: legacy dashboard projection duplicated runtime truth and claimed ownership it did not have.

## Files retained temporarily

- `src/lib/provider-mesh.ts`
  - Reason: still widely used by settings/governance/admin inventory surfaces.
- `src/lib/provider-registry.ts`
  - Reason: still used by compatibility/admin readiness and auth helper paths.
- `src/lib/platform-settings-truth.ts`
  - Reason: active settings/status and provider diagnostics reader.
- `src/lib/runtime-capability-truth.ts`
  - Reason: active runtime/dashboard projection; now treated as a reader over canonical runtime truth.
- `src/lib/universal-model-catalog.ts`
  - Reason: still active static model catalog for admin/catalog surfaces.
- `src/lib/model-registry.ts`
  - Reason: active compatibility layer with existing callers.
- `src/lib/ai-model-catalog.ts`
  - Reason: active admin/catalog API dependency.
- `src/lib/approved-ai-catalog.ts`
  - Reason: active governance/admin dependency.
- `src/lib/media-capability-registry.ts`
  - Reason: still used by runtime/dashboard adult-gate projections.
- `src/lib/capability-routing-policy.ts`
  - Reason: live `productCapabilityToTaxonomyId()` mapping is still used by canonical orchestration.
- `src/lib/ai-routing-policy.ts`
  - Reason: still used by isolated admin smart-routing surfaces.
- `src/lib/agent-audit.ts`
  - Reason: still called by `/api/brain/agent/dispatch`; retained only as a diagnostic registration check, not runtime proof.
- `src/lib/agent-registry.ts`
  - Reason: still backs admin/operator catalog endpoints; relabeled as operator catalog instead of runtime truth.

## Files requiring follow-up

- `src/lib/agent-audit.ts`
  - No longer returns blanket fake `PARTIAL`; it now reports diagnostic registration readiness only.
- `src/lib/brain/v1-route-matrix.ts`
  - Still depends on compatibility `provider-registry.ts` and static `universal-model-catalog.ts` for diagnostics.
- `src/lib/runtime-capability-truth.ts`
  - Still reads `platform-settings-truth.ts` and `media-capability-registry.ts`; should move more directly onto canonical provider/capability truth over time.
- `src/app/api/admin/provider-capability-test/route.ts`
  - Intentionally bypasses canonical orchestration for single-provider proof; must remain clearly labeled as admin proof only.
- `src/app/api/admin/settings/test-provider/route.ts`
  - Intentionally bypasses canonical orchestration for settings/probe workflows; must remain clearly labeled by test kind.
- `src/lib/provider-registry.ts`
  - Active importers: `src/lib/brain/v1-route-matrix.ts`, `src/lib/capability-routing-policy.ts`, `src/lib/platform-settings-truth.ts`, `src/lib/provider-catalog.ts`, `src/lib/provider-gateway.ts`, `src/lib/providers.ts`, `src/lib/universal-provider-call.ts`, `src/app/api/admin/system/provider-gateway/route.ts`, `src/app/api/admin/providers/route.ts`
- `src/lib/model-registry.ts`
  - Active importers: `src/lib/ai-model-catalog.ts`, `src/lib/ai-routing-policy.ts`, `src/lib/brain.ts`, `src/lib/coding-agent.ts`, `src/lib/multimodal-router.ts`, `src/lib/routing-engine.ts`, `src/lib/repo-workbench.ts`, `src/app/api/admin/ai-partner/chat/route.ts`, `src/app/api/admin/benchmark/route.ts`, `src/app/api/admin/multimodal/route.ts`, `src/app/api/admin/routing/route.ts`
- `src/lib/media-capability-registry.ts`
  - Active importers: `src/lib/provider-capability-governance.ts`, `src/app/api/admin/ai-routing/smart/route.ts`, `src/lib/runtime-capability-truth.ts`
- `src/lib/ai-routing-policy.ts`
  - Active importers: `src/app/api/admin/ai-routing/smart/route.ts`, `src/app/api/admin/conversation/stream/route.ts`
- `src/lib/brain/v1-route-matrix.ts`
  - Active importers: `src/lib/runtime-capability-truth.ts`, `src/app/api/admin/ai-routing/route.ts`, `src/app/api/admin/system/v1-brain-route-matrix/route.ts`, `src/app/api/admin/system/ai-capabilities-truth/route.ts`, `src/app/api/admin/system/production-capabilities/route.ts`, `src/app/api/admin/system/operational-control-plane/route.ts`, `src/app/api/admin/models/route.ts`, `src/app/api/admin/media-studio/models/route.ts`
- `src/lib/runtime-capability-truth.ts`
  - Active importers: `src/lib/ai-routing-policy.ts`, `src/app/api/admin/voice/preview/route.ts`, `src/app/api/admin/voice/options/route.ts`, `src/app/api/admin/truth/route.ts`, `src/app/api/admin/system/readiness/route.ts`, `src/app/api/admin/ai-routing/smart/route.ts`, `src/app/api/admin/system/live-readiness/route.ts`, `src/app/api/admin/global-adult-mode/route.ts`, `src/app/api/admin/provider-governance/route.ts`, `src/lib/readiness-audit.ts`, `src/lib/tool-registry.ts`, `src/app/api/admin/runtime-truth/route.ts`
