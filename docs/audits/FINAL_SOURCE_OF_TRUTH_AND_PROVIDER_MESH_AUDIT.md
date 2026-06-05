# Final Source-of-Truth and Provider Mesh Audit

Date: 2026-06-05
Branch: `final-source-truth-provider-mesh`

## Executive finding

The repository contains many real provider, media, repository, artifact, and system routes, but the product contract is fragmented. Settings cannot run most tests from the UI, provider health is stored inconsistently, Command records routing plans without dispatching work, public/dashboard navigation is duplicated, and several normal-user pages expose implementation language. The correction is consolidation rather than another parallel feature layer.

## Public routes

| File | Problem | Action | Intended result |
| --- | --- | --- | --- |
| `src/components/public/PublicShell.tsx` | Public navigation is defined locally. | Move | Consume `src/lib/public-nav.ts`. |
| `src/app/page.tsx` | Homepage is predominantly dark cards and reads partly like a readiness report. | Fix | Keep the animated premium hero, then use alternating light, cyan, and dark product sections with plain-English copy. |
| `src/app/platform/page.tsx` | Omits provider mesh, agents, memory, connected apps, and hidden system monitoring. | Fix | Explain the complete operating model without backend jargon. |
| `src/app/network-apps/page.tsx` | Reads app data from the broad product contract and translates blocked states in the view. | Move | Consume one public-safe network app registry with only Ready, In build, and Planned. |
| `src/app/contact/page.tsx` | Uses “private infrastructure” positioning and embeds that wording in submissions. | Fix | Present a clean product/contact experience using Amarktai Network language only. |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | Valid footer routes. | Keep | Keep under the shared public shell. |

## Dashboard routes and navigation

| File | Problem | Action | Intended result |
| --- | --- | --- | --- |
| `src/lib/dashboard-nav.ts` | Includes Agents in the primary navigation. | Fix | Seven primary items: Overview, Command, Network Apps, Outputs, Memory, Settings, System. |
| `src/app/admin/dashboard/layout.tsx` | Uses dashboard navigation but also loads status for shell labels. | Fix | Keep shell status plain and non-technical. |
| `src/app/admin/dashboard/agents/page.tsx` | Competes with Command as a primary product surface. | Hide | Route may remain for compatibility, but remove it from primary nav. |
| `src/app/admin/dashboard/apps-agents/page.tsx` | Duplicate/legacy product surface. | Hide | Remove from primary navigation and normal flow. |
| `src/app/admin/dashboard/operations/page.tsx` | Duplicate system/operations surface with diagnostics. | Hide | Keep technical status under System only. |
| `src/app/admin/dashboard/studio/page.tsx` | Large standalone capability surface. | Hide | Keep as an internal capability reachable from Command/Outputs, not primary nav. |
| `src/app/admin/dashboard/workbench/page.tsx` | Large standalone capability surface. | Hide | Keep as an attached repository workspace reached from Command. |
| `src/app/admin/dashboard/page.tsx` | Mostly aligned, but readiness comes from the legacy runtime truth and app registry. | Fix | Show command CTA, active jobs, recent outputs, connected apps, and only actionable warnings. |
| `src/app/admin/dashboard/command/page.tsx` | Correct primary entry, but underlying API only creates a plan. | Wire | Run supported non-destructive capabilities immediately and return real results/errors. |
| `src/app/admin/dashboard/outputs/page.tsx` | Reads only local JSON artifacts while media routes also use Prisma artifacts. | Fix | Read the canonical artifact API/store with a safe local fallback. |
| `src/app/admin/dashboard/memory/page.tsx` | Re-exports a legacy “memory-learning” page. | Fix | Present plain-English remembered context and management actions. |
| `src/app/admin/dashboard/settings/page.tsx` | No Test button, stale state after save, route names/env internals visible, storage path is exposed, and services are hard-coded separately. | Fix | One provider/tool registry, save then test, refresh status, sanitized errors, capability badges, and green only after a persisted live pass. |
| `src/app/admin/dashboard/system/page.tsx` | Advanced JSON panel uses internal scrolling and raw runtime data. | Fix | Keep technical service diagnostics here, but show structured rows and sanitized details. |

## Source-of-truth conflicts

