# Final Dashboard Go-Live Wiring Audit

Date: 2026-05-08
Branch: `codex/dashboard-go-live-wiring`

## Dashboard Pages Changed

- `/admin/dashboard`: Studio wiring, job status, media previews, protected route visibility, STT/TTS handling, Workbench handoff.
- `/admin/dashboard/workbench`: Repo to PR workflow split into clear guarded steps: repo, branch, model, prompt, plan, patch, approve, checks, commit, push, PR, deploy guard.
- `/admin/dashboard/settings`: Setup checklist and provider/tool status truth center.
- `/admin/dashboard/operations`: Go-live readiness, live blockers, jobs, artifacts, approvals, providers, costs, and runtime services.
- `/admin/dashboard/apps-agents`: Agent registry and app package truth without fake CRUD.
- `/admin/dashboard/memory-learning`: Stored memory, artifact inputs, learning logs, and explicit automation blockers.

## Routes Used By Each Feature

- Studio chat: `POST /api/admin/amarktai-assistant/stream`
- Studio execute: `POST /api/admin/studio/execute`
- Studio STT: `POST /api/admin/studio/stt`
- Studio coding handoff: `POST /api/admin/studio/workbench-handoff`
- Studio artifacts: `GET /api/admin/artifacts`
- Video polling: returned `pollUrl`, currently `/api/brain/video-generate/[jobId]`
- Workbench repos: `GET /api/admin/repo-workbench/github/repos`
- Workbench branches: `GET /api/admin/repo-workbench/github/branches`
- Workbench latest job: `GET /api/admin/repo-workbench/jobs/latest`
- Workbench import/plan/patch/apply/check/commit/push/PR/merge/deploy: existing protected repo-workbench routes.
- Settings truth: `GET /api/admin/settings/status`
- Runtime readiness: `GET /api/admin/system/live-readiness`

## Studio Verification Map

- Chat streams through the protected assistant route.
- Research, image, video, music/audio, voice/TTS, adult text/image use `POST /api/admin/studio/execute`.
- Video jobs show job status and poll `pollUrl` until succeeded, completed, or failed.
- Image/video/audio/text artifacts render inline when a usable storage/result URL exists.
- Missing storage URL shows `Job created, output pending`.
- TTS plays returned `audioBase64`.
- STT uploads multipart media to the protected STT route and displays transcript output.
- Coding handoff creates a Workbench artifact/task and links the operator to Workbench.
- Avatar/talking video remains blocked because the backend route is marked missing.

## Workbench Verification Map

- Repos and branches load from GitHub-backed protected routes.
- Latest job is rehydrated into plan, file list, diff, checks, commit, PR, and deploy panels.
- The visible flow is staged: Start work, Approve changes, Run checks, Commit and push, Create PR, Merge when allowed, Deploy when allowed.
- GitHub tokens are never displayed in UI.
- Main push, merge, and deploy remain backend guarded by existing repo-workbench safety logic and environment flags.
- Logs are displayed in compact panels and not as the primary workflow surface.

## Settings / Provider Map

- GenX unlocks routed Studio execution.
- GitHub unlocks Workbench repo, branch, push, PR, merge, and deploy handoff.
- Storage unlocks artifacts, logs, generated reports, and previews.
- Redis unlocks queues, job coordination, and live job state.
- Firecrawl unlocks Research.
- Playwright unlocks browser verification.
- Webdock unlocks VPS status.
- MiniMax unlocks TTS/voice when configured through approved providers.
- Qwen, Hugging Face, Together, Groq, and OpenAI appear as optional providers based on the approved provider catalog.
- SMTP/email appears when environment configuration exists; otherwise it is a setup blocker only for email workflows.

## Operations Readiness Map

- Go-live panel answers whether the dashboard is ready for live testing.
- Blocking list includes storage writability, VPS/Webdock verification, provider test gaps, and research stack gaps.
- Optional list includes extra media providers, SMTP notifications, and merge/deploy automation flags.
- Runtime panels show VPS/services, storage root, research stack, usage, active jobs, recent failed jobs, recent artifacts, Workbench jobs, Studio jobs, approvals, and provider health.

## Remaining Blockers

- Real go-live still requires production environment keys and live route tests on the VPS.
- Avatar/talking video stays blocked until a protected backend route exists.
- Automatic artifact-to-memory promotion is visible but not automated until a scheduler/retention route is implemented.
- Merge and deploy remain intentionally guarded by backend environment flags.

## Exact VPS Verification Commands

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
systemctl status YOUR_APP_SERVICE
journalctl -u YOUR_APP_SERVICE -n 200 --no-pager
df -h
redis-cli ping
```

Unauthenticated protected API calls should return `401`. Repeat the route checks from an authenticated admin browser session for live verification.
