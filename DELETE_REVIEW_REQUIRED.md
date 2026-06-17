# Delete Review Required

## Not deleted in this pass because proof was insufficient or callers remain

### `src/lib/agent-audit.ts`

- Reason: still used by `/api/brain/agent/dispatch`.
- Current state: downgraded to diagnostic registration/readiness semantics; it is not runtime capability proof.
- Required follow-up: remove entirely once `/api/brain/agent/dispatch` no longer depends on a separate audit layer.

### `src/lib/agent-registry.ts`

- Reason: still used by `/api/admin/agents` and `/api/admin/amarktai-assistant/context`.
- Problem: operator catalog can be mistaken for runtime agent deployment truth.
- Cleanup action already taken: relabeled as `operator_catalog` surface.

### `src/lib/provider-mesh.ts`

- Reason: active settings/governance/admin callers remain.
- Problem: overlaps conceptually with canonical provider truth.
- Required follow-up: narrow it to inventory/governance only.

### `src/lib/provider-registry.ts`

- Reason: active compatibility/admin readiness callers remain.
- Problem: name collides with canonical `src/lib/providers/registry.ts`.
- Active importers: `src/lib/brain/v1-route-matrix.ts`, `src/lib/capability-routing-policy.ts`, `src/lib/platform-settings-truth.ts`, `src/lib/provider-catalog.ts`, `src/lib/provider-gateway.ts`, `src/lib/providers.ts`, `src/lib/universal-provider-call.ts`, `src/app/api/admin/system/provider-gateway/route.ts`, `src/app/api/admin/providers/route.ts`
- Required follow-up: reduce or rename after callers migrate.

### `src/lib/model-registry.ts`

- Reason: active compatibility/admin callers remain.
- Problem: compatibility projection over other model truth layers.
- Active importers: `src/lib/ai-model-catalog.ts`, `src/lib/ai-routing-policy.ts`, `src/lib/brain.ts`, `src/lib/coding-agent.ts`, `src/lib/multimodal-router.ts`, `src/lib/routing-engine.ts`, `src/lib/repo-workbench.ts`, `src/app/api/admin/ai-partner/chat/route.ts`, `src/app/api/admin/benchmark/route.ts`, `src/app/api/admin/multimodal/route.ts`, `src/app/api/admin/routing/route.ts`

### `src/lib/ai-model-catalog.ts`

- Reason: active admin/model catalog callers remain.
- Problem: static/admin catalog, not runtime truth.

### `src/lib/approved-ai-catalog.ts`

- Reason: active governance/admin callers remain.
- Problem: approval projection, not runtime execution truth.

### `src/lib/universal-model-catalog.ts`

- Reason: active static catalog callers remain.
- Problem: static catalog can be confused with live execution/discovery truth.

### `src/lib/media-capability-registry.ts`

- Reason: active runtime/dashboard adult-gate projection callers remain.
- Problem: legacy projection over V1 capability truth.
- Active importers: `src/lib/provider-capability-governance.ts`, `src/app/api/admin/ai-routing/smart/route.ts`, `src/lib/runtime-capability-truth.ts`

### `src/lib/brain/v1-route-matrix.ts`

- Reason: active dashboard/admin callers remain.
- Problem: diagnostic route matrix still depends on compatibility catalog/readiness layers.
- Active importers: `src/lib/runtime-capability-truth.ts`, `src/app/api/admin/ai-routing/route.ts`, `src/app/api/admin/system/v1-brain-route-matrix/route.ts`, `src/app/api/admin/system/ai-capabilities-truth/route.ts`, `src/app/api/admin/system/production-capabilities/route.ts`, `src/app/api/admin/system/operational-control-plane/route.ts`, `src/app/api/admin/models/route.ts`, `src/app/api/admin/media-studio/models/route.ts`

### `src/lib/ai-routing-policy.ts`

- Reason: still used by isolated admin smart-routing and conversation surfaces.
- Active importers: `src/app/api/admin/ai-routing/smart/route.ts`, `src/app/api/admin/conversation/stream/route.ts`

### `src/lib/runtime-capability-truth.ts`

- Reason: active runtime/dashboard/admin readers remain.
- Active importers: `src/lib/ai-routing-policy.ts`, `src/app/api/admin/voice/preview/route.ts`, `src/app/api/admin/voice/options/route.ts`, `src/app/api/admin/truth/route.ts`, `src/app/api/admin/system/readiness/route.ts`, `src/app/api/admin/ai-routing/smart/route.ts`, `src/app/api/admin/system/live-readiness/route.ts`, `src/app/api/admin/global-adult-mode/route.ts`, `src/app/api/admin/provider-governance/route.ts`, `src/lib/readiness-audit.ts`, `src/lib/tool-registry.ts`, `src/app/api/admin/runtime-truth/route.ts`

### `src/app/api/admin/truth/route.ts`

- Reason: retained for backward compatibility as a legacy aggregation endpoint.
- Cleanup action already taken: removed false single-source-of-truth claim and rewired to real runtime/model sources.
