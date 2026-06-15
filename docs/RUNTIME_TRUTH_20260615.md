# AmarktAI V1 Runtime Truth

Date: 2026-06-15
PR: #116
Branch: `v1/final-completion-20260615`

This report is the definitive code-evidence audit for the V1 runtime on this
date. It changes no runtime behavior.

## 1. Architecture

```text
CONNECTED APP
    |
    v
BRAIN GATEWAY
    |
    v
CAPABILITY ROUTER
    |
    v
PROVIDER REGISTRY
    |
    v
LIVE MODEL DISCOVERY
    |
    v
EXECUTION
    |
    v
ARTIFACT STORE
    |
    v
CONNECTED APP
```

This is the required architecture. Current runtime reaches it only partially:
the Brain gateway and artifacts are live, but execution still relies on
compatibility registries and hardcoded defaults. The Phase 1 live discovery
layer exists but is not yet the production execution dependency.

## 2. Canonical Files

| Ownership | Canonical files | Runtime state |
| --- | --- | --- |
| Operating law | `docs/OPERATING_TRUTH.md`, `docs/CODEX_CONTEXT.md`, `docs/CHANGELOG_AI.md` | CANONICAL |
| Provider truth and discovery | `src/lib/providers/*` | CANONICAL but UNUSED by production execution |
| Product capability truth | `src/lib/brain/v1-capability-matrix.ts` and `src/lib/providers/capability-registry.ts` | CANONICAL definitions; two different granularity levels must not become competing runtime lists |
| App-facing capability call | `src/lib/capability-router.ts` | CANONICAL compatibility entry point |
| Current execution | `src/lib/orchestrator.ts` | CANONICAL live orchestrator, internally dependent on LEGACY layers |
| Connected-app gateway | `/api/brain/request` and connected-app capability APIs | CANONICAL live entry points |
| Artifacts | `src/lib/artifact-store.ts`, storage driver, admin artifact APIs | CANONICAL and WORKING |
| Jobs/approvals | execution and control-plane job/approval modules and APIs | CANONICAL with provider-specific compatibility stores still present |
| Adult policy | app safety, adult app capability policy, and gated Brain routes | CANONICAL policy; provider execution remains partial |

### Current Brain

There is one live Brain request flow:

```text
/api/brain/request
  -> capability-engine resolution
  -> orchestrator
  -> routing-engine/model-registry/provider adapters
  -> optional artifact/job/memory/audit handling
```

`capability-router.ts` is a thin compatibility entry point to the orchestrator.
It is not a second execution engine. Specialist Brain routes are live where
listed in media and research reports, but several are honest placeholders.

### Brain File Inventory

| File or group | Classification | Ownership truth |
| --- | --- | --- |
| `src/lib/capability-router.ts` | CANONICAL | Stable app-facing capability entry; delegates to orchestrator. |
| `src/lib/orchestrator.ts` | CANONICAL | Current live orchestration owner. It must be simplified during, not before, parity cutover. |
| `src/lib/capability-contracts.ts` | CANONICAL | Request/response contract and supported product capability names. |
| `src/lib/brain/v1-capability-matrix.ts` | CANONICAL | Detailed 62-capability product and readiness matrix. |
| `src/lib/brain/v1-route-matrix.ts` | LEGACY | Compatibility projection used by admin/Studio truth APIs. |
| `src/lib/brain.ts` | LEGACY | Live authentication, credentials, provider calls, and event helpers with protocol/model assumptions. |
| `src/lib/capability-engine.ts` | LEGACY | Live request detection and route satisfaction before Brain execution. |
| `src/lib/capability-routing-policy.ts` | LEGACY | Live route-plan compatibility policy with hardcoded model choices. |
| `src/lib/routing-engine.ts` | LEGACY | Current orchestrator model selection. |
| `src/lib/smart-router.ts` | LEGACY | Performance-learning compatibility router used by orchestrator. |
| `src/lib/routing-profiles.ts` | LEGACY | Pre-Phase-1 profile implementation. |
| `src/lib/ai-routing-policy.ts`, `src/lib/live-ai-routing.ts` | LEGACY | Separate admin/agent route projections. |
| `src/lib/capability-packs.ts` | LEGACY | App discovery/package metadata with stale provider/model recommendations. |
| `src/lib/capability-tracing.ts` | CANONICAL | Durable execution trace recording used by live routes. |
| `src/lib/capability-gaps.ts` | UNUSED / DELETE | No production imports and obsolete provider truth. |
| `/api/brain/request`, `/execute`, `/stream`, `/relay` | CANONICAL | Live Brain gateway surfaces. |
| `/api/brain/image`, `/video-generate`, `/tts`, `/stt`, `/research`, `/embeddings`, `/rerank`, adult routes | CANONICAL | Live specialist surfaces with capability-specific readiness described below. |
| `/api/brain/image-edit`, `/avatar-video`, `/suggestive-video-gen` | PLACEHOLDER | Honest unavailable, needs-setup, or blocked contracts. |

