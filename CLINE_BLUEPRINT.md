# Cline Blueprint

Last audited: 2026-06-18

This is the strict continuation brief for Cline/GPT-5.4. It must not become a second source of truth. It points to the canonical runtime/provider/capability files and defines which future work is safe for Cline.

## Canonical Source-Of-Truth Files And Routes

| Area | Path | Role | Consumers | Must not duplicate |
|---|---|---|---|---|
| Provider truth | `src/lib/providers/provider-truth.ts` | Six approved provider contracts: auth, endpoints, capabilities, features. | Provider discovery, Brain selector, Settings, proof, docs. | Provider IDs, endpoints, env aliases, active provider list. |
| Provider discovery | `src/lib/providers/provider-discovery.ts` | Live/public/static model discovery and HF curation. | Brain selector, proof, provider matrix, Settings. | Provider catalog normalization or HF curated model rules. |
| Model discovery | `src/lib/providers/model-discovery.ts` | Capability-specific model filtering and provider-contract evidence. | Brain selector, proof, route planner. | Capability-to-model selection logic. |
| Provider scoring | `src/lib/providers/provider-scoring.ts` | Candidate acceptance/rejection and policy scoring. | Brain selector, provider matrix, proof. | Rejection rules, adult gates, artifact gates, GenX premium boost. |
| Brain selector | `src/lib/providers/execution.ts`, `src/lib/providers/registry.ts` | Capability/policy route planning, selected model, fallback chain. | Apps, Studio, dashboard, proof. | Runtime provider/model selection. |
| Selector API | `src/app/api/admin/brain/selector/route.ts` | Dashboard dry-run and smoke-test surface. | Provider matrix page. | Provider/model maps in UI. |
| Capability registry | `src/lib/providers/capability-registry.ts` | Compact canonical capability IDs and aliases. | Brain selector, apps, Studio, proof. | Capability aliases or policy. |
| V1 capability matrix | `src/lib/brain/v1-capability-matrix.ts` | Product-facing capability matrix projection. | Capabilities dashboard, V1 proof. | Runtime provider readiness. |
| V1 proof harness | `scripts/v1-25-capability-proof.ts`, `scripts/load-repo-env.ts` | CLI proof, env diagnostics, provider/model/capability evidence. | VPS verification, docs, blockers. | Fake readiness or secret printing. |
| Media/artifact store | `src/lib/canonical-media-artifact.ts`, `src/lib/media-job-store.ts`, `src/lib/artifact-store.ts` | Provider output normalization, job polling, durable artifacts. | Studio, artifacts dashboard, connected apps, proof. | Per-route artifact persistence unless required by provider. |
| Studio execution runner | `src/lib/execution/execution-runner.ts`, `src/lib/media-studio.ts`, `src/app/api/admin/studio/execute/route.ts` | Execution lifecycle, completion evidence, Studio response. | Studio UI, jobs/artifacts, proof. | Completed status without output evidence. |
| Dashboard truth API | `src/app/api/admin/system/ai-capabilities-truth/route.ts`, `src/lib/runtime-capability-truth.ts` | Dashboard projection of capability proof truth. | Capabilities page, overview. | Counts or labels that overclaim proof. |
| Settings provider API | `src/app/api/admin/settings/*`, `src/app/api/admin/system/provider-diagnostics/route.ts` | Key/catalog/smoke/provider diagnostics. | Settings, provider diagnostics. | Capability live-proof labels. |
| Open-source stack | `ACTIVE_OPEN_SOURCE_STACK.md`, `src/lib/settings-runtime-tools.ts`, `src/lib/local-tools.ts` | Runtime tool dependency inventory. | Settings, proof, Cline planning. | Service/tool readiness claims without checks. |
| Incomplete/blockers | `INCOMPLETE_AND_BLOCKED.md`, `V1_25_CAPABILITY_PROOF.json` | Current blocker projection from proof. | Operators, Cline. | Hand-maintained readiness counts that conflict with proof. |

## Non-Negotiable Rules

- Six direct active providers only: GenX, Hugging Face, Qwen/DashScope, Xiaomi MiMo, Groq, Together.
- Apps request capabilities only. Apps do not hardcode providers, models, endpoints, or fallback chains.
- Brain/runtime selects provider/model from canonical truth and proof evidence.
- Premium means GenX-first where GenX has executable proof for the requested capability.
- Balanced means best executable mix across quality, cost, latency, reliability, policy, and artifact evidence.
- Cheap means cheapest executable model satisfying the capability and policy gates.
- Pinned provider/model must fail honestly when fallback is disabled or when the pin is not executable.
- Normal chat does not create artifacts by default.
- Durable generated outputs must have artifact/job/preview/download evidence before Studio shows completed.
- Dashboard cannot show green without evidence: catalog, provider smoke, model execution, route execution, artifact persistence, preview/download.
- Adult routes require explicit adult profile/policy/app gate and provider/model eligibility.
- Hugging Face uses curated executable categories only; never ingest all HF models as executable.

