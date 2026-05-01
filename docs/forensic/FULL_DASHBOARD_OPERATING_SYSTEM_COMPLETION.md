# Full Dashboard Operating System Completion

Branch: `finish-full-dashboard-operating-system`

## COMPLETED

- Added a live runtime readiness endpoint: `GET /api/admin/system/live-readiness`.
- Added a Live Readiness tab to System Health.
- Added Repo Workbench Safe Test flow: `POST /api/admin/repo-workbench/safe-test`.
- Added runtime-backed Media Studio model listing: `GET /api/admin/media-studio/models`.
- Updated Media Studio image model selector to use runtime truth instead of a hardcoded three-model list.
- Added artifact persistence attempt after successful image generation.
- Kept video, music, adult, streaming voice, deploy, and merge behind hard gates unless their runtime checks pass.
- Added structural tests for readiness, safe test, and media runtime model wiring.

## WORKING END-TO-END

| Capability | Status | Model/provider | Evidence | Blocker |
| --- | --- | --- | --- | --- |
| Repo Workbench import/browse/edit/patch/commit/push/PR | Verification candidate | GenX first, direct provider fallback | Existing production-ready routes plus status gates | Requires live GitHub PAT and provider key verification on VPS |
| Repo Workbench safe test | Working local flow | Local git | Creates safe workspace, branch, file, commit, logs/artifact | Remote push/PR remains simulated unless a dedicated safe-test repo is configured |
| Image generation | Verification candidate | Runtime image model selector | UI calls `/api/brain/image`; model selector comes from `/api/admin/media-studio/models`; successful output is saved to artifacts where storage accepts it | Requires live provider key/quota |
| Batch TTS | Verification candidate | Runtime voice model selector | UI calls `/api/brain/tts`; streaming remains explicitly pending | Requires live TTS provider key/quota |
| Artifacts & Jobs | Partial working | Local/DB storage + queue status | Readiness checks storage and queue; image route attempts artifact save | Queue may be optional/unavailable without Redis |

## DISABLED WITH REASON

| Area | Status | Reason |
| --- | --- | --- |
| Video generation | Disabled unless live video model passes | Requires real async submit/poll/artifact verification before enabling expensive renders |
| Music generation | Disabled unless live music/audio provider passes | No fake audio output exposed; needs GenX/Lyria/Suno/Replicate route verification |
| Adult mode | Hidden/disabled unless all gates pass | Requires global flag, app flag, admin permission, specialist provider, provider test, and safety exclusions |
| Streaming voice | Disabled | Batch TTS can run; realtime session needs a running realtime service |
| Deploy | Disabled by default | Requires `ENABLE_DEPLOY_ACTIONS=true` and backend deploy gates |
| Merge | Disabled by default | Requires `REPO_WORKBENCH_ALLOW_MERGE=true`, clean PR state, and checks |
| MCP/tool layer | Pending/partial | Dashboard reports pending state; no fake MCP server exposure |
| Auto-learning | Pending | Manual learning/crawler pieces exist, but automatic daily learning remains disabled until verified |

## LEFT TO DO

- Run live VPS readiness and capture exact PASS/FAIL for GenX, GitHub, storage, queue, DB, and media providers.
- Configure a dedicated safe-test GitHub repository if real safe-test push/PR should run automatically.
- Complete real async video job execution once a live video model/provider is confirmed.
- Complete real music generation once a live provider and polling/artifact path are confirmed.
- Build the minimum MCP tool registry with per-app/per-agent permissions and logs.
- Finish app-agent scoped memory and budget enforcement with live DB/API verification.

## GO/NO-GO

NO-GO for full platform live launch until the Live Readiness tab reports no FAIL items on the VPS and live provider/quota checks pass.

GO for dashboard live verification candidate: the dashboard now exposes truthful readiness, safe Repo Workbench testing, runtime media model truth, and hard disables for incomplete or expensive flows.

## LIVE VERIFICATION CHECKLIST

- Open `/admin/dashboard/system-health` and run Live Readiness.
- Confirm GenX key configured and live catalogue count is greater than zero.
- Confirm GitHub PAT configured and authenticated.
- Run Repo Workbench Safe Test.
- Import a real repo, create a branch, generate a diff, apply it, commit, push, and open PR.
- Generate one real image and confirm it appears in Artifacts & Jobs.
- Generate one batch TTS artifact if provider is configured.
- Confirm video/music/adult/deploy stay disabled unless gates pass.
- Run `npm run lint`, `npm test`, and `npm run build` before deploy.

## TEST RESULTS

- `npm ci`: PASS after rerun. First attempt collided with a parallel `npx prisma generate` touching `node_modules/prisma`; sequential rerun passed with 0 vulnerabilities.
- `npx prisma generate`: PASS.
- `npm run lint`: PASS with existing warnings in Build Studio:
  - `CreatorStudioTab.tsx` has one `react-hooks/exhaustive-deps` warning and one `<img>` warning.
  - `TestAITab.tsx` has one `<img>` warning.
- `npm test`: PASS on rerun, 44 test files and 1416 tests passed. First post-`npm ci` run had three 5-second import timeouts during cold start; immediate rerun passed without code changes.
- `npm run build`: PASS with `NEXT_PRIVATE_BUILD_WORKER=0`. Standard worker mode compiled and generated output but hung during worker shutdown on Windows; disabling the build worker completed the same compile/type/static generation path successfully.