### Provider File Inventory

| File or group | Classification | Ownership truth |
| --- | --- | --- |
| `src/lib/providers/provider-types.ts` | CANONICAL | Six provider IDs and provider/discovery types. |
| `src/lib/providers/provider-truth.ts` | CANONICAL | Provider endpoint and discovery truth without model IDs. |
| `src/lib/providers/capability-registry.ts` | CANONICAL | 23 capability IDs for provider discovery/scoring. |
| `src/lib/providers/provider-discovery.ts` | CANONICAL / UNUSED | Dynamic provider catalog discovery; no production execution caller. |
| `src/lib/providers/model-discovery.ts` | CANONICAL / UNUSED | Model eligibility from discovered evidence. |
| `src/lib/providers/provider-scoring.ts` | CANONICAL / UNUSED | Quality, speed, cost, health, policy, and artifact scoring. |
| `src/lib/providers/routing-profiles.ts` | CANONICAL / UNUSED | Six operating-law routing profiles. |
| `src/lib/providers/registry.ts` | CANONICAL / UNUSED | Dynamic capability route planner. |
| `src/lib/providers/provider-cache.ts`, `health.ts` | CANONICAL | Discovery cache and truthful health projection. |
| `src/lib/provider-mesh.ts` | LEGACY | Live approved-provider compatibility set used widely by APIs. |
| `src/lib/provider-mesh-status.ts`, `provider-config.ts` | LEGACY | Live credential and test-note readiness plumbing. |
| `src/lib/provider-registry.ts` | LEGACY | Live static defaults plus limited provider catalog discovery. |
| `src/lib/universal-model-catalog.ts`, `model-registry.ts` | LEGACY | Static model truth currently used by orchestrator/routing. |
| `src/lib/provider-catalog.ts`, `providers.ts` | LEGACY | Admin/API projections and DB provider CRUD. |
| `src/lib/provider-gateway.ts` | LEGACY / DELETE AFTER CUTOVER | Parallel hardcoded alias executor used by control-plane APIs. |
| `src/lib/universal-provider-call.ts` | LEGACY | Direct compatibility provider execution. |
| `src/lib/ai-capability-adapters.ts` | LEGACY | Live provider-native adapters; retain adapter protocols while moving selection to discovery. |
| `src/lib/hf-fallback.ts`, `hf-specialist-config.ts` | LEGACY | Static HF fallback and specialist model defaults. |
| `src/lib/genx-client.ts`, `genx-model-resolver.ts` | LEGACY | Live GenX protocol and static model resolution. |
| `src/lib/qwen-wanx-polling.ts`, specialist Qwen routes | LEGACY | Live Qwen job protocol with static fallback models. |
| Provider admin/settings test routes | LEGACY | Real connectivity/readiness checks over compatibility provider truth. |

### Provider Connectivity Truth