| File | Problem | Action | Intended result |
| --- | --- | --- | --- |
| `src/lib/approved-ai-catalog.ts` | Merges MiniMax and Xiaomi MiMo, requires direct OpenAI, and omits Replicate/Fal. | Fix | Derive approved Settings providers from the provider mesh. |
| `src/lib/product-contract.ts` | Duplicates provider and network-app registries. | Fix | Re-export canonical network apps/provider definitions where compatibility is required. |
| `src/lib/provider-config.ts` | Supports many legacy providers and aliases; valid as a low-level key resolver but not a product registry. | Keep/Fix | Add Fal and canonical aliases, while provider mesh determines product visibility/capabilities. |
| `src/lib/platform-settings-truth.ts` | Duplicates provider/tool definitions and test routes; includes Firecrawl/Crawl4AI; exposes storage path. | Replace | Build Settings truth from provider mesh and local-tools truth. |
| `src/lib/provider-capability-governance.ts` | Parallel capability truth can disagree with Settings. | Hide/Move | Keep advanced compatibility only; normal Settings and Command use provider mesh. |
| `src/lib/runtime-capability-truth.ts` | Broad legacy truth includes direct OpenAI/MiniMax assumptions. | Fix | Add a canonical `runtime-truth.ts` facade based on provider mesh for new UI/router paths. |
| `src/lib/studio-options.ts` | Correct option content but wrong canonical filename. | Move | Create `studio-option-libraries.ts`; keep a compatibility re-export. |
| Missing `src/lib/public-nav.ts` | Public nav has no source of truth. | Create | One public navigation registry. |
| Missing `src/lib/provider-mesh.ts` | Provider definitions, tests, status, and capabilities are fragmented. | Create | One product-visible provider/tool mesh. |
| Missing `src/lib/network-apps-registry.ts` | Public and dashboard app cards share an oversized contract. | Create | One public-safe connected-app registry. |
| Missing `src/lib/artifact-types.ts` | Artifact types live inside the DB artifact store. | Create | One artifact/output taxonomy. |
| Missing `src/lib/local-tools.ts` | Local tool detection is scattered. | Create | One registry/detector for Redis, Qdrant, crawler stack, ffmpeg, Rhubarb, and storage. |

## Provider Settings and live tests

| Provider/tool | Current state | Action | Intended result |
| --- | --- | --- | --- |
| GenX | Catalog and chat are tested; image/async flow and pricing are not required for pass; inline tests are not persisted. | Fix | Persist every test result and test catalog, capability grouping, pricing when available, chat, image job creation, and async polling/result flow without fabricating success. |
| Hugging Face | Only `whoami-v2` is tested. | Fix | Test identity, model search, and a lightweight task endpoint; persist discovered capabilities. |
| Qwen/DashScope | Real chat test exists. | Fix | Persist result/capabilities through the shared status helper. |
| Xiaomi MiMo | No independent card/route; incorrectly merged with MiniMax. | Create | Independent `MIMO_API_KEY`, OpenAI-compatible live chat test, independent status/capabilities. |
| Groq | Models list only. | Fix | Add a lightweight chat test and persist fast text/code capabilities. |
| Together AI | Models list only. | Fix | Persist result and catalog-derived capabilities. |
| Replicate | Generation code exists; no Settings card/test. | Create | Validate account/models endpoint and persist async image/video/audio capability. |
| Fal | No Settings provider or key resolver. | Create | Validate the Fal platform endpoint/config and expose media/async capability without claiming a generation pass. |
| GitHub | Real identity test exists; inline pass is not persisted. | Fix | Persist identity and repo access result for saved tokens. |
| Redis | Deep test can succeed but status is not persisted. | Fix | PING/PONG required for green; URL validation alone remains configured, not connected. |
| Qdrant | Client dependency exists; no Settings test route. | Create | Run a collections/health request and persist pass/failure. |
| Local crawler | Playwright is listed separately; Scrapy/Trafilatura are not surfaced as one capability. | Create | One local crawler card that checks Playwright, Python, Scrapy, and Trafilatura. |
| ffmpeg | Not represented in Settings. | Create | Execute `ffmpeg -version`; green only when executable. |
| Rhubarb | Not represented in Settings. | Move | Detect in System/local-tools truth; optional capability badge for avatar lip-sync. |
| Storage | Writable check is real but raw paths leak to UI and test route does not persist common status. | Fix | Show “writable/not writable” only; keep path in System advanced details. |
| SMTP | Optional real verify exists but status is not persisted. | Fix | Keep optional and persist verify result. |
| Direct OpenAI | Currently required by approved catalog and several legacy routes. | Remove/Hide | Not a required Settings card; GenX is the OpenAI-compatible product route. Legacy direct routes may remain internal. |
| Firecrawl | Listed as a required research tool. | Remove/Hide | Local crawler stack is the Settings requirement. |

