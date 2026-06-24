# V1 Test Truth Inventory

Baseline on `integration/cline-source-of-truth` at `511e5fd`:

- 38 Vitest files
- 762 tests passing

Final inventory:

- 21 files kept unchanged
- 4 files rewritten
- 13 files deleted
- 1 current V1 product-truth contract added
- 26 Vitest files total

Passing tests were not treated as automatically correct. Files that protected V2 products, obsolete route names, fake platform modules, or old branding were removed.

| Test file | Classification | What it protects | V1 action |
|---|---|---|---|
| `adult-capability.test.ts` | KEEP | Adult route policy and execution truth | Retained |
| `adult-model-catalog.test.ts` | KEEP | Adult model policy projection | Retained |
| `agent-runtime.test.ts` | V2 ONLY | Multi-agent product runtime | Deleted |
| `api-routes-and-labs.test.ts` | STALE / WRONG PRODUCT TRUTH | Coding agent, labs, tool/workflow marketplace assumptions | Deleted |
| `app-agent-golive.test.ts` | V2 ONLY | Per-app specialist agents and old go-live claims | Deleted |
| `capability-router-contract.test.ts` | KEEP | Canonical capability routing | Retained |
| `command-router.test.ts` | STALE / WRONG PRODUCT TRUTH | App Builder, Workbench, PR, and deploy surfaces | Deleted with unused router |
| `config-validator.test.ts` | KEEP | Safe configuration validation | Retained |
| `dashboard-productization-fix.test.ts` | REWRITE | Old dashboard wording and removed pages | Replaced by `v1-product-truth.test.ts` |
| `emotion-engine.test.ts` | V2 ONLY | Emotion product subsystem | Deleted |
| `emotion-persistence-enrichment.test.ts` | V2 ONLY | Emotion persistence and enrichment | Deleted |
| `genx-client.test.ts` | KEEP | Approved provider adapter behavior | Retained |
| `image-dispatch-guard.test.ts` | KEEP | Image capability dispatch guard | Retained |
| `live-media-execution-contract.test.ts` | KEEP | Media job and artifact lifecycle | Retained |
| `multimodal-router.test.ts` | KEEP | Multimodal capability routing | Retained |
| `new-platform-modules.test.ts` | STALE / WRONG PRODUCT TRUTH | Skill marketplace, integration hub, multi-agent teams | Deleted |
| `new-systems.test.ts` | STALE / WRONG PRODUCT TRUTH | Self-healing, playground projects, GitHub product flow | Deleted |
| `orchestrator.test.ts` | KEEP | Core orchestration behavior | Retained |
| `phase0-product-routes.test.ts` | REWRITE | Product route and adult-output contracts | Rewritten for seven V1 routes |
| `phase0-source-of-truth.test.ts` | STALE / WRONG PRODUCT TRUTH | Fourteen-section dashboard including V2 products | Deleted |
| `phase1-execution-core.test.ts` | REWRITE | Shared execution core plus obsolete product routes | Kept execution tests; removed stale product assertions |
| `phase2-artifact-library.test.ts` | REWRITE | Artifact persistence plus App Builder/Workbench producers | Rewritten for canonical Artifacts route and V1 producers |
| `phase3-command-center.test.ts` | KEEP | Command Center execution API | Retained |
| `phase4-media-studio.test.ts` | REWRITE | Studio execution and old provider-picker copy | Updated for capability-first Studio |
| `phase5-connected-apps.test.ts` | KEEP | Connected app registration, scopes, HMAC, events | Retained |
| `platform-expansion.test.ts` | V2 ONLY | App profiles and legacy routing projections | Deleted |
| `public-website-3d-product-showcase.test.ts` | STALE / WRONG PRODUCT TRUTH | Removed canvas showcase and old public copy | Deleted |
| `repo-workbench-safety.test.ts` | V2 ONLY | Repo Workbench helpers | Deleted |
| `research-capability.test.ts` | KEEP | Research capability truth | Retained |
| `retrieval-engine.test.ts` | KEEP | Retrieval behavior | Retained |
| `storage-persistence.test.ts` | KEEP | Artifact storage policy | Retained |
| `suggestive-capability.test.ts` | KEEP | Suggestive-content policy | Retained |
| `v1-ai-capability-truth.test.ts` | KEEP | Canonical V1 capability matrix | Retained |
| `v1-all-ai-capabilities-wired.test.ts` | KEEP | Adapter and route coverage | Retained |
| `v1-deployment-readiness.test.ts` | KEEP | Credentials, storage, and signing readiness | Retained |
| `v1-final-source-truth-cleanup.test.ts` | KEEP | Canonical provider/model/capability projections | Retained |
| `v1-live-provider-smoke-tests.test.ts` | KEEP | Approved-provider smoke-test rules | Retained |
| `video-job-artifact-link.test.ts` | KEEP | Video job artifact reconciliation | Retained |
| `v1-product-truth.test.ts` | KEEP | Current brand, public site, routes, nav, connected apps, and singular truth | Added |

## Coverage Decision

No meaningful V1 backend coverage was deleted. Deleted files covered V2 products or broad legacy systems outside the V1 product contract. Current V1 route, brand, navigation, connected-app, capability, policy, execution, job, and artifact behavior is protected directly.