PR #113 recorded successful connectivity smoke checks for all six approved
providers. That proves credentials and a chat/connectivity contract, not every
declared capability.

| Provider | Connected | Proven executable truth |
| --- | --- | --- |
| Hugging Face | Yes | Chat connectivity; specialist routes are partial unless separately proven. |
| Together | Yes | Chat connectivity and persisted playable TTS artifact. |
| Groq | Yes | Chat connectivity and persisted playable TTS artifact. |
| GenX | Yes | Chat connectivity; media adapters exist but broad live media proof is incomplete. |
| Qwen | Yes | Chat connectivity; embeddings and media routes exist with incomplete broad proof. |
| MiMo | Yes | Chat connectivity and persisted playable TTS artifact through token-plan endpoint. |

## 3. Delete Candidates

Delete only in later PRs after import and parity proof:

| Candidate | Classification | Reason |
| --- | --- | --- |
| `src/lib/capability-gaps.ts` | DELETE | No runtime imports; stale prohibited providers/models. |
| `src/lib/coding-agent.ts` | DELETE | Separate excluded app-building system with placeholder auth scaffolds. |
| `src/lib/litellm-client.ts` | DELETE | Optional parallel routing with prohibited providers. |
| Stale provider rows in `prisma/seed.ts` | DELETE | Conflicts with approved provider truth. |
| Repo Workbench/App Builder operator-agent definitions | DELETE | Excluded from V1 operating truth. |
| `provider-gateway.ts` | DELETE AFTER CUTOVER | Hardcoded parallel route aliases still used by admin control-plane APIs. |
| `universal-model-catalog.ts` and legacy `model-registry.ts` tables | DELETE AFTER CUTOVER | Static duplicate model truth used by current execution. |
| Legacy provider registry/catalog/CRUD projections | DELETE AFTER CUTOVER | Multiple representations of provider truth remain live. |
| `capability-packs.ts` model/provider recommendations | DELETE AFTER CUTOVER | Stale app package routing data. |

No item is deleted in PR #116.

## 4. Placeholder Files And Routes

- `/api/brain/image-edit`: validates and returns `UNAVAILABLE`.
- `/api/brain/avatar-video`: returns `needs_setup`.
- `/api/brain/suggestive-video-gen`: explicitly blocked without an approved
  renderer.
- `/api/brain/suggestive-video`: policy/plan artifact, not rendered video.
- `multi-agent-team.ts`: real calls over process-local team/task state.
- Avatars dashboard: workspace management without avatar-video execution.
- Music blueprint fallback: useful planning output, not completed music.

## 5. Broken Or Contradictory Runtime

`BROKEN` here means the implementation contradicts operating truth or cannot
provide its named production contract:

- Phase 1 discovery is not called by production execution.
- `agent-runtime.ts` hardcodes obsolete model/provider defaults.
- `app-profiles.ts`, `capability-packs.ts`, `multimodal-router.ts`,
  `litellm-client.ts`, `coding-agent.ts`, and seed data reference prohibited
  direct providers.
- The RAG embedding model and vector dimension assumptions are coupled and can
  diverge.
- Capability status can diverge between the 62-capability matrix, 23-product
  capability registry, dashboard taxonomy, provider mesh, media registry, and
  static model catalog.
- Process-local team and some job/session stores are not multi-instance safe.

These are documented defects. Fixing them requires focused runtime PRs.

## 6. Capability Truth

