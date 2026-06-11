# Full Go-Live Repo Inventory

Branch audited: `forensic-golive-audit-dashboard-ai-system`

Repository: `amarktainetwork-blip/Amarktai-Network-2`

Verdict: inventory complete for audit purposes. This file records what exists; it does not certify that every listed feature works.

## Inventory Summary

Area | Count / Status | Notes
--- | ---: | ---
`src/app` files | 256 | Public pages, admin dashboard pages, API routes, health routes, brain routes.
`src/app/api` route files | 187 | Large route surface; many admin and AI routes exist but runtime truth varies.
`src/lib` files | 144 | AI routing, providers, storage, repo workbench, memory, learning, jobs, budget, safety modules.
`src/components` files | 13 | Smaller shared component surface; dashboard is largely route-local.
`prisma` | Present | Schema and migrations/config require verification against live DB.
`docs` | Present | Multiple readiness/completion docs exist; several claim progress but do not prove go-live.
`scripts` | Present | Includes deploy and audit helpers.
`deploy` | Present | Includes systemd service material.
`docker-compose.yml` | Present | Runtime service config exists; production alignment requires VPS verification.
`next.config.*` | Present | Next.js app build config present.
`middleware.*` | Present | Auth/protection must be checked against all admin/API routes.

## Dashboard Pages

Canonical pages visible from current dashboard navigation:

- `src/app/admin/dashboard/page.tsx` - Overview
- `src/app/admin/dashboard/command-center/page.tsx`
- `src/app/admin/dashboard/repo-workbench/page.tsx`
- `src/app/admin/dashboard/ai-engine/page.tsx`
- `src/app/admin/dashboard/media-studio/page.tsx`
- `src/app/admin/dashboard/apps/page.tsx`
- `src/app/admin/dashboard/artifacts/page.tsx`
- `src/app/admin/dashboard/system-health/page.tsx`
- `src/app/admin/dashboard/settings/page.tsx`

Additional dashboard pages, duplicates, redirects, or legacy surfaces found:

- `src/app/admin/dashboard/access/page.tsx`
- `src/app/admin/dashboard/alerts/page.tsx`
- `src/app/admin/dashboard/app-agents/page.tsx`
- `src/app/admin/dashboard/app-agents/new/page.tsx`
- `src/app/admin/dashboard/app-agents/[slug]/page.tsx`
- `src/app/admin/dashboard/apps/new/page.tsx`
- `src/app/admin/dashboard/apps/[slug]/page.tsx`
- `src/app/admin/dashboard/brain/page.tsx`
- `src/app/admin/dashboard/build-studio/page.tsx`
- `src/app/admin/dashboard/deployments/page.tsx`
- `src/app/admin/dashboard/emotions/page.tsx`
- `src/app/admin/dashboard/events/page.tsx`
- `src/app/admin/dashboard/genx-models/page.tsx`
- `src/app/admin/dashboard/integrations/page.tsx`
- `src/app/admin/dashboard/intelligence/page.tsx`
- `src/app/admin/dashboard/jobs/page.tsx`
- `src/app/admin/dashboard/lab/page.tsx`
- `src/app/admin/dashboard/labs/page.tsx`
- `src/app/admin/dashboard/media/page.tsx`
- `src/app/admin/dashboard/media-hub/page.tsx`
- `src/app/admin/dashboard/models/page.tsx`
- `src/app/admin/dashboard/monitor/page.tsx`
- `src/app/admin/dashboard/music-studio/page.tsx`
- `src/app/admin/dashboard/onboarding/page.tsx`
- `src/app/admin/dashboard/operations/page.tsx`
- `src/app/admin/dashboard/readiness/page.tsx`
- `src/app/admin/dashboard/system/page.tsx`
- `src/app/admin/dashboard/video/page.tsx`
- `src/app/admin/dashboard/voice/page.tsx`
- `src/app/admin/dashboard/workspace/page.tsx`
- `src/app/admin/dashboard/settings/AmarktAI Assistant-avatar/page.tsx`
- `src/app/admin/dashboard/system/voice-access/page.tsx`
- `src/app/admin/dashboard/system/voice-access/enrollment/page.tsx`

Audit note: hidden/legacy dashboard pages are a go-live risk because they can expose stale states, duplicate concepts, and partially wired features even when the canonical navigation is cleaner.

## API Route Inventory

Major route groups found:

