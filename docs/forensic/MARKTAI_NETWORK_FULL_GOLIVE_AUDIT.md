# Amarktai Network Full Go-Live Audit

Branch audited: `forensic-golive-audit-dashboard-ai-system`

Repository: `amarktainetwork-blip/Amarktai-Network-2`

Audit mode: forensic only. No implementation fixes were made.

## 1. Overall GO / NO-GO

Verdict: **NO-GO**

The platform is not live-ready yet. The local production build passes, but the test suite fails with 8 timeout failures across 6 test files. Several visible dashboard features are still partial, disabled, duplicated, or not wired to proven live provider/runtime truth. Media generation, adult mode, app agents, self-learning, MCP/tools, budget enforcement, and VPS deploy flows are not certified end-to-end.

## 2. Top 20 Blockers

1. `npm test` fails: 8 failed tests / 1415 total.
2. Media Studio image generation uses a limited hard-coded model list and a workspace route instead of consistently using the production image route/model catalog.
3. Media Studio video generation is disabled and not a complete real job/poll/artifact flow.
4. Media Studio music generation is disabled from the canonical media page.
5. Media Studio has no real Adult tab/workflow despite adult requirements.
6. Adult mode safety and specialist provider routing are not proven end-to-end.
7. GenX model catalog is not consistently surfaced across AI Engine, Media Studio, and Repo Workbench.
8. Runtime truth has provider/key source mismatches across Settings, provider config, runtime truth, media, repo workbench, and adult mode.
9. GitHub token source is split between legacy GitHub config and provider/service vault patterns.
10. Repo Workbench is structurally strong but not live-certified with real GitHub PAT, workspace root, GenX/direct provider, push, PR, and deploy flows.
11. Apps & Agents cannot yet be proven to run 20-25 apps/PWAs with isolated memory, budget, tools, and agents.
12. App-specific knowledge and per-app memory isolation are partial and not live-proven.
13. MCP/tool layer is not a complete safe dashboard-accessible tool system.
14. Self-learning exists as modules but automatic daily learning and approved global learning are not proven operational.
15. Budget/cost controls are not sufficient to safely run expensive media jobs at scale.
16. Long-running heavy jobs are not universally proven async, cancellable, queued, and resource-limited.
17. VPS deploy is not certified against live systemd, Nginx/static, storage permission, DB, health, and rollback checks.
18. Hidden/legacy dashboard pages still exist and can expose duplicate, confusing, or stale surfaces.
19. Route auth/role coverage needs a full matrix for every admin and mutating API.
20. Existing readiness/completion docs are ahead of current verification and must not be treated as go-live proof.

## 3. Critical Blockers

- Test suite failure blocks any go-live claim.
- Canonical Media Studio is not production-ready for image/video/voice/music/adult.
- Adult mode must remain hidden or disabled until specialist provider tests, app-level gates, and safety exclusions are proven.
- Repo Workbench cannot be claimed as production-live until tested with real GitHub token, writable workspace, AI provider, push/PR, and deploy guards.
- VPS deployment cannot be certified without live server verification.

## 4. High Priority Blockers

- One-source-of-truth provider status mismatch.
- Model catalog mismatch across AI Engine, Media Studio, and Repo Workbench.
- Missing cost/queue/concurrency gates for heavy jobs.
- Apps & Agents app-scoped permissions, memory, tools, and budgets incomplete.
- MCP/tools/webhooks partial and not safe-complete.

## 5. Medium Priority Blockers

- Duplicate/legacy pages should be hidden, redirected, or removed after canonical replacements are verified.
- Public and admin language should keep internal providers out of user-facing product branding.
- Better artifact lineage is needed across all AI/media/repo flows.
- More frontend smoke tests are needed for dashboard tabs, disabled states, and blocked actions.

## 6. Nice-To-Have Later

- Richer live dashboards for cost, queue depth, and provider latency.
- App marketplace style packaging.
- More visual polish after backend and workflow truth are complete.
- Advanced MCP tool marketplace after safe core tool layer exists.

## 7. What Is Working Now

- Next.js production build completes successfully.
- Lint completes with warnings only.
- Canonical dashboard navigation exists for the intended sections.
- Runtime truth/capability status routes exist.
- Repo Workbench has a broad backend route set and security helper modules.
- Provider vault/service-vault concepts exist.
- GenX client, brain execution, provider health, and capability routing modules exist.
- Artifact, jobs, learning, RAG, Firecrawl, Mem0, Qdrant, and budget modules exist.
- Health routes exist, including `/api/health/ping`.
- Build output proves all current routes/pages compile.