| Capability | Status | Evidence |
| --- | --- | --- |
| chat | WORKING | All six providers have connectivity proof; Brain request executes text. |
| reasoning | PARTIAL | Execution exists, but specialist quality and dynamic route proof are incomplete. |
| research | PARTIAL | Model research and URL artifact flows exist; citation/source verification is incomplete. |
| scraping | PARTIAL | Local crawler/fetch works; broad browser and durable crawl-job proof is incomplete. |
| OCR | NOT IMPLEMENTED | No canonical upload OCR execution contract. |
| embeddings | PARTIAL | Qwen endpoint and RAG use real vectors but hardcode model/dimension assumptions. |
| rerank | PARTIAL | HF endpoint exists; dynamic selection and production proof incomplete. |
| image | PARTIAL | Real execution/artifact path exists; provider-level proof is incomplete. |
| image edit | NOT IMPLEMENTED | Honest unavailable endpoint only. |
| video | PARTIAL | Real provider job start/poll and plan artifacts exist; not universally proven. |
| image to video | PARTIAL | GenX/Qwen route exists; source and live proof incomplete. |
| music | PARTIAL | Can generate playable audio or honestly return blueprint only. |
| TTS | WORKING | Persisted playable artifacts proven through MiMo, Together, and Groq. |
| STT | PARTIAL | Real upload/provider/transcript artifact path; broad provider proof incomplete. |
| avatar | PARTIAL | Image path exists; talking avatar is not implemented. |
| adult | PARTIAL | Policy gating is real; text/image/video/voice provider proof varies and is incomplete. |
| artifacts | WORKING | Durable records, local storage, preview/download, reuse, archive. |
| agents | PARTIAL | Real synchronous calls and audit; hardcoded routing and process-local state remain. |
| memory | PARTIAL | Prisma memory and basic retrieval exist; semantic retrieval requires Qdrant/embeddings. |
| workflow | PARTIAL | Durable definitions/runs and executable steps exist; canonical routing/artifact parity incomplete. |

## 7. Go-Live Readiness

### Can connected apps be connected tomorrow?

Yes, for scoped capabilities that are already proven and with production
credentials, signing secrets, HTTPS, database, and storage configured. Do not
promise every declared capability. Connected apps must call AmarktAI, never a
provider directly.

### Can the Marketing App run tomorrow?

Only a limited integration can run safely: chat/text, proven TTS, artifact
storage, basic research, jobs, and policy-gated requests. Full campaign bundles,
brand retrieval, publishing, analytics, and all creative media are not 100%
production-ready.

### Generation Readiness

| Output | Readiness |
| --- | --- |
| Images | PARTIAL |
| Reels/short video | PARTIAL |
| Long-form video | NOT PROVEN |
| Music | PARTIAL |
| Avatars | PARTIAL for image; NOT IMPLEMENTED for talking video |
| Voice | WORKING for proven TTS; PARTIAL for STT; voice clone not implemented |
| Research | PARTIAL |

### What Remains Before 100 Percent Production Ready

1. Cut one live capability family at a time to Phase 1 dynamic discovery and
   scoring, with parity and fallback tests.
2. Remove prohibited providers and static model routing only after cutover.
3. Unify product, provider, media, and dashboard capability truth projections.
4. Make agent/team/media jobs durable and multi-instance safe.
5. Complete source-image, source-video, OCR, document ingest, avatar video, and
   voice consent contracts where they are V1 requirements.
6. Prove provider-native media workflows in production and verify artifact
   preview/download for each.
7. Complete deployment infrastructure checks for DB, Redis where required,
   Qdrant where required, storage, workers, HTTPS, and backups.

## Final Classification Summary

- CANONICAL: operating docs, Phase 1 provider discovery foundation, Brain
  gateway, capability-router entry, orchestrator ownership, artifacts, app
  policy, connected-app authentication.
- LEGACY: provider mesh/registry/catalog, static model catalog, routing engine,
  smart router, app profiles, capability packs, specialist defaults.
- PLACEHOLDER: image edit, avatar video, suggestive rendered video, in-memory
  teams, blueprint-only media outcomes.
- BROKEN: any runtime claim that dynamic discovery is already executing, stale
  prohibited-provider routes, coupled RAG dimensions, or non-durable state
  presented as production durable.
- UNUSED: Phase 1 dynamic route planner by production callers; capability gaps
  module.
- DELETE: only the candidates listed above, in future evidence-backed PRs.