- Admin dashboard/runtime: `/api/admin/dashboard`, `/api/admin/runtime-truth`, `/api/admin/system/capabilities`, `/api/admin/truth`, `/api/admin/readiness`, `/api/admin/vps`
- Admin auth/session: `/api/admin/login`, `/api/admin/logout`
- Provider and key management: `/api/admin/providers`, `/api/admin/providers/[id]`, `/api/admin/providers/catalog`, `/api/admin/providers/health-check-all`, `/api/admin/integrations`, `/api/admin/integration-keys`, `/api/admin/settings/test-*`
- AI engine and brain: `/api/brain/execute`, `/api/brain/stream`, `/api/brain/image`, `/api/brain/image-edit`, `/api/brain/video`, `/api/brain/video-generate`, `/api/brain/tts`, `/api/brain/stt`, `/api/brain/research`, `/api/brain/moderation`, `/api/brain/embeddings`, `/api/brain/rerank`
- AmarktAI Assistant: `/api/AmarktAI Assistant/run`, `/api/admin/AmarktAI Assistant/chat`, `/api/admin/AmarktAI Assistant/stream`, `/api/admin/AmarktAI Assistant/context`, `/api/admin/AmarktAI Assistant/memory`
- Media/adult: `/api/brain/adult-image`, `/api/brain/adult-text`, `/api/brain/suggestive-image`, `/api/brain/suggestive-video`, `/api/brain/suggestive-video-gen`, `/api/admin/music-studio`, `/api/admin/music-studio/jobs/[jobId]`
- Repo Workbench: `/api/admin/repo-workbench/status`, `/api/admin/repo-workbench/import`, `/api/admin/repo-workbench/models`, `/api/admin/repo-workbench/repos`, `/api/admin/repo-workbench/github/*`, `/api/admin/repo-workbench/[workspaceId]/*`, `/api/admin/repo-workbench/jobs/[jobId]/*`
- Legacy GitHub admin routes: `/api/admin/github`, `/api/admin/github/repos`, `/api/admin/github/import`, `/api/admin/github/tree`, `/api/admin/github/file`, `/api/admin/github/push`, `/api/admin/github/pr`, `/api/admin/github/deploy`
- Apps/agents: `/api/admin/apps`, `/api/admin/app-agents`, `/api/admin/app-agents/[slug]`, `/api/admin/app-profiles`, `/api/admin/app-health`, `/api/admin/app-safety`, `/api/apps`
- Artifacts/jobs: `/api/admin/artifacts`, `/api/artifacts/file/[...key]`, `/api/admin/jobs`
- Learning/RAG/crawlers: `/api/admin/learning`, `/api/admin/memory`, `/api/admin/retrieval`, `/api/rag`
- MCP/tools/webhooks: `/api/tools`, `/api/webhooks`, `/api/workflows`, `/api/integrations/events`, `/api/integrations/heartbeat`, `/api/integrations/metrics`
- Health: `/api/health`, `/api/health/ping`, `/api/system/health-deep`, `/api/realtime/health`

Audit note: route breadth is high. Go-live depends on UI-to-route wiring, auth consistency, truthful status, and provider/runtime verification, not route existence.

## Provider and Key Modules

Primary modules found:

- `src/lib/provider-config.ts`
- `src/lib/service-vault.ts`
- `src/lib/runtime-capability-truth.ts`
- `src/lib/genx-client.ts`
- `src/lib/brain.ts`
- `src/lib/capability-router.ts`
- `src/lib/model-catalog.ts`
- `src/lib/adult-model-catalog.ts`
- `src/lib/provider-health-monitor.ts`

Go-live risk: provider key names and source-of-truth are inconsistent across some modules. Examples found during audit include Qwen/DashScope and Replicate env naming mismatches, plus GitHub token storage split between GitHub config and service vault.

## Repo Workbench Modules

Primary modules and routes found:

- `src/app/admin/dashboard/repo-workbench/page.tsx`
- `src/app/api/admin/repo-workbench/status/route.ts`
- `src/app/api/admin/repo-workbench/import/route.ts`
- `src/app/api/admin/repo-workbench/github/*`
- `src/app/api/admin/repo-workbench/[workspaceId]/*`
- `src/app/api/admin/repo-workbench/jobs/[jobId]/*`
- `src/lib/repo-workbench-status.ts`
- `src/lib/workspace-executor.ts`
- `src/lib/workspace-security.ts`

Go-live status: structurally strong but not live-certified. It still needs end-to-end verification with a real GitHub PAT, writable workspace root, GenX/direct AI availability, push/PR checks, and deploy guard validation.

## Media Modules

Primary modules and routes found:

- `src/app/admin/dashboard/media-studio/page.tsx`
- `src/app/admin/dashboard/build-studio/tabs/CreatorStudioTab.tsx`
- `src/lib/music-studio.ts`
- `src/app/api/admin/music-studio/route.ts`
- `src/app/api/admin/music-studio/jobs/[jobId]/route.ts`
- `src/app/api/brain/image/route.ts`
- `src/app/api/brain/image-edit/route.ts`
- `src/app/api/brain/video/route.ts`
- `src/app/api/brain/video-generate/route.ts`
- `src/app/api/brain/video-generate/[jobId]/route.ts`
- `src/app/api/brain/tts/route.ts`
- `src/app/api/brain/stt/route.ts`

Go-live status: not ready. The Media Studio UI has disabled video/music flows, a hard-coded small image model list, no adult tab, and inconsistent endpoint usage.

## Learning, Memory, and RAG Modules

Primary modules found:

- `src/lib/memory.ts`
- `src/lib/mem0-client.ts`
- `src/lib/qdrant-client.ts`
- `src/lib/rag-pipeline.ts`
- `src/lib/firecrawl.ts`
- `src/lib/learning-engine.ts`
- `src/lib/daily-learning.ts`
- `src/lib/cross-app-learning.ts`
- `src/lib/federated-memory.ts`

Go-live status: partial. The codebase contains meaningful building blocks, but automatic learning, scoped app memory, approved global learning, and operational RAG are not proven live-ready.

## Deployment Scripts and Runtime Config

Deployment and runtime files found:

- `scripts/deploy_vps.sh`
- `deploy/amarktai-web.service`
- `docker-compose.yml`
- `next.config.js`
- `middleware.ts`

Go-live status: build passes locally, but VPS production readiness is not certified without live checks for systemd, Nginx/static assets, storage permissions, environment variables, DB migration/push, health endpoints, and rollback.

## Docs That Claim Readiness or Completion

Existing docs with readiness/completion language found:

- `docs/forensic/backend-audit-results.md`
- `docs/forensic/dashboard-ai-system-completion-report.md`
- `docs/forensic/dashboard-final-golive-readiness-report.md`
- `docs/forensic/dashboard-runtime-wiring-completion-report.md`
- `docs/forensic/repo-workbench-audit.md`
- `docs/forensic/runtime-wiring-one-source-truth-audit.md`

Audit note: these are useful historical records, but current verification still produced a NO-GO because `npm test` fails and several visible features are partial, disabled, or not live-verified.