## 8. What Is Partially Working

- Overview and Command Center show operational data but are only as truthful as runtime status inputs.
- AI Engine has provider/model surfaces but model catalog consistency is incomplete.
- Repo Workbench is close structurally but needs live E2E verification.
- Artifacts & Jobs exist, but universal artifact/job lineage is not proven.
- Settings can manage some integrations, but not every feature reads the same truth.
- Apps & Agents have route/model scaffolding but not full per-app operational isolation.
- Voice/TTS can call backend routes, but streaming voice loop is not complete.
- Memory/RAG/crawling modules exist but are not certified as automatic self-learning.

## 9. What Is Fake / Placeholder / Disabled

- Video generation in canonical Media Studio is disabled.
- Music generation in canonical Media Studio is disabled.
- Adult mode is not a real canonical tab/workflow.
- Some dashboard surfaces are legacy/redirected/hidden duplicates rather than canonical live workflows.
- Some visible readiness/completion docs imply more certainty than current verification supports.

## 10. What Should Be Hidden Before Live

- Adult tab/surfaces unless global and app-level adult enablement plus provider tests pass.
- Legacy Build Studio/Workspace/Media Hub/Brain/Lab pages unless they redirect clearly to canonical sections.
- Merge/deploy buttons unless environment flags, live checks, and confirmations are satisfied.
- Expensive video/music controls until cost, quota, queue, and provider availability are proven.

## 11. What Must Be Fixed Tonight

1. Fix the 8 failing tests without hiding failures.
2. Normalize provider/key source of truth across Settings, runtime truth, Media Studio, Repo Workbench, AI Engine, and Adult Mode.
3. Fix canonical Media Studio image endpoint/model catalog usage.
4. Implement or hide video/music generation flows truthfully.
5. Keep Adult Mode hidden until safety/provider/app gates are fully proven.
6. Run a live Repo Workbench E2E with GitHub PAT against a safe test repo.
7. Verify artifact/job persistence for media and repo flows.
8. Run VPS deploy dry-run/checklist on target infrastructure before any production redeploy.

## 12. What Can Wait

- Public website polish beyond broken claims.
- Advanced animation/design work.
- Full MCP marketplace.
- Multi-app marketplace packaging.
- Advanced social/media integrations.

## Section Status

Section | Status | Blockers | Fix Priority
--- | --- | --- | ---
Public website | PARTIAL | Needs full page/link/content verification and internal provider language sweep | High
Admin login/auth | PARTIAL | Needs full route auth/role matrix | Critical
Dashboard navigation | PARTIAL | Canonical nav exists; hidden duplicates remain | High
Settings/API keys | PARTIAL | Provider truth mismatches | Critical
AI Engine/GenX | PARTIAL | Catalog/status not consistently consumed | Critical
Media Studio | FAIL | Disabled video/music, weak image catalog, no adult workflow | Critical
Repo Workbench | PARTIAL | Needs live GitHub/AI/workspace/push/PR/deploy verification | Critical
Apps & Agents | PARTIAL | App-scoped agents/memory/tools/budget incomplete | High
Artifacts & Jobs | PARTIAL | Universal lineage not proven | High
System Health/VPS | PARTIAL | Live server and deploy checks not run | Critical
MCP/tools/webhooks | FAIL/PARTIAL | Not complete safe tool layer | Medium
Self-learning/memory/RAG | PARTIAL | Automatic learning not proven | High
Budget/cost/queue | PARTIAL | Heavy job protection incomplete | High
Safety/adult/permissions | FAIL/PARTIAL | Adult safety/provider/app gating not proven | Critical
Build/deploy/runtime config | PARTIAL | Build passes; deploy not live-certified | Critical
Duplicate/dead pages | PARTIAL | Several legacy pages still present | Medium
Tests/docs | FAIL | Test suite fails | Critical

## Capability Status

