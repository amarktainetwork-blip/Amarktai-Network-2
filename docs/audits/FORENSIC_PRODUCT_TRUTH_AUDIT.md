# Forensic Product Truth Audit

Audit date: 2026-05-07  
Repository: `amarktainetwork-blip/Amarktai-Network-2`  
Audited baseline: `origin/main` at `9272b92` (`Merge pull request #59 from amarktainetwork-blip/pr-59-superbrain-dashboard-final-architecture`)  
Audit branch: `audit/forensic-product-truth-report`  
Scope: repo inventory, dashboard truth, backend/API truth, provider/model truth, Workbench, Studio/media, apps/agents, memory/learning/emotion, storage/VPS/operations, adult policy, MCP/tooling, tests, and unauthenticated live deployment checks.  
Constraint honored: no application code was changed for this audit.

## Executive verdict

The current app should be salvaged by keeping the backend and rebuilding/wiring the dashboard in place. A full restart is not justified by the evidence: there is a large working Next.js/Prisma backend, real provider routes, real Workbench Git safety code, real storage abstractions, a test suite, and a merged six-section dashboard architecture. The failure is product wiring and frontend truth, not absence of backend.

Recommended path: **B. dashboard rebuild using existing backend**, with a narrow backend cleanup PR first.

Scores:

| Area | Score | Evidence |
| --- | ---: | --- |
| Backend reuse | 78/100 | 211 API route files, 123 top-level lib modules, Prisma schema, provider routes, Workbench backend, storage, memory, agents, tests. Several old/duplicate routes remain. |
| Frontend/dashboard reuse | 52/100 | Final nav exists and matches target, but several pages are status/read-only surfaces. Studio media tabs mostly route to chat stream, Apps & Agents has no editor, Settings is key-only. |
| Workbench readiness | 68/100 | UI is simplified and backend has real clone, branch, patch, apply, checks, commit, push, PR, merge/deploy guards. Needs live token/key proof and job persistence UX hardening. |
| Studio/media readiness | 38/100 | Studio exists with tabs and streaming chat. Media routes exist, but Studio does not call the image/video/music/STT/adult media routes directly. Assistant TTS admin route returns `Needs key/test` by design. |
| Apps/agents readiness | 45/100 | Canonical agents exist and app package backend persists JSON. UI is mostly summary/read-only; agent execution is route-selection status, not full action execution. |
| Operations/storage readiness | 61/100 | Operations reads real storage/cost/research/system status. Storage root logic is split between `AMARKTAI_STORAGE_ROOT` and `STORAGE_ROOT`; live VPS proof still needed. |

## Live deployment truth

Unauthenticated checks were run against both domains referenced in the repo/docs.

| URL | Result | Evidence |
| --- | --- | --- |
| `https://amarktai.network/` | DNS failure | `The remote name could not be resolved: 'amarktai.network'` |
| `https://amarktai.network/admin/login` | DNS failure | Same DNS failure |
| `https://amarktai.network/api/health/ping` | DNS failure | Same DNS failure |
| `https://amarktai.com/` | 200 | HTML returned |
| `https://amarktai.com/admin/login` | 200 | HTML returned |
| `https://amarktai.com/admin/dashboard` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/admin/dashboard/workbench` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/admin/dashboard/apps-agents` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/admin/dashboard/memory-learning` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/admin/dashboard/operations` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/admin/dashboard/settings` | 307 | Redirects to `/admin/login` without session |
| `https://amarktai.com/api/health/ping` | 200 | JSON health returned |
| `https://amarktai.com/api/health` | 200 | JSON health returned with `db:"ok"` |
| `https://amarktai.com/api/admin/system/status` | 401 | Protected admin API returns Unauthorized |
| `https://amarktai.com/api/admin/ai-model-catalog` | 401 | Protected admin API returns Unauthorized |

Live dashboard internals could not be inspected without admin credentials. That is a real limitation of this audit, not a failure signal by itself.

## Phase 1 - Repo inventory

### Framework and stack actually used

KEEP:

- Next.js 15 App Router, React 18, TypeScript.
- Tailwind CSS, Radix UI primitives, lucide-react, recharts, framer-motion.
- Prisma 5 with PostgreSQL datasource.
- iron-session cookie session auth.
- Vitest test suite.
- Node server-side APIs using `fetch`, `fs`, `child_process`, Redis/BullMQ optional paths, Qdrant optional vector path, local VPS storage.
- Docker, docker-compose, Nginx/systemd deployment assets.

FIX:

- Some docs and `.env.example` still describe removed or renamed dashboard paths.
- The codebase contains older provider abstractions beyond the approved visible provider set. Some are internal/fallback, some are stale.
- There are two storage root conventions: `AMARKTAI_STORAGE_ROOT` in `local-json-store.ts` and `STORAGE_ROOT` in `storage-driver.ts`.

### Top-level folder structure

| Path | Purpose | Status |
| --- | --- | --- |
| `.github` | GitHub automation/workflows | KEEP |
| `deploy` | systemd/Nginx deploy config | KEEP/FIX, contains old GitHub repo references |
| `docs` | product, forensic, deployment docs | FIX, many old audit docs remain |
| `prisma` | DB schema and seed | KEEP |
| `public` | static assets | KEEP |
| `scripts` | deploy/proof/worker/maintenance scripts | KEEP/FIX |
| `services/realtime` | Realtime voice/websocket service | UNKNOWN/NEEDS LIVE TEST |
| `src/app` | Next pages and API routes | KEEP/FIX |
| `src/lib` | backend/service modules | KEEP/FIX |
| `storage` | local repo storage in checkout | UNKNOWN/DELETE from product path if not production-mounted |

### Public website pages

Found `src/app/**/page.tsx` public/admin pages:

| Route | File | Status |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | KEEP |
| `/about` | `src/app/about/page.tsx` | KEEP |
| `/about-amarktai-network` | `src/app/about-amarktai-network/page.tsx` | DUPLICATE/FIX, overlaps About |
| `/apps` | `src/app/apps/page.tsx` | KEEP/FIX |
| `/contact` | `src/app/contact/page.tsx` | KEEP |
| `/docs` | `src/app/docs/page.tsx` | KEEP/FIX |
| `/privacy` | `src/app/privacy/page.tsx` | KEEP |
| `/terms` | `src/app/terms/page.tsx` | KEEP |
| `/voice-access` | `src/app/voice-access/page.tsx` | UNKNOWN/NEEDS LIVE TEST |
| `/admin/login` | `src/app/admin/login/page.tsx` | KEEP |

### Dashboard pages

Actual dashboard page files:

