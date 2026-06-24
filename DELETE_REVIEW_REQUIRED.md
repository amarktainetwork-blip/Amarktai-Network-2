# Delete Review Required

Last audited: 2026-06-18

No source file was blindly deleted in this pass. The files below are either active callers, compatibility shims, or stale docs that need removal/rewrite after their import/reference graph is migrated.

## Delete Now

None proven safe in this audit.

## Replace Now

| File | Why | Current action |
|---|---|---|
| `src/lib/provider-mesh.ts` | Previously duplicated AI provider endpoint/capability truth. | Replaced AI provider entries with projection from `src/lib/providers/provider-truth.ts`; kept tool/storage inventory. |
| `src/lib/provider-registry.ts` | Compatibility registry could disagree on auth headers. | Auth/header now follows `provider-truth.ts`; still a shim. |
| `scripts/v1-25-capability-proof.ts` | Proof report missed required contract fields. | Expanded JSON/Markdown output. |

## Compatibility Shim

| File | Active callers | Keep condition |
|---|---|---|
| `src/lib/capability-router.ts` | Brain/admin/connected-app routes | Must remain a thin wrapper over `orchestrator.ts`. |
| `src/lib/provider-mesh.ts` | Settings/governance/admin routes | AI provider data must continue projecting from `provider-truth.ts`. |
| `src/lib/provider-registry.ts` | Provider admin/readiness/legacy route callers | Must not introduce provider truth not found in `provider-truth.ts`. |
| `src/lib/provider-catalog.ts` | Provider catalog route | Projection only. |
| `src/lib/media-capability-registry.ts` | Adult gate, smart route UI | Projection over V1 matrix only. |
| `src/lib/runtime-capability-truth.ts` | Dashboard/readiness routes | Reader only. |
| `src/lib/brain/v1-route-matrix.ts` | Dashboard/admin route matrix | Reader/projection only. |

## Keep

| File | Reason |
|---|---|
| `src/lib/providers/provider-truth.ts` | Canonical AI provider contracts. |
| `src/lib/providers/provider-discovery.ts` | Canonical model/provider discovery. |
| `src/lib/providers/model-discovery.ts` | Canonical capability model filtering. |
| `src/lib/providers/execution.ts` | Canonical route planning. |
| `src/lib/providers/capability-registry.ts` | Canonical compact capability IDs. |
| `src/lib/brain/v1-capability-matrix.ts` | Canonical V1 product capability matrix. |
| `src/lib/orchestrator.ts` | Canonical runtime execution/fallback/artifact/job owner. |
| `src/lib/ai-capability-adapters.ts` | Canonical provider adapters. |
| `src/lib/artifact-store.ts` | Canonical artifact persistence. |
| `src/lib/control-plane-jobs.ts` | Canonical durable job state. |

## Doc Delete Or Rewrite Required

| File | Problem | Action |
|---|---|---|
| `docs/adding-a-provider.md` | Tells developers to edit legacy registries and dashboard arrays. | Rewrite to point at `provider-truth.ts` and proof harness. |
| `docs/registering-models.md` | Presents `MODEL_REGISTRY` as active truth. | Rewrite as compatibility-only or delete. |
| `docs/brain-api.md` | Contains OpenAI/Whisper examples and provider/model response examples as if active. | Rewrite around capability-only requests. |
| `docs/developer-guide.md` | Shows provider/model selection in app calls. | Rewrite around app capability requests. |
| `docs/budget-management.md` | Uses old OpenAI pricing examples as current. | Rewrite using provider-agnostic cost buckets. |
| `docs/provider-truth.json`, `docs/provider-capabilities.json`, `docs/model-catalog.json` | Static docs can be confused with runtime truth. | Move under archived docs or regenerate from canonical runtime. |