Capability | Status | Blocker | Required Fix
--- | --- | --- | ---
Chat | PARTIAL | Needs live provider/runtime confirmation | Verify GenX/direct fallback and streaming UI.
Reasoning | PARTIAL | Catalog and routing not fully unified | Use one model catalog source.
Coding agent | PARTIAL | Repo Workbench structurally ready, live E2E missing | Test full audit/patch/check/commit/push/PR.
Code review | PARTIAL | Same as coding agent | Add documented mode and artifact lineage.
Repo patching | PARTIAL | Needs live safe patch test | Verify path safety and patch apply on real repo.
Image generation | FAIL/PARTIAL | UI hard-coded and inconsistent endpoint | Route through production image API/catalog.
Adult image generation | FAIL | App gates/provider tests not proven | Specialist adult provider chain and safety tests.
Video generation | FAIL | Canonical UI disabled, renderer not proven | GenX/video provider job flow with polling/artifacts.
Image-to-video | FAIL | Not proven in UI | Add/hide until real provider flow works.
Avatar video | FAIL/PARTIAL | Not live-certified | Verify route/provider/artifact flow.
Voice/TTS | PARTIAL | Batch only, streaming voice incomplete | Complete mic/STT/stream/TTS/playback loop.
Streaming voice | FAIL/PARTIAL | UI/backend not end-to-end | Implement or document limitation.
STT/transcription | PARTIAL | Route exists; UI coverage not fully verified | Verify provider config and errors.
Music/song generation | FAIL | Canonical UI disabled | Real provider/GenX async job flow.
Translation | PARTIAL | Model capability exists conceptually | Surface and test.
Embeddings | PARTIAL | Route exists | Verify provider, storage, app use.
Reranking | PARTIAL | Route exists | Verify provider and UI use.
Moderation | PARTIAL | Tests include fallback areas | Ensure safety routes pass tests.
Research | PARTIAL | Routes/modules exist | Verify crawler/provider and artifact output.
Crawler/RAG | PARTIAL | Firecrawl/RAG modules exist | Prove live crawl/index/query.

## Provider Status

Provider | Key Status | Wired? | Used By | Blocker
--- | --- | --- | --- | ---
GenX | Vault/env supported | Partial | AI, media, repo, models | Live catalog/status and UI consistency needed.
GitHub PAT | Split config/vault risk | Partial | Repo Workbench, GitHub routes | Source-of-truth mismatch and live auth needed.
Webdock | Settings/test route present | Partial | VPS/system health | Live VPS verification needed.
Firecrawl | Vault/env supported | Partial | App intelligence/RAG | Live key/crawl not verified.
Mem0 | Vault/env supported | Partial | Memory | Live memory not verified.
Qdrant | Env/module present | Partial | RAG/vector | Live vector DB not verified.
PostHog | Env/config likely | Partial | Analytics | Not a go-live blocker.
Google/Gemini | Vault/env supported | Partial | AI fallback | Model/status consistency needed.
Qwen/DashScope | Env mismatch risk | Partial | AI fallback | Normalize env names and status.
Groq | Vault/env supported | Partial | AI fallback | Verify route usage.
xAI/Grok | Runtime truth only/partial | Partial | AI/media/adult potential | Ensure vault/status/test path.
OpenRouter | Runtime truth only/partial | Partial | AI fallback | Ensure vault/status/test path.
Together AI | Vault/env supported | Partial | Adult/text/media potential | Adult provider tests required.
HuggingFace | Runtime truth only/partial | Partial | Adult/media potential | Specialist model routing/test required.
OpenAI | Vault/env supported | Partial | Moderation/AI fallback | Verify moderation fallback behavior.
ElevenLabs | Runtime truth only/partial | Partial | Voice | Need UI/provider test.
Deepgram | Runtime truth only/partial | Partial | Voice/STT/TTS | Need UI/provider test.
AssemblyAI | Runtime truth only/partial | Partial | STT | Need UI/provider test.
Anthropic | Runtime truth only/partial | Partial | AI fallback | Need catalog/test integration.
Mistral | Runtime truth only/partial | Partial | AI fallback | Need catalog/test integration.
Cohere | Runtime truth only/partial | Partial | Embeddings/rerank | Need catalog/test integration.
Replicate | Env mismatch risk | Partial | Media fallback | Normalize env names and status.
Adult provider key | Partial | Partial | Adult mode | Must use specialist tested chain, not accidental default.

## Readiness Answers

Repo Workbench readiness: **PARTIAL / NOT GO-LIVE CERTIFIED**. A user may be able to use it with the right GitHub token, writable workspace, and AI provider, but this audit did not prove the full fix/test/commit/push/PR/deploy path live.

Media Studio readiness: **FAIL**. Image generation is inconsistent, video and music are disabled, adult is missing as a real workflow, and artifact/job lineage is not proven for every output.

Adult mode readiness: **FAIL**. Safety exclusions and specialist provider routing exist conceptually but are not proven end-to-end. Hide until verified.

