# Runtime Source Of Truth

Last audited: 2026-06-18

The main platform is the Brain runtime. Apps request capabilities; apps do not choose providers, models, endpoints, fallback paths, artifact storage, or async job behavior.

## Canonical Runtime Path

`route -> executeCapability()/orchestrate() -> executeCapabilityOrchestration() -> planCanonicalExecution() -> provider discovery/model discovery/route scoring -> provider adapter -> job/artifact persistence`

## Canonical Files

| Truth area | Canonical owner | Notes |
|---|---|---|
| Provider contracts/endpoints/auth | `src/lib/providers/provider-truth.ts` | Only canonical AI provider contract table. |
| Provider discovery | `src/lib/providers/provider-discovery.ts` | Owns live catalog fetch, GenX fallback catalog, endpoint resolution. |
| Model discovery/filtering | `src/lib/providers/model-discovery.ts` | Filters discovered models by capability evidence. |
| Capability registry | `src/lib/providers/capability-registry.ts` | Canonical compact capability IDs and aliases. |
| V1 product matrix | `src/lib/brain/v1-capability-matrix.ts` | Dashboard/user-facing capability matrix. |
| Runtime route selection | `src/lib/providers/execution.ts` | Plans canonical execution from discovery, health, and scoring. |
| Orchestration/fallback/policy/artifacts/jobs | `src/lib/orchestrator.ts` | Runtime execution owner. |
| Provider adapters | `src/lib/ai-capability-adapters.ts` | Provider-native calls and polling contracts. |
| Artifact truth | `src/lib/artifact-store.ts` | Durable artifact metadata and storage references. |
| Async job truth | `src/lib/control-plane-jobs.ts`, `src/lib/media-job-store.ts` | Durable control-plane jobs and local media polling bridge. |
| Dashboard readiness projection | `src/lib/runtime-capability-truth.ts` | Reader/projection only. |
| Proof harness | `scripts/v1-25-capability-proof.ts` | Emits JSON/Markdown proof with required blocker fields. |

## Compatibility Shims

| File | What it controls | Used by | Classification | Risk | Exact action |
|---|---|---|---|---|---|
| `src/lib/capability-router.ts` | App-facing execution entry | Brain/admin/connected-app routes | Compatibility shim | Low | Keep as wrapper over `orchestrator.ts`. |
| `src/lib/provider-mesh.ts` | Provider/tool settings inventory | Settings, governance, tests | Compatibility shim | Medium | AI provider entries now project from `provider-truth.ts`; keep tools/storage here. |
| `src/lib/provider-registry.ts` | Admin readiness/model compatibility | Provider routes, route matrix, older admin surfaces | Compatibility shim | Medium | Auth/header now follows `provider-truth.ts`; migrate callers later. |
| `src/lib/provider-catalog.ts` | Admin provider catalog projection | Provider catalog route | Compatibility shim | Low | Keep as projection only. |
| `src/lib/model-registry.ts` | Legacy model registry projection | Routing/workbench/older admin routes | Replace later | High | Must be reduced after `ai-routing-policy`, workbench, and multimodal routes migrate. |
| `src/lib/universal-model-catalog.ts` | Static seed model catalog | V1 matrix and compatibility callers | Keep with caution | Medium | Static seed only; not live proof. |
| `src/lib/media-capability-registry.ts` | Media route projection | Adult gate, smart route UI | Compatibility shim | Medium | Keep as projection over V1 matrix. |
| `src/lib/brain/v1-route-matrix.ts` | Dashboard route matrix | Dashboard/admin readiness | Projection | Medium | Keep as reader; no provider truth may originate here. |
| `src/lib/runtime-capability-truth.ts` | Dashboard truth response | Dashboard/admin/readiness routes | Projection | Medium | Keep as dashboard reader only. |
| `src/lib/ai-routing-policy.ts` | Older admin smart routing | Admin conversation/smart route | Replace later | High | Migrate to `planCanonicalExecution()`. |

## Runtime Rules

- Normal chat and ordinary text responses must not create artifacts by default.
- Intentional outputs may create artifacts: image, video, audio, music, voiceover, code, document, research report, exported campaign/brand output.
- Async media jobs must expose Brain job status and must not force apps to poll raw provider job endpoints.
- Provider errors must be sanitized but specific enough to prove whether a key, endpoint, model, policy, tool, or adapter blocked execution.
- Dashboard/admin routes are readers of runtime truth, not owners of provider or model policy.

## Verification Commands

Use these before claiming readiness:

```powershell
npm test -- --run
npm run build
npx.cmd tsx scripts/v1-25-capability-proof.ts
git diff --check
git diff --stat
```
