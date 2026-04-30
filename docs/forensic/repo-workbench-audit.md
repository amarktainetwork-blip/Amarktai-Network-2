# Repo Workbench Production Audit

## Scope

Audited and hardened:

- `src/app/admin/dashboard/repo-workbench/page.tsx`
- `src/app/admin/dashboard/build-studio/**`
- `src/app/api/admin/repo-workbench/**`
- `src/app/api/admin/github/**`
- `src/lib/repo-workbench.ts`
- `src/lib/repo-workbench-status.ts`
- `src/lib/workspace-security.ts`
- `src/lib/workspace-executor.ts`
- `src/lib/provider-config.ts`
- `src/lib/genx-client.ts`
- `src/lib/brain.ts`
- `scripts/deploy_vps.sh`
- `deploy/amarktai-web.service`
- `docker-compose.yml`

## Route Inventory

| Route | Status | Notes |
| --- | --- | --- |
| `GET /api/admin/repo-workbench/status` | working | Full capability truth, blockers, warnings, workspace root, GitHub, AI, merge, deploy flags. |
| `GET /api/admin/repo-workbench/github/status` | working | Validates masked GitHub token. |
| `POST /api/admin/repo-workbench/github/token` | working | Stores and validates token. |
| `GET /api/admin/repo-workbench/github/repos` | working | Lists accessible repos. |
| `GET /api/admin/repo-workbench/github/branches` | working | Lists GitHub branches. |
| `GET /api/admin/repo-workbench/github/prs` | working | Lists open PRs. |
| `GET /api/admin/repo-workbench/repos` | working | Lists workspaces and token repo data. |
| `POST /api/admin/repo-workbench/import` | working | Accepts `repoUrl` or `repoFullName`; validates prerequisites. |
| `POST /api/admin/repo-workbench/[workspaceId]/pull` | working | Refuses dirty worktree unless forced. |
| `GET /api/admin/repo-workbench/[workspaceId]/status` | working | Returns branch, commit, dirty files, remotes. |
| `GET /api/admin/repo-workbench/[workspaceId]/branches` | working | Lists local and remote branches. |
| `POST /api/admin/repo-workbench/[workspaceId]/branch` | working | Creates guarded work branch. |
| `GET /api/admin/repo-workbench/[workspaceId]/tree` | working | Safe text tree. |
| `GET /api/admin/repo-workbench/[workspaceId]/file` | working | Safe text read. |
| `PUT /api/admin/repo-workbench/[workspaceId]/file` | working | Guarded file edit with diff artifact. |
| `POST /api/admin/repo-workbench/[workspaceId]/audit` | working | AI audit through existing execution layer. |
| `POST /api/admin/repo-workbench/[workspaceId]/plan` | working | AI plan through existing execution layer. |
| `POST /api/admin/repo-workbench/[workspaceId]/patch` | working | Patch proposal only; no auto-apply. |
| `POST /api/admin/repo-workbench/[workspaceId]/apply-patch` | working | Explicit confirmation and path validation. |
| `GET /api/admin/repo-workbench/[workspaceId]/diff` | working | Diff preview. |
| `POST /api/admin/repo-workbench/[workspaceId]/run` | working | Runs AI pipeline or approved command. |
| `POST /api/admin/repo-workbench/[workspaceId]/run-check` | working | Backward-compatible check runner. |
| `GET /api/admin/repo-workbench/jobs/[jobId]` | working | Job status. |
| `GET /api/admin/repo-workbench/jobs/[jobId]/logs` | working | Redacted persisted logs. |
| `POST /api/admin/repo-workbench/[workspaceId]/commit` | working | Requires patch, branch, message, confirmation. |
| `POST /api/admin/repo-workbench/[workspaceId]/push` | working | Requires token and blocks main push by default. |
| `POST /api/admin/repo-workbench/[workspaceId]/pr` | working | Creates PR through GitHub API. |
| `GET /api/admin/repo-workbench/[workspaceId]/pr-status` | working | Returns PR mergeability/blocker. |
| `POST /api/admin/repo-workbench/[workspaceId]/merge` | guarded | Disabled unless `REPO_WORKBENCH_ALLOW_MERGE=true`. |
| `POST /api/admin/repo-workbench/[workspaceId]/deploy` | guarded | Disabled unless `REPO_WORKBENCH_ALLOW_DEPLOY=true`. |
| `GET /api/admin/repo-workbench/[workspaceId]/deploy/status` | working | Reads deploy job/log status. |

## UI Button Audit

| Button | Endpoint | Status |
| --- | --- | --- |
| Save token | `POST /github/token` | wired |
| Validate | `GET /github/status` | wired |
| Refresh repos | `GET /repos` | wired |
| Import/sync | `POST /import` | wired |
| Pull latest | `POST /[workspaceId]/pull` | wired |
| Load files | `GET /[workspaceId]/tree` | wired |
| Create branch | `POST /[workspaceId]/branch` | wired |
| Save file | `PUT /[workspaceId]/file` | wired |
| Audit | `POST /[workspaceId]/audit` | wired |
| Plan | `POST /[workspaceId]/plan` | wired |
| Generate patch | `POST /[workspaceId]/patch` | wired |
| Run AI | `POST /[workspaceId]/run` | wired |
| Refresh diff | `GET /[workspaceId]/diff` | wired |
| Apply patch | `POST /[workspaceId]/apply-patch` | wired |
| Checks | `POST /[workspaceId]/run` | wired |
| Commit | `POST /[workspaceId]/commit` | wired |
| Push | `POST /[workspaceId]/push` | wired |
| Create PR | `POST /[workspaceId]/pr` | wired |
| PR status | `GET /[workspaceId]/pr-status` | wired |
| Merge | `POST /[workspaceId]/merge` | guarded |
| Deploy | `POST /[workspaceId]/deploy` | guarded |

## Fixes Applied

- Added `src/lib/workspace-security.ts` as the path, branch, command, and log redaction source of truth.
- Moved Repo Workbench root to `REPO_WORKSPACE_ROOT` with default `/var/amarktai/workspaces`.
- Added complete Repo Workbench status fields and blockers.
- Added GitHub token/status/repos/branches/PR routes.
- Added pull, workspace status, branches, branch creation, diff, job status/logs, PR status, merge, deploy, and deploy status routes.
- Added guarded file editing.
- Expanded command runner with approved commands and persisted logs.
- Hardened patch application path validation.
- Blocked direct main push by default.
- Added git identity fallback for commits.
- Replaced the small Repo Workbench UI with a usable dashboard section where every action maps to a real route.
- Added tests for path traversal, command allowlist, branch/repo sanitization, and page wiring.

## Final Verification

| Command | Result |
| --- | --- |
| `npm ci` | PASS, 0 vulnerabilities |
| `npx prisma generate` | PASS |
| `npm run lint` | PASS, two existing `<img>` warnings outside Repo Workbench |
| `npm test` | PASS, 43 files / 1374 tests |
| `npm run build` | PASS, 202 static pages |

## Remaining Live Setup

- Configure GitHub token in dashboard.
- Configure GenX or direct coding provider for AI patching.
- Ensure `/var/amarktai/workspaces` exists and is writable by the app user.
- Enable merge/deploy only with explicit env flags.

## Verdict

Repo Workbench implementation passes local verification and is ready for PR review. Do not mark VPS deployment safe until live token, workspace permissions, provider status, and deploy script execution are verified on the VPS.