| Route | File | Status |
| --- | --- | --- |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | KEEP/FIX, Studio exists but media tabs are not fully wired |
| `/admin/dashboard/workbench` | `src/app/admin/dashboard/workbench/page.tsx` | KEEP/FIX |
| `/admin/dashboard/apps-agents` | `src/app/admin/dashboard/apps-agents/page.tsx` | FIX, mostly read-only summary |
| `/admin/dashboard/memory-learning` | `src/app/admin/dashboard/memory-learning/page.tsx` | FIX, basic storage-backed display |
| `/admin/dashboard/operations` | `src/app/admin/dashboard/operations/page.tsx` | KEEP/FIX |
| `/admin/dashboard/settings` | `src/app/admin/dashboard/settings/page.tsx` | FIX, key forms only; missing many settings editors |

Deleted top-level dashboard routes are absent in `src/app/admin/dashboard`: Overview, AI Models, Assistant, Playground, Creative Studio, Costs, Actions, System, Apps, Agents.

### API inventory

There are **211** `route.ts` API files under `src/app/api`. Route families:

| Family | Count/status | Classification |
| --- | --- | --- |
| `/api/admin/*` | Large admin backend surface | KEEP/FIX, protected by `getSession` on most routes; a few admin routes lack obvious session checks |
| `/api/admin/repo-workbench/*` | Workbench Git/GitHub/backend workflow | KEEP, needs live key proof |
| `/api/admin/settings/*` | Key save/test/settings | KEEP/FIX |
| `/api/admin/research/*` | Firecrawl/manual research and Workbench handoff | KEEP/FIX |
| `/api/brain/*` | Shared AI/media/agent gateway | KEEP/FIX, some routes are public/no obvious session |
| `/api/voice/*` | Thin wrappers for brain STT/TTS | KEEP |
| `/api/integrations/*` | App heartbeat/events/metrics/VPS resources | KEEP/FIX |
| `/api/system/*` | System events/deep health | KEEP |
| `/api/health*` | Public health | KEEP |
| `/api/contact`, `/api/waitlist` | Public forms | KEEP |
| `/api/tools`, `/api/workflows`, `/api/webhooks`, `/api/prompts`, `/api/rag`, `/api/batch`, `/api/fine-tune` | older/platform APIs | FIX/UNKNOWN |

### Backend/service/lib modules

There are **123** top-level files under `src/lib`. Important areas:

| Area | Key modules | Status |
| --- | --- | --- |
| Provider/catalog/routing | `approved-ai-catalog.ts`, `ai-model-catalog.ts`, `universal-model-catalog.ts`, `live-ai-routing.ts`, `genx-client.ts`, `genx-model-resolver.ts` | KEEP/FIX |
| Workbench | `repo-workbench.ts`, `repo-workbench-status.ts`, `workspace-security.ts`, `github-integration.ts` | KEEP |
| Apps/agents | `app-ai-package.ts`, `app-ai-package-store.ts`, `app-profiles.ts`, `agent-registry.ts`, `agent-runtime.ts`, `app-agent.ts` | KEEP/FIX |
| Memory/learning/emotion | `memory.ts`, `local-json-store.ts`, `emotion-engine.ts`, `emotion-persistence.ts`, `daily-learning.ts`, `cross-app-learning.ts`, `retrieval-engine.ts` | KEEP/FIX |
| Media | `music-studio.ts`, `media-artifacts.ts`, `artifact-store.ts`, `multimodal-router.ts`, `multimodal-pipeline.ts`, `qwen-wanx-polling.ts` | KEEP/FIX |
| Storage/ops | `storage-driver.ts`, `system-runtime-status.ts`, `cost-tracking.ts`, `provider-result-log.ts`, `provider-intelligence.ts` | KEEP/FIX |
| Tooling | `tool-registry.ts`, `tool-runtime.ts`, `audit-trail.ts`, `workflow-engine.ts`, `workspace-executor.ts` | KEEP/FIX |
| Old/broad provider clients | `litellm-client.ts`, `langgraph-client.ts`, `graphiti-client.ts`, `mem0-client.ts`, `hf-fallback.ts` | UNKNOWN/FIX; not visible approved providers but may be internal tools |

### Tests

There are **38** Vitest test files. Current latest full suite before this report was 1180 passing tests on PR59; this audit branch must be reverified after adding the report.

KEEP:

- Workbench safety tests.
- GenX client tests.
- Adult text/capability tests.
- Storage persistence tests.
- PR59 dashboard architecture tests.
- Provider governance and runtime capability tests.

FIX:

- Many tests are static/file assertions rather than live behavior.
- Most tests mock providers, Prisma, Redis, Qdrant, and fetch. They prove code paths and policy, not production integrations.
- Missing browser E2E tests for authenticated dashboard flows.

### Scripts

Found **12** script files:

| Script | Status |
| --- | --- |
| `deploy.sh`, `deploy_vps.sh`, `deploy_and_proof_safe.sh` | KEEP/FIX, live VPS proof required |
| `final_go_live_audit.sh`, `final_live_certification.sh`, `final_product_proof.sh`, `final_proof.sh`, `verify_golive.sh` | KEEP/FIX, some docs/scripts still reference older routes |
| `diagnose_next_static_assets.sh` | KEEP |
| `health-sync.ts`, `memory-summarise.ts`, `worker.mjs` | KEEP/UNKNOWN, needs runtime proof |

### Storage/data paths

| Path/env | Used by | Status |
| --- | --- | --- |
| `AMARKTAI_STORAGE_ROOT` -> `/var/www/amarktai/storage` fallback | `local-json-store.ts`, Memory & Learning, Operations local JSON | KEEP/FIX |
| `STORAGE_DRIVER`, `STORAGE_ROOT` -> `/var/www/amarktai/storage` | `storage-driver.ts`, artifact storage | KEEP/FIX |
| `APP_AI_PACKAGE_STORE_ROOT` -> `/var/www/amarktai/repo/storage/app-ai-packages` | app package JSON store | FIX, not same root as main storage |
| `REPO_WORKSPACE_ROOT` -> `/var/amarktai/workspaces` fallback | Workbench repo clones, patches, logs | KEEP/FIX |
| Prisma/Postgres | products, users, providers, Workbench models, agents, memory, app profiles | KEEP |

### Environment variables referenced

Required or important runtime vars found in code/docs:

`DATABASE_URL`, `SESSION_SECRET`, `SECRET_COOKIE_PASSWORD`, `NEXT_PUBLIC_APP_URL`, `APP_URL`, `BASE_URL`, `PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VAULT_ENCRYPTION_KEY`, `GENX_API_URL`, `GENX_API_KEY`, `GENX_ADULT_CONTENT_SUPPORTED`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `MINIMAX_API_KEY`, `MIMO_API_KEY`, `TOGETHER_API_KEY`, `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN`, `ADULT_HF_ENDPOINT_URL`, `FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL`, `WEBDOCK_API_KEY`, `GITHUB_TOKEN`, `REPO_WORKSPACE_ROOT`, `REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS`, `REPO_WORKBENCH_ALLOW_DEPLOY`, `REPO_WORKBENCH_ALLOW_MAIN_PUSH`, `REPO_WORKBENCH_ALLOW_MERGE`, `REPO_WORKBENCH_SAFE_TEST_REPO`, `AMARKTAI_STORAGE_ROOT`, `STORAGE_DRIVER`, `STORAGE_ROOT`, `STORAGE_LOCAL_DIR`, `MEDIA_ARTIFACT_ROOT`, `MEDIA_ARTIFACT_PUBLIC_PREFIX`, `APP_AI_PACKAGE_STORE_ROOT`, `PROVIDER_RESULT_LOG_ROOT`, `REDIS_URL`, `QDRANT_URL`, `QDRANT_API_KEY`, `REALTIME_SERVICE_URL`, `SESSION_HMAC_SECRET`, `ALLOWED_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_EMAIL`, `ALERT_EMAIL`, `VPS_SSH_HOST`, `VPS_SSH_USER`, `NGINX_CONFIG_PATH`.

