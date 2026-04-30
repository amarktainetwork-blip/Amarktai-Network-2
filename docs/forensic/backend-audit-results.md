# Backend Forensic Audit Results

Date: 2026-04-30
Branch: backend-forensic-fix-genx-media-repos

## Phase 1 Command Results

Raw logs were saved beside this file:

- `docs/forensic/npm-ci.log`
- `docs/forensic/prisma-generate.log`
- `docs/forensic/lint.log`
- `docs/forensic/test.log`
- `docs/forensic/build.log`
- `docs/forensic/phase1-command-summary.json`

Initial audit command results:

- `npm ci`: PASS
- `npx prisma generate`: PASS
- `npm run lint`: PASS with two existing `<img>` warnings in dashboard creator/test UI
- `npm test`: PASS, 41 files / 1367 tests at audit start
- `npm run build`: PASS, production build completed

Final verification after backend fixes:

- `npm run typecheck`: PASS
- `npm run lint`: PASS with the same two `<img>` warnings
- `npm test`: PASS, 42 files / 1370 tests
- `npm run build`: PASS, 197 static pages generated

## Forensic Findings

- GenX status incorrectly treated configured URL as available. This could make the dashboard imply GenX was live without a successful catalog probe.
- `/api/admin/genx/status` returned `configured` equal to `available`, losing the distinction between setup and live health.
- `/api/brain/video-generate` returned a storyboard as a successful video-plan response when no renderer was configured. It now returns a truthful video generation blocker with `generation_available:false`.
- `/api/brain/video` was planning-only but did not try GenX first. It now attempts GenX planning before direct provider fallback and includes execution metadata.
- Music Studio already supported blueprint-only fallback, but status language did not clearly separate real audio from blueprint availability. It now reports real audio separately and can prefer GenX audio before Suno/Replicate.
- Repo Workbench lacked a dedicated backend prerequisite status route. It now reports git, gh, token, storage, GenX, and action capability blockers.
- Repo Workbench mutating/AI routes now validate prerequisites before running import, audit, plan, patch, run, commit, push, and PR actions.
- Deploy configuration had healthcheck/service drift: Docker used a protected heartbeat route and the deploy script used `admin` ownership while the service runs as `www-data`.

## Backend Fixes Applied

- Added `GET /api/admin/system/capabilities`.
- Added `GET /api/admin/repo-workbench/status`.
- Added shared provider config helpers in `src/lib/provider-config.ts`.
- Hardened provider key lookup so placeholder/test/demo keys are not treated as configured.
- Expanded provider vault/env support for `genx`, `openai`, `groq`, `gemini`, `replicate`, `suno`, and `github`.
- Fixed GenX status to return `configured`, `available`, `apiUrl`, `error`, and `modelCount` based on a real catalog probe.
- Updated workspace execution to use async GenX health instead of config-only sync status.
- Made video generation return HTTP 501 with a clear blocker when no real renderer is available.
- Added backend truth tests for GenX configured-vs-available and no-provider video generation.
- Fixed Docker app healthcheck to use `GET /api/health/ping`.
- Added canonical `deploy/amarktai-web.service`.
- Updated `scripts/deploy_vps.sh` to use `www-data`, fail on Prisma/app health failures, copy standalone static assets, and verify `/api/health/ping`.
- Added `docs/deploy/backend-deploy-checklist.md`.

## Remaining Live Setup Requirements

- Live GenX availability requires valid `GENX_API_URL` and `GENX_API_KEY`, plus a responding catalog endpoint.
- Real video generation requires GenX video support or another supported renderer such as Replicate with a valid key.
- Real music audio requires GenX audio support, Suno, or Replicate. Without those, Music Studio truthfully returns `blueprint_only` and `audioUrl:null`.
- Repo Workbench import requires server `git` and writable storage. Push/PR require a GitHub token and repository permission.
- PR creation/merge from this environment may be blocked until the GitHub account/token has write access to `sharetheherbman-debug/AmarktaiNetwork2`.

## Verdict

Backend forensic fix verification is PASS locally. This is not a redeploy confirmation; VPS runtime still needs live key and service verification.