## Command, media, Workbench, App Builder, and outputs

| File/area | Problem | Action | Intended result |
| --- | --- | --- | --- |
| `src/lib/command-router.ts` | Static provider strings; missing selected capability/providers; only one missing-info rule. | Fix | Classify the required intents and select only connected providers from provider mesh. |
| `src/app/api/admin/command/route.ts` | Creates a `ready` job but performs no execution. | Wire | Dispatch safe create/research/question commands to existing real routes/services; preserve approval gates for writes/deployments. |
| `src/app/api/admin/music-studio/route.ts` | Real job pipeline exists but Command does not invoke it. | Wire | Command song intent submits the real job and returns its job/artifact references. |
| `src/app/api/brain/image/route.ts` | Real provider chain exists but still advertises direct OpenAI as required and is not Command-driven. | Fix/Wire | Command invokes it; product-facing errors list connected mesh options only. |
| `src/app/api/brain/video-generate/route.ts` | Real async jobs exist, but a Together image call is labelled as video and planning fallback can obscure the absence of a rendered file. | Fix | Do not call image generation a video; return a truthful blocked state when no real video job is created. |
| `src/app/api/brain/video-generate/[jobId]/route.ts` | Polling and artifact persistence are real for supported providers. | Keep/Wire | Use as the canonical async video result path. |
| Repo Workbench routes | Substantial real audit/patch/check/PR/deploy routes exist. | Keep/Wire | Command routes to the attached Workbench and never performs write operations without approval. |
| App Builder routes | Project route and coding agent exist, with scaffold fallbacks containing TODO/placeholder source. | Fix | AI-backed builds must report provider absence rather than claim a completed generated app; remove placeholder auth output from generated templates. |
| `src/lib/artifact-store.ts` | Canonical DB artifact store exists while dashboard uses local JSON artifacts. | Fix | Canonicalize output listing and taxonomy; local JSON remains a fallback for command metadata only. |

## Open-source stack

| File | Problem | Action | Intended result |
| --- | --- | --- | --- |
| Missing `scripts/install-open-source-stack.sh` | No single install/check script. | Create | Idempotently install/check Redis, Qdrant, Playwright browsers, Python venv, Scrapy, Trafilatura, ffmpeg, Rhubarb, and storage directories. |
| Missing `docs/FINAL_VPS_INSTALL_PLAN.md` | No final operator plan matching the product contract. | Create | Exact install, environment, verification, service, and rollback steps. |

## Tests

| Area | Problem | Action | Intended result |
| --- | --- | --- | --- |
| Dashboard/productization tests | Several tests encode the old eight-item navigation and legacy provider catalog. | Fix | Assert the seven-item nav and canonical registries. |
| Provider tests | Test routes are mostly untested as a shared status contract. | Add | Verify green requires configured key plus persisted passed live test. |
| Command router tests | Existing tests do not prove connected-provider selection or required public response fields. | Add/Fix | Verify intent parsing, focused follow-up, provider selection, and approval gates. |
| Public website tests | Existing tests focus on banned visuals/words but not alternating page structure or source nav. | Add/Fix | Verify nav registry, route coverage, brand copy, and banned wording. |
| Build/lint | `next lint` is not available as a reliable Next 15 script in all environments. | Validate | Run focused tests, full Vitest, TypeScript/Next build, route smoke checks, and banned wording grep. |

## Implementation order

1. Create canonical registries and compatibility re-exports.
2. Rebuild Settings truth and shared status persistence.
3. Add missing provider/local-tool test routes and Test controls.
4. Make Command select connected capabilities and dispatch supported real work.
5. Align artifacts, network apps, public pages, dashboard nav, and page copy.
6. Add the open-source install plan/script.
7. Update tests, run full validation, inspect the local UI, then publish a draft PR.