## App Setup Blueprint

For each future app, define this profile before launch:

| Field | Requirement |
|---|---|
| App capability profile | List canonical capabilities from `src/lib/providers/capability-registry.ts`. |
| Provider policy | `cheap`, `balanced`, `premium`, or `pinned`. |
| Provider/model preferences | Optional hints only; Brain selector validates them. |
| Fallback policy | Explicit `fallbackAllowed: true/false`. |
| Adult allowed | Explicit yes/no with app adult profile and policy proof. |
| Artifact requirements | Which capabilities require preview/download/history artifacts. |
| Brand kit requirements | Required only if app output needs brand styling. |
| Budget policy | Cost tier, rate limits, and approval thresholds. |
| Launch proof | Dry-run plan plus live smoke/model execution proof for each required capability. |

## Dashboard And Website Redesign Blueprint

Do not implement the full redesign in this pass. Future Cline visual work must consume existing APIs.

| Page | Route | Files | APIs to consume | Do not hardcode |
|---|---|---|---|---|
| Dashboard overview | `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | `/api/admin/dashboard`, `/api/admin/system/ai-capabilities-truth` | Provider readiness counts. |
| Settings | `/admin/dashboard/settings` | `src/app/admin/dashboard/settings/page.tsx` | `/api/admin/settings/*`, provider diagnostics | Capability live proof. |
| Capabilities | `/admin/dashboard/capabilities` | `src/app/admin/dashboard/capabilities/page.tsx` | `/api/admin/system/ai-capabilities-truth` | V1 proof counts. |
| Studio | `/admin/dashboard/studio` | `src/app/admin/dashboard/studio/page.tsx` | `/api/admin/studio/execute`, media job routes | Completed state without evidence. |
| Artifacts | `/admin/dashboard/artifacts` | `src/app/admin/dashboard/artifacts/page.tsx` | `/api/admin/artifacts`, download route | Storage paths or generated URLs. |
| Provider/model matrix | `/admin/dashboard/provider-matrix` | `src/app/admin/dashboard/provider-matrix/page.tsx` | `/api/admin/brain/selector` | Provider/model maps. |
| Runtime tools/open-source stack | Settings/system pages | `ACTIVE_OPEN_SOURCE_STACK.md`, runtime tool APIs | Settings runtime tool routes | Installed/service status. |
| Blockers/action plan | Future dashboard page | `INCOMPLETE_AND_BLOCKED.md`, proof JSON | Proof JSON | Readiness counts. |
| Larger chat workspace | Future dashboard page | Command/Studio routes | Brain execute/request routes | Provider/model choice. |
| Public landing page | `/` | Public app files | Product/status APIs only if needed | Runtime proof labels. |

## Important System Map

| System | Source files/routes | Status | Exact blockers | Dependencies | Safe for Cline | Done criteria |
|---|---|---|---|---|---|---|
| Researcher/web research | `src/lib/research-runtime.ts`, `src/lib/research-tools.ts`, `/api/brain/research`, `/api/admin/research/*` | PARTIAL | Playwright browser install, Scrapy/Trafilatura availability, provider route proof. | Playwright, Scrapy, Trafilatura, approved chat/reasoning provider, artifact store. | CLINE_WITH_CAUTION | Research route produces sourced result and optional durable report artifact when requested. |
| Scraper/crawler tools | `src/lib/local-tools.ts`, `src/lib/research-tools.ts` | BLOCKED locally | Scrapy/Trafilatura missing locally; VPS install must be proven. | Python modules, Playwright Chromium. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Tool checks pass and research proof records tool usage. |
| Agents | `src/lib/agent-runtime.ts`, `src/lib/agent-registry.ts`, `/api/admin/agents`, `/api/brain/agent-request` | SOURCE_WIRED | Runtime proof must execute a real provider/model request. | Brain selector, memory, retrieval, approvals. | CLINE_WITH_CAUTION for UI only | Agent request execution returns audited result with provider/model proof. |
| Agent request execution | `src/lib/app-agent.ts`, `/api/brain/agent-request`, `/api/brain/agent/dispatch` | BLOCKED | Needs live route execution and error/log persistence proof. | Approved provider, route outcome logging. | CODEX_OR_HUMAN_REVIEW_REQUIRED | V1 proof marks `agent_request_execution` LIVE_PROVEN. |
| Connected app signing/proof | `src/lib/connected-app-capability-engine.ts`, `src/lib/connected-apps.ts`, `/api/connected-apps/capabilities/*` | SOURCE_WIRED | Requires real app registration, signing secret, HMAC request, scopes. | DB, signing secret env, artifact store. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Signed request executes scoped capability and records audit/job/artifact. |
| Self-learning/memory/daily learning | `src/lib/memory.ts`, `src/lib/agent-runtime.ts`, `/api/admin/memory`, `/api/admin/learning` | PARTIAL | Needs policy boundaries and persistent proof per app namespace. | DB, optional vector store. | CLINE_WITH_CAUTION for UI | Memory writes/reads are namespaced, audited, and policy-gated. |
| Workflow engine | `src/lib/workflow-engine.ts`, `/api/workflows` | SOURCE_WIRED | Needs end-to-end run proof through provider/tool steps. | DB/local store, Brain routes. | CLINE_WITH_CAUTION | Workflow run produces persisted execution status and artifacts when durable. |
| Workspace executor | `src/lib/workspace-executor.ts`, `/api/admin/workspace/run`, repo workbench routes | PARTIAL | Command sandbox/approval and durable output proof required. | Local workspace, approvals, artifact store. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Workspace run has audit log, output artifact when durable, and no unsafe default execution. |
| Route outcome logging | `src/lib/capability-tracing.ts`, execution/event routes | SOURCE_WIRED | Needs DB-backed persisted trace row in proof. | DB/event store. | CLINE_WITH_CAUTION for display | Proof shows persisted route outcome for a real route. |
| Worker/job retry/polling | `src/lib/job-queue.ts`, `src/lib/control-plane-jobs.ts`, `scripts/worker.mjs`, `src/lib/media-job-store.ts` | BLOCKED locally | Redis/worker process not running locally; VPS service proof needed. | Redis, BullMQ, worker service, provider polling. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Async provider job completes through worker and artifact appears. |
| Vector store/Qdrant | Retrieval/memory routes, `@qdrant/js-client-rest` usage | SOURCE_WIRED | Qdrant service URL/collection health not proven locally. | Qdrant service, env. | CLINE_WITH_CAUTION for UI | Retrieval smoke passes and records vector store health. |
| Redis/BullMQ | `src/lib/job-queue.ts`, `src/lib/control-plane-jobs.ts`, `scripts/worker.mjs` | SOURCE_WIRED | Service/process not proven locally. | Redis server, worker service. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Queue enqueue, retry, poll, complete proof passes. |
| Artifact gallery | `src/lib/artifact-store.ts`, `/api/admin/artifacts`, `/admin/dashboard/artifacts` | SOURCE_WIRED | VPS storage write/read/download proof required. | DB, storage driver/root. | CLINE_WITH_CAUTION | Every durable media output has preview/download/gallery entry. |
| Brand kit | Brand/admin product files | SOURCE_WIRED | Needs app-specific brand application tests. | DB/product/app settings. | SAFE_FOR_CLINE | Brand assets render through existing APIs only. |
| Adult policy/profile gates | `src/lib/adult-app-capabilities.ts`, `src/lib/content-filter.ts`, adult routes/settings | BLOCKED | Explicit app adult gate and provider approval missing until configured/proven. | Adult profile DB state, policy gate, provider eligible model. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Adult proof only passes with explicit app policy and approved provider/model. |
| Long-form video pipeline | `src/lib/long-form-video.ts`, `/api/admin/video-projects`, video routes | BLOCKED | Requires ffmpeg/ffprobe and completed source clips/jobs. | ffmpeg, ffprobe, storage, media jobs. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Multi-scene output persists video artifact with playback/download. |
| Music/voice pipeline | `src/lib/music-studio.ts`, `/api/brain/tts`, `/api/brain/stt`, `/api/admin/music-studio/*` | PARTIAL | Provider/model and artifact proof required per route. | Approved provider, artifact store, audio preview. | CLINE_WITH_CAUTION for UI | TTS/music produce playable artifact; STT transcript saved only by request/job attachment. |
| Avatar/lip-sync pipeline | `/api/brain/avatar`, `/api/brain/avatar-video`, avatar routes, `src/lib/ai-capability-adapters.ts` | BLOCKED | Rhubarb/lip-sync binary/service adapter missing. | Rhubarb or approved lip-sync service, ffmpeg, video provider. | CODEX_OR_HUMAN_REVIEW_REQUIRED | Talking avatar video persists playable/downloadable artifact. |

## Cline Safety Classification

SAFE_FOR_CLINE:

- Dashboard visuals consuming existing APIs.
- Website visuals.
- CSS/layout/components.
- Docs cleanup.
- Cards/tables that consume existing truth APIs.

CLINE_WITH_CAUTION:

- Artifact gallery UI.
- Studio result rendering.
- Tests around existing contracts.
- App profile UI.
- Research/agents/memory display surfaces.

CODEX_OR_HUMAN_REVIEW_REQUIRED:

- Provider discovery/scoring.
- Provider execution adapters.
- Brain selector rules.
- Artifact/media-job persistence.
- Adult policy routing.
- Worker infrastructure.
- Connected-app signing.
- DB schema changes.
- Deleting provider/runtime code.

## Required Checks After Future Changes

```powershell
npm test -- --run
npx tsc --noEmit --pretty false
npm run build
npx tsx scripts/v1-25-capability-proof.ts
git diff --check
git diff --stat
```

Run the proof script whenever backend/runtime/provider/artifact/dashboard-truth code changes.
