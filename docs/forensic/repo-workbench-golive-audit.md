# Repo Workbench / Coding Agent Go-Live Audit

The Repo Workbench is the strongest newly completed area, but it still needs live E2E verification on the VPS with a disposable repo and real GitHub token/GenX key.

| Flow | Endpoint | UI button | Status | Blocker | Fix required |
| --- | --- | --- | --- | --- | --- |
| GitHub token validation | `/api/admin/repo-workbench/github/status`, `/github/token` | Save token, Validate | Partial | Live PAT not verified; GitHubConfig separate from IntegrationConfig | Live PAT test; unify vault |
| Repo list | `/github/repos`, `/repos` | Refresh repos | Partial | Requires live PAT | E2E with owner + org repos |
| Branch list | `/github/branches`, `/[workspaceId]/branches` | Not always surfaced as full selector | Partial | Local/remote branch UX limited | Add branch picker if needed |
| Import repo | `/import` | Import/sync | Partial | Requires server git and writable workspace | VPS E2E clone |
| Workspace status | `/[workspaceId]/status` | implicit | Partial | Not all fields surfaced | Add status card details |
| File tree | `/[workspaceId]/tree` | Load files | Partial | large/binary excludes okay; live repo not tested | E2E with real repo |
| File viewer | `/[workspaceId]/file` | file clicks | Partial | secret/binary rules present | E2E path traversal test |
| Model/tier selector | `/models` | not fully exposed in current page | Partial/Missing UX | Quality/model choice not obvious | Add Best/Good/Balanced/Cheap visible selector or hide claim |
| Task prompt | `/run`, `/audit`, `/plan`, `/patch` | Audit/Plan/Generate patch/Run AI | Partial | Live GenX/direct provider not verified | E2E agent task |
| Agent run | `/run` | Run AI | Partial | AI output parser may fail on malformed diff | Add robust patch parser tests |
| Diff preview | `/diff` | Refresh diff | Partial | Patch proposal diff vs local diff can confuse | Separate proposal diff and worktree diff |
| Apply diff | `/apply-patch` | Apply patch | Partial | Good confirm and path checks; live patch not tested | E2E with simple patch |
| Run checks | `/run`, `/run-check`, `/jobs`, `/jobs/[id]/logs` | check buttons | Partial | Not truly async streaming; returns after process | Add background queue and polling for long checks |
| Commit | `/commit` | Commit | Partial | Requires patchId; manual file edits without patch may not commit | Allow commit current changes with confirmation |
| Push | `/push` | Push | Partial | Live PAT and branch protection not verified | E2E push to non-main branch |
| PR creation | `/pr` | Create PR | Partial | Live PAT not verified | E2E PR creation |
| PR status | `/pr-status` | PR status | Partial | Checks pass detection is shallow/unknown | Pull combined check runs/statuses |
| Merge | `/merge` | Merge | Guarded | Disabled unless env enabled | Keep disabled until checks integration exists |
| Deploy | `/deploy`, `/deploy/status` | Deploy | Guarded | Disabled unless env enabled; local bash script only | Live deploy dry-run/log test |
| Delete/remove workspace | none found | none | Missing | Cannot clean workspace from UI | Add guarded delete/archive |
| Reset workspace | none found | none | Missing | Cannot restore clean checkout | Add guarded reset/clean with confirmations |
| Archive workspace | none found | none | Missing | No lifecycle management | Add archive status |
| Job logs | `/jobs/[jobId]/logs` | Logs panel | Partial | Command logs persist, AI run logs are inline | Normalize all actions to job logs |

## Direct answers

- Can a user fix an app repo from the dashboard tonight? **Maybe for a simple repo only after live GenX/PAT/workspace checks pass. Not guaranteed.**
- Can a user safely push a branch? **Structurally yes, live token/branch protection unverified.**
- Can a user open PR? **Structurally yes, live token unverified.**
- Can a user deploy? **No for go-live; deploy is guarded and not live-verified.**

Recommended UX simplification: keep the current command-center layout, but add a top-level four-step flow: Connect -> Import -> Ask agent -> Review/ship, with advanced file explorer/logs collapsed by default.