Apps & Agents readiness: **PARTIAL**. Not ready to confidently operate 20-25 apps/PWAs with app-specific agents, memory, tools, budgets, and health.

MCP/tools readiness: **FAIL/PARTIAL**. MCP is not implemented as a complete safe tool layer. Minimum plan: read-only tools first, then mutating tools behind role checks, approvals, logs, and audit trails.

Self-learning readiness: **PARTIAL**. Modules exist, but automatic daily learning and approved global learning are not proven.

VPS/deploy readiness: **PARTIAL / NOT CERTIFIED**. Build passes locally, but live VPS deploy checks were not run in this audit.

## Tonight Fix Plan

Phase | Task | Files likely touched | Verification
--- | --- | --- | ---
1 | Fix failing tests | `src/lib/**`, affected route tests | `npm test`
2 | Normalize provider truth | `src/lib/provider-config.ts`, `src/lib/runtime-capability-truth.ts`, settings/media/repo routes | Provider status screenshots/API responses
3 | Fix Media Studio image path | `src/app/admin/dashboard/media-studio/page.tsx`, `/api/brain/image` wiring | Generate image to artifact with real/mocked provider
4 | Hide or complete video/music | Media page, video/music routes | No fake ready states; truthful blockers
5 | Lock Adult Mode | adult settings/routes/guardrails/media UI | Safety tests and provider test required before visible
6 | Repo Workbench E2E | Repo Workbench page/routes | Import safe repo, branch, patch, test, commit, push, PR
7 | Artifact/job lineage | media/repo/artifact/job routes | Artifacts list/open/delete after restart
8 | VPS deploy verification | `scripts/deploy_vps.sh`, service, Nginx/runtime env | Health checks on target VPS

## Verification Results

Command | Result | Evidence
--- | --- | ---
`npm run lint` | PASS with warnings | Next lint deprecated warning; `<img>` warnings in `CreatorStudioTab.tsx` and `TestAITab.tsx`.
`npm test` | FAIL | 44 test files: 38 passed, 6 failed. 1415 tests: 1407 passed, 8 failed.
`npm run build` | PASS with warnings | Build compiled successfully and generated 205 static pages; same `<img>` warnings.

### Failed Tests

1. `src/lib/__tests__/adult-text-route.test.ts` - `/api/brain/adult-text` refuses degrading prompts before provider execution timed out.
2. `src/lib/__tests__/backend-truth.test.ts` - `/api/brain/video-generate` truthful blocker test timed out.
3. `src/lib/__tests__/config-validator.test.ts` - provider validation result shape test timed out.
4. `src/lib/__tests__/app-agent-golive.test.ts` - `parseAdminNotes` test timed out.
5. `src/lib/__tests__/app-agent-golive.test.ts` - `searchAppKnowledge` app slug filter test timed out.
6. `src/lib/__tests__/phase2-systems.test.ts` - manager check exports test timed out.
7. `src/lib/__tests__/go-live-readiness.test.ts` - `routeRequest` signature test timed out.
8. `src/lib/__tests__/go-live-readiness.test.ts` - manager check exports test timed out.

## Audit Documents Created

- `docs/forensic/full-golive-repo-inventory.md`
- `docs/forensic/dashboard-golive-audit.md`
- `docs/forensic/settings-provider-key-audit.md`
- `docs/forensic/ai-engine-genx-model-audit.md`
- `docs/forensic/media-studio-golive-audit.md`
- `docs/forensic/adult-mode-golive-audit.md`
- `docs/forensic/repo-workbench-golive-audit.md`
- `docs/forensic/apps-agents-golive-audit.md`
- `docs/forensic/mcp-tools-webhooks-golive-audit.md`
- `docs/forensic/learning-memory-rag-golive-audit.md`
- `docs/forensic/system-health-vps-deploy-audit.md`
- `docs/forensic/budget-cost-queue-audit.md`
- `docs/forensic/security-auth-permissions-audit.md`
- `docs/forensic/MARKTAI_NETWORK_FULL_GOLIVE_AUDIT.md`

## Final Verdict

**NO-GO.**

The app is closer than a blank slate: the route surface, dashboard shell, Repo Workbench foundation, provider vault, AI engine modules, and health endpoints are real. But this cannot be called live-ready until tests pass, provider truth is unified, Media Studio and Adult Mode are truthful, Repo Workbench is verified end-to-end, and VPS deployment is proven on the target server.