Also referenced by older/internal modules or tests: `LITELLM_API_URL`, `LITELLM_API_KEY`, `LANGGRAPH_API_URL`, `LANGGRAPH_API_KEY`, `GRAPHITI_API_URL`, `GRAPHITI_API_KEY`, `MEM0_API_URL`, `MEM0_API_KEY`, `POSTHOG_API_KEY`, `POSTHOG_HOST`, `REPLICATE_API_TOKEN`, `REPLICATE_API_KEY`, `SUNO_API_KEY`, `XAI_API_KEY`, `GROK_API_KEY`, `MAPBOX_TOKEN`, `GOOGLE_MAPS_KEY`, `GEO_PROVIDER_KEY`, `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN`, `HOMEY_API_URL`, `HOMEY_API_TOKEN`.

## Phase 2 - Dashboard truth

### Actual dashboard nav

`src/lib/dashboard-nav.ts` defines exactly:

1. Studio -> `/admin/dashboard`
2. Workbench -> `/admin/dashboard/workbench`
3. Apps & Agents -> `/admin/dashboard/apps-agents`
4. Memory & Learning -> `/admin/dashboard/memory-learning`
5. Operations -> `/admin/dashboard/operations`
6. Settings -> `/admin/dashboard/settings`

This matches the target architecture.

### Dashboard usefulness and gaps

| Page | Useful | Duplicated | Empty/filler/static | Real controls | Broken/no-op controls | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Studio | Yes for chat shell | No top-level duplicate | Has static tab shell and status claims | Fetches model catalog/context; sends stream; saves memory; links to Workbench/Apps | Media/adult/artifact tabs do not call their real capability routes; Stop abort only local stream | FIX |
| Workbench | Yes | No top-level duplicate | Some local timeline state only | Calls repo list, branches, import, plan, patch, apply, checks, run-check, commit, push, PR, merge, deploy | Branch list only loads on repo change, not initial selection; job state is local UI state | KEEP/FIX |
| Apps & Agents | Partly | Merges old Apps/Agents | App package shape is mostly static; fallback Superbrain card is static | Reads package JSON store and canonical agent registry | No add/edit form, no assignment UI, no app health controls | FIX |
| Memory & Learning | Partly | No | Lists intended layers statically | Reads local memory, learning logs, writable storage | No retrieval UI, no scheduler control, no emotion detail UI | FIX |
| Operations | Partly | Merges Costs/Actions/System | Some panels are status summaries | Reads costs, research status, system runtime, local artifacts/approvals/jobs | No queue/log/detail actions, no Webdock live resource drilldown | FIX |
| Settings | Partly | No | Adult policy values are display only | Saves approved provider/tool keys to `/api/admin/settings/key` | No defaults editor for assistant/model/routing/deployment/adult policy; no test buttons visible | FIX |

Pages that should be merged: already merged top-level structure. Remaining merge work is inside Studio: actual media/assistant/playground controls should be built into Studio tabs instead of separate pages.

Pages that should be deleted: no extra top-level dashboard pages currently exist. Old API routes for `/api/admin/playground`, `/api/admin/media-studio`, `/api/admin/labs`, etc. remain and should be reviewed before deletion because backend clients/tests may still use them.

## Phase 3 - Backend/API truth

### Route matrix by product area

