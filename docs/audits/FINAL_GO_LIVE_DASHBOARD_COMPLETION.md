# Final Go-Live Dashboard Completion

Date: 2026-05-08
Branch: `codex/dashboard-go-live-wiring`

## Completed Dashboard Features

- Final dashboard remains limited to `/admin/dashboard`, `/admin/dashboard/workbench`, `/admin/dashboard/apps-agents`, `/admin/dashboard/memory-learning`, `/admin/dashboard/operations`, and `/admin/dashboard/settings`.
- No dashboard-v2, frontend-v2, duplicate route tree, or duplicate nav was added.
- Hidden/admin login behavior and backend guards remain untouched.
- Dashboard pages now show blockers instead of fake success where keys, live tests, provider capability, storage, or backend routes are missing.

## Studio Route Map

- Chat: `POST /api/admin/amarktai-assistant/stream`
- Research: `POST /api/admin/studio/execute`, which calls the protected research assist route and persists an artifact.
- Image: `POST /api/admin/studio/execute`, which calls the image backend route and refreshes artifacts.
- Video: `POST /api/admin/studio/execute`, then polls returned `pollUrl` until `completed`, `succeeded`, or `failed`.
- Music/Audio: `POST /api/admin/studio/execute`, backed by the music studio route.
- Voice/TTS: `POST /api/admin/studio/execute`, with voice/provider/model selectors and inline playback when audio is returned.
- STT: `POST /api/admin/studio/stt`, multipart upload, transcript display, and transcript artifact persistence.
- Coding: `POST /api/admin/studio/workbench-handoff`, then handoff to `/admin/dashboard/workbench`.
- Adult: text/image only when app policy and provider capability allow it.
- Avatar/Talking Video: blocked with `backend route not implemented`.
- Artifacts: `GET /api/admin/artifacts`, inline previews for image/video/audio/text where URL metadata exists.

## Workbench Route Map

- Repos: `GET /api/admin/repo-workbench/github/repos`
- Branches: `GET /api/admin/repo-workbench/github/branches`
- Latest job: `GET /api/admin/repo-workbench/jobs/latest`
- Import: `POST /api/admin/repo-workbench/import`
- Plan: `POST /api/admin/repo-workbench/[workspaceId]/plan`
- Patch: `POST /api/admin/repo-workbench/[workspaceId]/patch`
- Apply: `POST /api/admin/repo-workbench/[workspaceId]/apply-patch`
- Checks: `GET /api/admin/repo-workbench/[workspaceId]/checks`
- Run check: `POST /api/admin/repo-workbench/[workspaceId]/run-check`
- Commit: `POST /api/admin/repo-workbench/[workspaceId]/commit`
- Push: `POST /api/admin/repo-workbench/[workspaceId]/push`
- PR: `POST /api/admin/repo-workbench/[workspaceId]/pr`
- Merge/deploy: guarded by existing backend confirmation and environment flags.

## Settings Provider / Tool Map

- GenX unlocks routed Studio and Workbench model execution.
- GitHub unlocks repo import, branches, checks, commit, push, PR, and guarded merge/deploy.
- Storage unlocks artifact persistence, media previews, reports, and logs.
- Redis unlocks queues, job coordination, and realtime job state.
- Playwright unlocks browser verification and QA checks.
- Firecrawl/Crawl4AI unlock Research and scraping.
- Webdock unlocks VPS/service visibility.
- OpenAI, Groq, Together, Hugging Face, Qwen/DashScope, and MiniMax/Mimo remain approved optional providers based on capability.
- SMTP/email is visible as a setup item and remains optional unless email workflows are required.

Each Settings item shows status, unlocks, env/key needed, test route, last test result, and exact blocker.

## Operations Readiness Map

- Go-live summary answers whether the dashboard is ready for live testing.
- Required blocker categories are shown explicitly: missing required key, failed live test, broken protected API, broken storage, broken GitHub, broken Studio execution, broken Workbench PR flow, broken static assets, and build/lint/test failure.
- Runtime panels show provider health, storage writable status, Redis, Playwright, GitHub, research stack, jobs, failed jobs, artifacts, approvals, Workbench jobs, Studio jobs, and cost summary.

## Voice / Model Selection Proof

- Studio uses the universal model catalog and capability-filtered model lists by tab.
- Manual provider and manual model selection remain available.
- Auto routing remains available.
- `auto:` GenX aliases are normalized out before execution payloads are sent.
- Voice/TTS shows available voice provider options from assistant context and clearly reports MiniMax/Mimo status or missing-key blocker.

## Adult Policy Proof

- Adult is app-policy based and does not require a separate adult key.
- Adult text and adult image are the only working adult execution modes exposed.
- Adult video and adult voice are stated as blocked until real backend support exists.
- Provider/policy blockers are surfaced from the backend route instead of showing fake success.

## Remaining Required Blockers

- Add production API keys.
- Run live tests for required providers/tools.
- Confirm storage writability on the VPS.
- Confirm GitHub repo/branch/PR flow with a real test repository.
- Confirm Studio execution routes with configured providers.
- Confirm Workbench PR creation, protected API auth, static asset loading, and build/lint/test results on VPS.

## Optional / Later Items

- Avatar/talking video backend route.
- Automated memory promotion scheduler.
- Extra providers.
- SMTP enhancements.

## VPS Verification Commands

```bash
npm ci
npm run build
npm run lint
npm test
curl -i https://YOUR_DOMAIN/api/admin/settings/status
curl -i https://YOUR_DOMAIN/api/admin/system/live-readiness
curl -i https://YOUR_DOMAIN/api/admin/artifacts
curl -i https://YOUR_DOMAIN/api/admin/repo-workbench/github/repos
curl -i https://YOUR_DOMAIN/api/admin/studio/execute
redis-cli ping
systemctl status YOUR_APP_SERVICE
journalctl -u YOUR_APP_SERVICE -n 200 --no-pager
df -h
```

Unauthenticated protected API checks should return `401`. Repeat the same routes from an authenticated admin browser session to validate live behavior.