| Route/family | Method(s) | Purpose | Implemented | Logic type | Storage/database | Auth | Frontend using it | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/admin/login`, `/api/admin/logout`, `/api/admin/quick-access` | POST | Admin auth/session | Yes | Real with fallback admin credentials | Prisma/users/session | Login public, logout/session protected | Login pages/layout | KEEP/FIX |
| `/api/admin/settings/key` | POST | Save approved provider/tool keys | Yes | Real vault write | Prisma `integrationConfig`, encryption helper | Admin session | Settings | KEEP |
| `/api/admin/settings/test-genx`, `/test-github`, `/test-storage`, `/test-webdock`, `/test-adult` | POST | Live integration tests | Yes | Real external/storage checks | Prisma/env/external APIs | Admin session | Not wired as visible Settings buttons in current page | KEEP/FIX |
| `/api/admin/ai-model-catalog` | GET | Model catalog and universal catalog | Yes | Mixed live GenX + static fallback | Provider config/vault | Admin session | Studio, Workbench | KEEP/FIX |
| `/api/admin/genx/status` | GET | GenX endpoint/profile/catalog/adult status | Yes | Real GenX probe/catalog if key exists | GenX external, vault/env | Admin session | Not directly in current dashboard page | KEEP |
| `/api/admin/ai-routing`, `/api/admin/ai-routing/smart`, `/api/admin/routing`, `/api/admin/routing-profiles` | GET/POST | Routing decisions/profiles | Yes | Mixed samples/static + real routing functions | local/provider modules | Admin session | Header and some older surfaces | FIX/DUPLICATE |
| `/api/admin/amarktai-assistant/stream` | POST | Studio streaming assistant route | Yes | Real GenX streaming only; non-GenX returns route echo | GenX, cost log | Admin session | Studio | FIX |
| `/api/admin/amarktai-assistant/chat`, `/context`, `/memory`, `/tts` | GET/POST | Assistant context/chat/memory/TTS | Yes | Context/memory real; TTS returns Needs key/test | Local/prisma/provider status | Admin session | Studio context; TTS not visibly called | FIX |
| `/api/brain/stream`, `/api/brain/request`, `/api/admin/conversation/stream` | POST | Shared chat/brain streaming | Yes | Mixed real routing/fallback | Prisma/job/provider | Some protected, some public | Not current Studio main path except admin assistant stream | KEEP/FIX |
| `/api/brain/image`, `/image-edit`, `/suggestive-image` | POST | Image generation/edit | Yes | Real provider chains with structured unavailable errors | Provider keys/external APIs | Some admin session, some public | Not wired from Studio Image tab | KEEP/FIX |
| `/api/brain/video`, `/video-generate`, `/video-generate/[jobId]`, `/suggestive-video*` | POST | Video planning/generation jobs | Yes | Mixed real provider jobs and planning fallback | Prisma/job/provider | Public/no obvious session on some | Not wired from Studio Video tab | KEEP/FIX |
| `/api/admin/music-studio`, `/music-studio/jobs/[jobId]` | GET/POST | Music/audio generation and job listing | Yes | Real module with provider fallback/status | Music module/provider/artifacts | Admin session | Not wired from Studio Music tab | KEEP/FIX |
| `/api/brain/tts`, `/api/brain/stt`, `/api/voice/tts`, `/api/voice/stt` | POST | TTS/STT | Yes | Real provider chains; voice routes are wrappers | Provider keys/external APIs | Public/no obvious session on brain voice routes | Not fully wired from Studio | KEEP/FIX |
| `/api/brain/adult-text`, `/adult-image` | POST | Adult text/image | Yes | Real app safety gates and provider attempts | Prisma safety, provider keys | Admin session in adult routes | Studio Adult tab only maps to assistant stream, not these routes | KEEP/FIX |
| `/api/admin/artifacts`, `/artifacts/media`, `/api/artifacts/file/[...key]` | GET/POST/DELETE | Artifact metadata and file serving | Yes | Real local/DB storage | local JSON, Prisma, storage driver | Admin for list/write; file route public | Operations; media routes | KEEP/FIX |
| `/api/admin/memory`, `/memory/manage`, `/api/admin/amarktai-assistant/memory` | GET/POST/DELETE | Memory status/save/manage | Yes | DB first with local VPS fallback | Prisma/local JSON | Admin session | Studio save, Memory page | KEEP/FIX |
| `/api/admin/learning`, `/api/emotions`, `/api/admin/emotions` | GET/POST | Learning/emotion status | Yes | Real modules, some public | Prisma/local/queue | Mixed | Memory page not deeply wired | KEEP/FIX |
| `/api/admin/apps`, `/apps/intelligence`, `/api/apps` | GET/POST | App registry/intelligence/public apps | Yes | Prisma plus local fallback/default placeholder records | Prisma/local JSON | Admin/public split | Apps page not edit-wired | FIX |
| `/api/admin/app-ai-package`, `/recommend` | GET/POST/DELETE | App model package CRUD/recommend | Yes | Real JSON persistence and routing confirmation | JSON store under `APP_AI_PACKAGE_STORE_ROOT` | Admin session | Apps & Agents reads packages only | KEEP/FIX |
| `/api/admin/app-agents`, `/app-agents/[slug]*`, `/api/brain/agent-request`, `/api/brain/agent/dispatch` | GET/POST | Agent registry/app agents/dispatch | Yes | Mixed real Prisma and static/fallback dispatch | Prisma/queue/provider | Mixed admin/public | Apps & Agents registry only | FIX |
| `/api/admin/repo-workbench/*` | GET/POST | Repo import, audit, plan, patch, apply, checks, commit, push, PR, merge, deploy | Yes | Real Git/GitHub/Prisma/artifact logic | Prisma, filesystem, GitHub API, workspace root | Admin session | Workbench | KEEP/FIX |
| `/api/admin/research/status`, `/url`, `/jobs`, `/opportunity`, `/assist`, `/send-to-repo-workbench` | GET/POST | Research/scraping and task handoff | Yes | Firecrawl real, manual fallback, assist workflow static list | local JSON/artifacts/GitHub | Admin session | Studio Research only goes through assistant stream; Operations status | FIX |
| `/api/admin/system/status`, `/live-readiness`, `/capabilities`, `/api/admin/vps` | GET | Operations/VPS/system health | Yes | Real local command/storage/provider checks; some readiness mixed | Prisma/fs/env/external | Admin session | Header/Operations | KEEP/FIX |
| `/api/admin/tool-registry`, `/api/tools` | GET/POST | Internal tool registry and generic tools | Yes | Tool registry real; MCP status says not implemented | runtime modules | Admin for registry; tools public | Not deeply wired | FIX |
| `/api/integrations/*` | POST | App heartbeat/events/metrics/VPS resources | Yes | Real Prisma writes | Prisma | Session/token patterns vary | Connected apps | KEEP/FIX |
| `/api/health`, `/api/health/ping`, `/api/system/*`, `/api/realtime/*` | GET/POST | Health, deep health, realtime session | Yes | Real DB/service checks | Prisma/external realtime | Mixed | Live checks | KEEP/FIX |
| `/api/contact`, `/api/waitlist` | POST | Public lead capture | Yes | Prisma + SMTP optional | Prisma/SMTP | Public | Public pages | KEEP |
| `/api/prompts`, `/api/rag`, `/api/workflows`, `/api/webhooks`, `/api/batch`, `/api/fine-tune`, `/api/guardrails` | GET/POST | Older platform surfaces | Yes | Mixed module/fallback | varies | Public/no obvious session | Not current dashboard | UNKNOWN/FIX |

### Backend findings

Working:

- Admin dashboard and admin API protection are real through `getSession`; middleware redirects `/admin/*` pages without a session.
- Settings key save only allows approved providers/tools and writes to Prisma `integrationConfig` with encryption helper.
- Workbench backend implements real Git, GitHub API, diff, patch, checks, commit, push, PR, merge, deploy guards.
- Provider/model routing has a universal catalog and live GenX catalog fetch path.
- Storage and memory have real local VPS file fallback.

Broken or risky:

- Several non-admin `/api/brain/*` routes are public/no obvious session. That may be intended for connected apps, but there is no clear app token gate in the route files inspected.
- `/api/admin/amarktai-assistant/stream` only truly streams GenX. For non-GenX selected routes it echoes the prompt with route text.
- `tool-registry.ts` points Firecrawl scrape to `/api/admin/app-intelligence/crawl`, but this route was not found in the current API inventory.
- `local-json-store.ts` comment says there is a `process.cwd()/storage` fallback, but code returns only `AMARKTAI_STORAGE_ROOT` or `/var/www/amarktai/storage`.
- `settings/test-storage` hardcodes `/var/www/amarktai/storage` for local_vps and does not honor `STORAGE_ROOT`.

## Phase 4 - Model/provider audit

### Source of truth locations

| Item | Location | Truth |
| --- | --- | --- |
| Approved visible providers | `src/lib/approved-ai-catalog.ts` | Exact approved set exists |
| Static model list | `src/lib/ai-model-catalog.ts` | Static, incomplete; includes `auto:*` aliases for GenX static catalog |
| Universal catalog | `src/lib/universal-model-catalog.ts` | Uses live GenX if available, otherwise fallback arrays |
| Live routing | `src/lib/live-ai-routing.ts` | Routes only through approved provider keys |
| GenX live catalog | `src/lib/genx-client.ts`, `listGenXModels()` | Real fetch from discovered catalog endpoint if configured |
| Auto alias resolution | `src/lib/genx-model-resolver.ts` | Resolves `auto:*` to real GenX IDs |

### Provider classification

| Provider | Repo status | Evidence | Classification |
| --- | --- | --- | --- |
| GenX | Primary and live-discoverable | `listGenXModels()`, `getGenXStatusAsync()`, `callGenXMedia()`, `streamGenXChat()` | CONFIGURED/ROUTED/TESTABLE, NEEDS KEY for live |
| Hugging Face | Task based in approved catalog; also adult endpoints | `HUGGING_FACE_TASK_ROUTES`, adult text/image code | ROUTED/TESTABLE, NEEDS KEY/ENDPOINT |
| Qwen/DashScope | Static chat models and media specialist routes | `qwen-turbo`, `qwen-plus`, `qwen-max`, qwen wanx routes | LISTED/ROUTED in some media routes, NEEDS KEY |
| MiniMax/Mimo | Static text/TTS/STT plus specialist TTS route | `MiniMax-M2.7`, `task:voice-tts`, `minimax-tts` route | LISTED/ROUTED for voice, NEEDS KEY |
| Groq | Static chat/coding, STT route | `llama-3.3-70b-versatile`, STT provider path | ROUTED/TESTABLE, NEEDS KEY |
| Together AI | Static chat/image/adult image/text | Together image/video/adult provider paths | ROUTED/TESTABLE, NEEDS KEY |
| OpenAI | Static GPT-4o/chat/image/moderation/TTS/STT | image/TTS/STT/music fallback code | ROUTED/TESTABLE, NEEDS KEY |

Provider issues:

- `provider-config.ts` still supports many non-approved provider aliases internally (`anthropic`, `gemini`, `replicate`, `suno`, `xai`, `openrouter`, `mistral`, `cohere`, etc.). They are not in the visible approved catalog, but some media/adult legacy routes still call xAI/Grok, Replicate, Suno, Gemini. Decide whether these are internal hidden fallback tools or delete/replace them.
- GenX full catalog can populate selectors if the key and endpoint work; without key, selectors use fallback arrays. That is truthful but not live-proof.
- Static catalog still contains `auto:coding-balanced`, `auto:coding-best`, `auto:assistant`; `resolveModelAlias()` prevents these from being sent to GenX in known paths, but audit should add a test for every provider execution path, not just resolver unit tests.

## Phase 5 - Studio audit

| Capability | Frontend exists | Backend route exists | Route real/mock | Provider routing | Persists output | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Chat | Yes, Studio Chat tab | `/api/admin/amarktai-assistant/stream` | Real GenX stream; non-GenX echo | Yes through `routeLiveModel` | Cost estimate; memory only if user clicks Save | KEEP/FIX |
| Streaming chat | Yes | `/api/admin/amarktai-assistant/stream`, `/api/brain/stream`, `/api/admin/conversation/stream` | GenX stream real | Partial | Cost log | FIX |
| Coding | Tab exists | Workbench routes exist | Backend real | Partial | Workbench persists tasks/artifacts | FIX, send-to-Workbench link only |
| Research | Tab exists | `/api/admin/research/*` | Firecrawl/manual real; assist workflow static | Partial | Research artifacts/local jobs | FIX, Studio tab does not call research routes |
| Image | Tab exists | `/api/brain/image` | Real provider chain | Yes in route | Route returns image/job but Studio does not persist | FIX/MISSING UI wiring |
| Video | Tab exists | `/api/brain/video-generate` | Real async providers plus planning fallback | Partial | Prisma job/artifacts in route family | FIX/MISSING UI wiring |
| Music/audio | Tab exists | `/api/admin/music-studio` | Real module | Partial | Music artifacts/jobs | FIX/MISSING UI wiring |
| Voice/TTS | Tab exists | `/api/brain/tts`, `/api/admin/amarktai-assistant/tts` | Brain TTS real; admin assistant TTS returns Needs key/test | Partial | Not from Studio UI | FIX |
| STT | Tab exists | `/api/brain/stt`, `/api/voice/stt` | Real multipart route | Partial | No Studio upload UI | FIX/MISSING UI |
| Avatar/talking video | Tab exists | video/avatar route capability only | Route not clearly dedicated | Partial | Unknown | MISSING/FIX |
| Adult text | Adult tab exists | `/api/brain/adult-text` | Real gated route | Yes | No Studio direct route | FIX |
| Adult image | Adult tab exists only generic | `/api/brain/adult-image` | Real gated route | Yes | No Studio direct route | FIX |
| Adult video | No specific UI | no dedicated adult-video route found; suggestive-video exists | Unknown | Partial | Unknown | MISSING |
| Artifacts | Tab exists | `/api/admin/artifacts`, `/api/admin/artifacts/media` | Real | N/A | Yes | FIX, tab does not list artifacts |

Studio verdict: the shell is good; the product is not yet a real all-media Studio. It is currently a streaming assistant UI with tabs and selectors.

## Phase 6 - Workbench audit

Current UI flow:

`Repo` -> `Branch` -> `AI/model` -> `Cost mode` -> `Prompt` -> `Start work` -> `Approve changes` -> `Create PR`, with diff/checks/commit/push/merge/deploy in Advanced / Progress Timeline.

Desired flow match: mostly matches, except the desired "branch/auto branch" concept is partly implemented. Auto branch imports the default branch first and commit creates a `superbrain/<timestamp>` branch later.

| Requirement | Truth | Status |
| --- | --- | --- |
| Jobs persist after navigation | Backend tasks/artifacts/logs persist in Prisma/files; UI state does not automatically rehydrate latest job | FIX |
| Selected repo persists | Workspace persists in Prisma after import; UI selected repo is local state | FIX |
| Plan output persists | Plan task/artifact persists in backend; UI local log only | KEEP/FIX |
| Patch/diff persists | `repoPatch` and artifact persist; UI local log only | KEEP/FIX |
| Logs persist | `resolveWorkspacePath('logs', ...)` and job logs routes exist | KEEP |
| GitHub token read from Settings/env | `getProviderKey('github')` and legacy GitHub config path exist | KEEP |
| Repo import works | Real `git clone/fetch/pull`, dirty detection, token-safe env | KEEP/NEEDS LIVE TEST |
| Branch listing works | GitHub branch route exists; UI loads on repo change | KEEP/FIX |
| Plan works with GenX | Backend calls AI pipeline and stores result; needs GenX key proof | NEEDS LIVE TEST |
| Patch generation real | `createPatchProposal()` asks AI for unified diff, stores patch/artifact | KEEP/NEEDS LIVE TEST |
| Apply patch safe | `git apply --check`, path traversal checks for diff paths | KEEP |
| Checks only existing scripts | `getAvailablePackageChecks()` reads package scripts; `runPackageCheck()` skips missing scripts | KEEP |
| Commit/push/PR | Real Git and GitHub API | KEEP/NEEDS LIVE TOKEN |
| Merge/deploy guarded | `REPO_WORKBENCH_ALLOW_MERGE`, `REPO_WORKBENCH_ALLOW_DEPLOY`, confirmation string | KEEP |

Important evidence:

- `GIT_TERMINAL_PROMPT=0` is set.
- `GIT_ASKPASS`, `GIT_ASKPASS_TOKEN`, and `GIT_USERNAME=x-access-token` are used.
- Logs are redacted by `redactSecretsFromLogs()`.
- Dirty worktree import path throws if existing repo has uncommitted files.
- Main branch push is blocked unless `REPO_WORKBENCH_ALLOW_MAIN_PUSH=true`.

Workbench verdict: backend is valuable and should be kept. Frontend needs job rehydration, clearer initial branch loading, and live smoke proof.

## Phase 7 - Apps & Agents audit

Apps:

| Capability | Truth | Status |
| --- | --- | --- |
| Add app from UI | No visible create/edit form in `apps-agents/page.tsx` | MISSING |
| App records persist | App AI package route persists JSON; app/profile routes persist Prisma | KEEP/FIX |
| Required fields shown | UI lists fields and displays fallback defaults | FIX, display only |
| Recommendations | `/api/admin/app-ai-package/recommend` exists | KEEP |
| Agent assignment | `assignAgentToAppPackage()` exists; UI does not assign | FIX |
| App health | `/api/admin/app-health` and integration metrics exist | KEEP/FIX |

Required agents:

All required agents exist in `src/lib/agent-registry.ts`:

- Coding Agent
- Code Review Agent
- Repo Audit Agent
- Deployment Agent
- Research Agent
- Scraping Agent
- Creative Agent
- Image Agent
- Video Agent
- Music/Audio Agent
- Voice Agent
- Avatar/Talking Video Agent
- Marketing Agent
- App Operator Agent
- System/VPS Agent
- Cost/Budget Agent
- Safety/Policy Agent
- Adult Policy Agent
- Memory/Learning Agent
- QA/Test Agent
- Product/UX Agent

Agent truth: agents have real purpose/capabilities/routing strategy/status calculation, but most are not callable as complete autonomous execution workflows from the Apps & Agents page.

## Phase 8 - Memory, learning, emotion audit

| Area | Exists | Real/fake | Storage | Status |
| --- | --- | --- | --- | --- |
| User/app/agent memory | Yes | Real DB first + local fallback | Prisma `MemoryEntry`, local JSON | KEEP/FIX |
| Conversation memory | Partial | Studio can save latest assistant content manually | local/DB | FIX |
| Emotional context | Yes | Real sentiment/keyword engine, in-memory/Redis/Qdrant paths | module/cache/vector | KEEP/FIX |
| Learning logs | Yes | Daily learning reads `BrainEvent`, writes `AppAgentLearningLog` | Prisma/local display | KEEP/FIX |
| Daily scheduler | Module/script exists | No proven live scheduler from dashboard | Prisma/script | FIX/NEEDS LIVE TEST |
| Cross-agent learning | Modules exist | Not visibly wired in UI | Prisma/modules | FIX |
| Provider performance memory | Exists | Provider result JSONL/log based | local JSONL | KEEP/FIX |
| Artifact-linked memory | Partial | Artifacts exist; linking shown as concept | artifact store/local | FIX |

Verdict: memory/learning backend is reusable. UI is not yet an operator-grade memory workbench.

## Phase 9 - Storage, VPS, Operations audit

Storage truth:

- `local-json-store.ts` uses `AMARKTAI_STORAGE_ROOT` or `/var/www/amarktai/storage`.
- `storage-driver.ts` uses `STORAGE_DRIVER=local_vps` and `STORAGE_ROOT` or `/var/www/amarktai/storage`.
- `app-ai-package-store.ts` defaults to `/var/www/amarktai/repo/storage/app-ai-packages`, a separate root.
- Workbench repo storage uses `REPO_WORKSPACE_ROOT` or `/var/amarktai/workspaces`.

Operations page functionality:

- Reads `getCostSummary()`.
- Reads `getResearchToolStatus()`.
- Reads `getSystemRuntimeStatus()`.
- Reads local artifacts, approvals, jobs.
- Shows Webdock configured/needs key based on key presence, not real VPS metrics.

Webdock:

- Key save/test route exists.
- `system-runtime-status.ts` only reports configured/needs key; no full Webdock VPS resource list was found in the current Operations page.

Health:

- Live `https://amarktai.com/api/health` returned 200 and DB `ok`.
- Protected admin status returns 401 without session, as expected.

Go-live storage blockers:

- Unify storage root config names.
- Prove `/var/www/amarktai/storage` exists and is writable on VPS.
- Prove Workbench workspace root is persistent and not inside ephemeral deploy directory.
- Prove artifact file serving works through Nginx/Next.

## Phase 10 - Adult policy audit

Where defined:

- `src/lib/universal-model-catalog.ts`: app-level policy values: `off`, `suggestive`, `adult_text`, `adult_image`, `adult_video`, `adult_voice`, `full_adult_app_mode`, `specialist`; legacy `full_adult` normalized.
- `src/lib/live-ai-routing.ts`: adult capability routing gated by app policy.
- `src/lib/content-filter.ts`: older safety config with `safeMode`, `adultMode`, `suggestiveMode`, global adult mode, app DB config.
- `/api/admin/app-safety`, `/api/admin/global-adult-mode`, `/api/admin/settings/test-adult`, `/api/brain/adult-text`, `/api/brain/adult-image`.

Truth:

- Adult tab is visible in Studio.
- Adult capability is app-policy gated in new routing.
- Adult text/image routes do not require a separate adult key; they reuse provider vault keys.
- A global adult mode route still exists. It does not force safeMode=true apps into adult mode, but it is still a global toggle concept that conflicts with the cleaner app-policy-only target.
- `GENX_ADULT_CONTENT_SUPPORTED` defaults false in GenX client. This is a GenX-specific adult capability flag, not a separate adult key.
- Adult text/image legal blockers exist for minors/CSAM, non-consensual content, self-harm, hate/terrorism, violence/gore, and degrading/dehumanizing content. Real-person sexual deepfake language exists in global-adult-mode/runtime truth blocked categories; dedicated route-level regex proof should be expanded.

Adult gaps:

- Studio Adult tab does not call adult text/image/video/voice routes directly.
- Adult video route is not clearly implemented as a dedicated route.
- Policy model is split between old `safeMode/adultMode` and new app-level policy values.

## Phase 11 - MCP/tooling audit

| Tooling item | Truth | Status |
| --- | --- | --- |
| Tool registry | `src/lib/tool-registry.ts`, `/api/admin/tool-registry` | KEEP/FIX |
| Tool permissions | Registry marks read/write/destructive and approvalRequired | KEEP |
| Tool call logging | `audit-trail.ts` is in-memory only | FIX |
| Approval integration | Approvals routes/storage exist; registry has approval flags | FIX |
| GitHub tool | Repo list/branch/import/PR routes exist | KEEP |
| File read/write tool | Workbench file/tree/write functions exist | KEEP/FIX |
| Terminal command tool | Workbench allowed command list exists | KEEP |
| VPS/Webdock tools | Status/test routes exist; limited monitoring | FIX |
| Firecrawl/Crawl4AI/Playwright | Research status exists; Crawl4AI/Playwright availability checks only | FIX |
| Deployment tools | Workbench deploy route and script exist, env guarded | KEEP/NEEDS LIVE TEST |
| Provider test tools | Settings test routes exist | KEEP |
| MCP servers | `tool-registry.ts` reports `implemented:false`, `status:'post_launch'` | MISSING |

## Phase 12 - Test quality audit

Current tests:

- 38 test files under `src/lib/__tests__`.
- Last observed full suite on this codebase before writing this report: 1180 passed.

What tests cover well:

- Static dashboard architecture after PR59.
- Workbench safety helpers.
- GenX config/catalog/resolver behavior.
- Adult route guardrails and provider fallback shape.
- Storage persistence helpers.
- Routing/provider governance.
- Many pure backend modules.

What tests do not prove:

- Authenticated browser dashboard workflows.
- Live GitHub token import/branch/PR behavior.
- Live GenX catalog and streaming response.
- Live image/video/music/TTS/STT provider calls.
- Live VPS/Webdock resource status.
- Live Nginx static asset delivery after deploy.
- End-to-end Studio media output persistence.
- Apps & Agents app creation/edit/assignment UI.

Tests that are mostly static:

- `pr59-superbrain-dashboard-final-architecture.test.ts`
- `backend-truth.test.ts`
- `backend-wiring-core-network.test.ts`
- `settings-provider-source-of-truth.test.ts`
- Many capability tests that assert route files/text/policy rather than live execution.

Tests proving real module behavior:

- `genx-client.test.ts`
- `repo-workbench-safety.test.ts`
- `adult-text-route.test.ts` with mocked providers
- `storage-persistence.test.ts`
- `video-job-artifact-link.test.ts` with mocked provider/store paths
- `app-profiles.test.ts`

Missing critical tests:

- Playwright dashboard smoke after login.
- Studio Image/Video/Music/TTS/STT route calls.
- Workbench resume/rehydrate after navigation.
- App package editor create/update UI.
- App health and service monitor E2E.
- Protected connected-app API token tests for public `/api/brain/*` routes.

## What is working

- Main branch builds and live public health on `amarktai.com` is up.
- Admin dashboard routes are protected.
- Six-section dashboard nav exists.
- Workbench backend safety foundation is strong.
- Provider catalog/routing layer exists with approved providers.
- GenX live catalog fetch path exists.
- Settings key vault route exists and restricts visible providers/tools.
- Memory/local storage fallback works in code.
- Adult text/image routes are real, policy-gated, and reuse existing provider keys.
- Tests are broad and currently valuable for regressions.

## What is broken or incomplete

- `amarktai.network` DNS does not resolve from audit environment.
- Studio media tabs do not call media routes.
- Studio non-GenX streaming path echoes a route selection rather than calling provider APIs.
- Apps & Agents UI cannot add/edit apps or assign agents.
- Settings lacks visible test/default/routing/deployment editors.
- Operations is a status summary, not a full operations console.
- Storage configuration is split across multiple env names/roots.
- Public brain routes need an explicit security decision and likely app-token enforcement.
- MCP is not implemented.

## What is fake/static

- Apps & Agents fallback Superbrain app card is static when no package exists.
- Apps & Agents "app package shape" is static documentation in UI.
- Memory & Learning "memory layers" list is static.
- Studio tab list implies full media Studio, but route calls are chat/assistant stream only.
- `/api/admin/ai-routing` and similar routes include sample routing decisions.
- Some older docs still contain "Ready to wire", "Backend pending", and old phase language.

## What is duplicated

- Routing APIs: `/api/admin/ai-routing`, `/api/admin/routing`, `/api/admin/routing-profiles`, `/api/admin/ai-routing/smart`.
- Provider/status APIs: `/api/admin/providers*`, `/api/admin/provider-*`, `/api/admin/ai-model-catalog`, `/api/admin/genx/status`, `/api/admin/models`.
- Memory APIs: `/api/admin/memory`, `/api/admin/memory/manage`, `/api/admin/amarktai-assistant/memory`.
- Chat/stream APIs: `/api/admin/amarktai-assistant/stream`, `/api/admin/conversation/stream`, `/api/brain/stream`, `/api/brain/request`.
- Storage APIs/config: `local-json-store` vs `storage-driver`.

## What can be deleted safely

Do not delete until one more usage scan and test pass. Candidate delete/fix list:

- Old forensic docs with removed dashboard route references, or archive them outside product docs.
- Documentation files whose filenames contain retired assistant naming.
- Old dashboard API routes that have no current UI consumer after Studio consolidation: `/api/admin/playground/*`, `/api/admin/media-studio/models`, `/api/admin/labs`, `/api/admin/onboarding`, if tests and SDK docs confirm unused.
- Static/default app placeholders in `/api/admin/apps` once real app CRUD is wired.

## What must be kept

- `src/lib/repo-workbench.ts`, `repo-workbench-status.ts`, `workspace-security.ts`.
- `src/lib/genx-client.ts`, `genx-model-resolver.ts`.
- `src/lib/approved-ai-catalog.ts`, `universal-model-catalog.ts`, `live-ai-routing.ts`.
- `src/lib/app-ai-package.ts`, `app-ai-package-store.ts`, `agent-registry.ts`.
- `src/lib/local-json-store.ts`, `storage-driver.ts`, `memory.ts`, `emotion-engine.ts`, `daily-learning.ts`.
- `src/app/api/admin/settings/key`, provider test routes, Workbench routes, research routes, artifact routes, memory routes.
- Prisma schema and deployment scripts.

## What is missing

- Authenticated Playwright live proof.
- Studio media controls wired to image/video/music/TTS/STT/adult routes.
- App creation/editor in Apps & Agents.
- Agent assignment UI and actual agent action runner UI.
- Operations logs/jobs/approvals detail views.
- Unified storage root.
- App-token security for public app/brain APIs.
- Dedicated adult video route or explicit deletion of visible adult video claims.
- Real MCP server/client integration if MCP remains product scope.

## Recommended next PR plan

### PR A - Truth and security hardening

- Unify storage env/root naming.
- Add app-token/session guard decision for public `/api/brain/*` and `/api/tools`.
- Remove stale docs or move them to archive.
- Fix `tool-registry.ts` Firecrawl endpoint mismatch.
- Add tests for storage root consistency and public brain API auth policy.

### PR B - Studio real wiring

- Wire Studio Image, Video, Music/Audio, TTS, STT, Adult Text, Adult Image, and Artifacts tabs to their real routes.
- Persist generated outputs as artifacts.
- Replace non-GenX assistant stream echo with actual provider route calls or disable non-GenX streaming until real.
- Add Playwright tests for each Studio tab with mocked routes.

### PR C - Apps/Agents and Operations productization

- Build Apps & Agents create/edit/package/assignment UI.
- Wire app health/service/domain/VPS path fields to backend persistence.
- Add Operations detail views for jobs, logs, approvals, artifacts, provider health, storage, and Webdock.
- Add Workbench job resume/rehydrate after navigation.

## Risk list

- Live deployed app may not be on the latest main commit; admin-authenticated UI was not verified.
- Provider/model claims are only live when keys and provider access are configured.
- Public AI routes may be callable without intended app authentication.
- Storage split can cause artifacts/memory/app packages to land in different directories.
- The dashboard now has correct architecture but can overstate media readiness.
- Global adult mode and app-level adult policy coexist and can confuse operators.
- In-memory audit trail is not durable.

## Go-live blocker list

1. Verify production is serving `9272b92` or newer.
2. Resolve `amarktai.network` DNS or update env/docs to the real domain.
3. Prove admin login and all six dashboard sections live.
4. Prove GenX key and live catalog.
5. Prove GitHub token repo list/import/branch/PR.
6. Prove Workbench plan -> patch -> apply -> checks -> commit -> push -> PR on a safe test repo.
7. Prove storage write/read/artifact serving on VPS.
8. Prove Studio chat and at least one real media route.
9. Decide and enforce auth for public app/brain APIs.
10. Prove Webdock/VPS monitoring or mark it needs key/test.

## Delete list

- Old top-level dashboard pages are already deleted.
- Candidate after usage scan: stale admin API families for old dashboards, old docs with removed route references, duplicate routing/provider endpoints, static placeholder app defaults.

## Keep list

- Current six dashboard routes.
- Workbench backend.
- Provider/model catalogs and GenX client.
- App package and agent registry modules.
- Storage, memory, emotion, learning modules.
- Research routes and Firecrawl/manual fallback.
- Adult text/image policy-gated routes.
- Deployment and proof scripts after route update.

## Missing route/module list

- Dedicated Studio media orchestration route for each tab or a single Studio action router.
- Dedicated adult video route or explicit removed capability.
- Durable audit log storage.
- MCP server/client layer.
- Apps & Agents assignment/update UI route integration.
- Operations log/job/approval detail UI.
- Public connected-app auth/token middleware.

## Live verification commands

Run on VPS without printing secrets:

```bash
cd /var/www/amarktai/Amarktai-Network-2 || cd /var/www/amarktai
git status --short
git rev-parse HEAD
git log --oneline -5
npm ci
npm run build
npm run lint
npm test
systemctl status amarktai --no-pager || true
systemctl status amarktai-web --no-pager || true
systemctl status amarktai-realtime --no-pager || true
curl -I https://amarktai.com/
curl -I https://amarktai.com/admin/login
curl -I https://amarktai.com/admin/dashboard
curl -sS https://amarktai.com/api/health/ping
curl -sS https://amarktai.com/api/health
curl -i https://amarktai.com/api/admin/system/status
curl -i https://amarktai.com/api/admin/ai-model-catalog
BASE=https://amarktai.com
ASSET=$(curl -sS "$BASE/" | grep -o '/_next/static/[^"]*\.js' | head -1)
test -n "$ASSET" && curl -I "$BASE$ASSET"
STORAGE_ROOT=${AMARKTAI_STORAGE_ROOT:-/var/www/amarktai/storage}
mkdir -p "$STORAGE_ROOT"/{artifacts,uploads,repos,workspaces,logs}
PROBE="$STORAGE_ROOT/.audit-probe-$(date +%s)"
printf ok > "$PROBE" && cat "$PROBE" && rm "$PROBE"
test -n "$GENX_API_KEY" && echo "GENX_API_KEY configured" || echo "GENX_API_KEY missing"
test -n "$GITHUB_TOKEN" && echo "GITHUB_TOKEN configured" || echo "GITHUB_TOKEN missing"
test -n "$WEBDOCK_API_KEY" && echo "WEBDOCK_API_KEY configured" || echo "WEBDOCK_API_KEY missing"
test -n "$FIRECRAWL_API_KEY" && echo "FIRECRAWL_API_KEY configured" || echo "FIRECRAWL_API_KEY missing"
curl -i -X POST "$BASE/api/admin/repo-workbench/status"
curl -i "$BASE/api/admin/research/status"
```

Authenticated browser/API smoke tests:

```bash
# Use a browser or an HTTP client that stores cookies. Do not echo credentials.
curl -c /tmp/amarktai.cookies -sS -X POST https://amarktai.com/api/admin/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"'"$ADMIN_EMAIL"'","password":"'"$ADMIN_PASSWORD"'"}'

curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/system/status
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/ai-model-catalog
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/genx/status
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/repo-workbench/github/status
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/repo-workbench/github/repos
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/research/status
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/tool-registry
curl -b /tmp/amarktai.cookies -sS https://amarktai.com/api/admin/costs
```

Workbench smoke test, use a safe disposable repo:

```bash
curl -b /tmp/amarktai.cookies -sS -X POST https://amarktai.com/api/admin/repo-workbench/import \
  -H 'Content-Type: application/json' \
  --data '{"repoFullName":"OWNER/SAFE_TEST_REPO","branch":"main"}'

# Capture workspace.id from the JSON response, then:
WORKSPACE_ID=replace_with_workspace_id
curl -b /tmp/amarktai.cookies -sS -X POST "https://amarktai.com/api/admin/repo-workbench/$WORKSPACE_ID/plan" \
  -H 'Content-Type: application/json' \
  --data '{"request":"Add a harmless README audit timestamp.","scope":"auto","agentMode":"fullstack_builder"}'
curl -b /tmp/amarktai.cookies -sS -X POST "https://amarktai.com/api/admin/repo-workbench/$WORKSPACE_ID/patch" \
  -H 'Content-Type: application/json' \
  --data '{"request":"Add a harmless README audit timestamp.","files":["README.md"],"agentMode":"fullstack_builder"}'
curl -b /tmp/amarktai.cookies -sS "https://amarktai.com/api/admin/repo-workbench/$WORKSPACE_ID/checks"
```

Studio safe smoke tests:

```bash
curl -b /tmp/amarktai.cookies -N -X POST https://amarktai.com/api/admin/amarktai-assistant/stream \
  -H 'Content-Type: application/json' \
  --data '{"message":"Say one sentence about current system status.","capability":"chat","costMode":"cheap","metadata":{"appSlug":"superbrain","dashboardContext":true}}'

curl -b /tmp/amarktai.cookies -sS -X POST https://amarktai.com/api/brain/image \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"A clean product UI mockup for an AI operator console","providerOverride":"genx"}'
```

## Final recommendation

Choose **B. dashboard rebuild using existing backend**.

Do not restart. Do not create a separate frontend-v2 yet. The existing backend has enough real structure to justify reuse, but the dashboard needs a wiring pass that turns the six-section architecture from shell/status UI into actual operator workflows.
