# Dashboard Go-Live Audit

Audit date: 2026-05-01. Method: static code inspection of dashboard pages, visible fetch calls, redirects, and backing API routes. No runtime browser session or live credentials were used, so anything requiring live provider/VPS execution remains unverified.

## Canonical Dashboard Sections

| Section | Page path | Purpose | Visible buttons / controls | API routes called | Status | Blockers | Fix required | Priority | Go-live |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Overview | `/admin/dashboard` | Summary of VPS, GenX, readiness, jobs, artifacts, apps. | Full audit links, quick links to AI Engine/Artifacts/Jobs/Readiness. | `/api/admin/vps`, `/api/admin/genx/status`, `/api/admin/dashboard`, `/api/admin/monitor/stats`, `/api/admin/truth`, `/api/admin/readiness`, `/api/admin/artifacts`, `/api/admin/jobs` | Partial | Aggregates many systems but cannot prove live provider/media/deploy success. | Keep as status surface; do not use as go-live proof. | High | PARTIAL |
| Command Center | `/admin/dashboard/command-center` | Operator command surface. | Needs runtime UI verification; page exists. | Static scan shows page exists; route calls require manual page-level check. | Partial | Not fully verified button-by-button in runtime. | Add Playwright/button-route audit and command execution tests. | High | PARTIAL |
| Repo Workbench | `/admin/dashboard/repo-workbench` | Repo import/edit/agent/check/commit/push/PR/deploy workbench. | Save token, validate, refresh repos, import/sync, pull, load files, create branch, save file, audit, plan, generate patch, run AI, refresh diff, apply patch, checks, custom command, commit, push, create PR, PR status, merge, deploy. | `/api/admin/repo-workbench/**` | Partial | Backend routes exist and tests pass, but live GitHub token, GenX, workspace permissions, command execution, PR/merge/deploy not live-verified. No workspace delete/reset/archive. | Live E2E on VPS with disposable repo; add delete/reset/archive or hide absent actions. | Critical | PARTIAL |
| AI Engine | `/admin/dashboard/ai-engine` | GenX/runtime truth/model/budget/learning status. | Configure links, refresh/runtime displays, budget/learning panels. | `/api/admin/genx/status`, `/api/admin/runtime-truth`, `/api/admin/models`, `/api/admin/budgets`, `/api/admin/learning` | Partial | Runtime truth uses static model count fallback; not all pages use same truth. | Make all model selectors consume `/api/admin/runtime-truth` or unified model endpoint. | Critical | PARTIAL |
| Media Studio | `/admin/dashboard/media-studio` | Images, video, voice, music, history. | Image generate, voice generate, history download. Video and music generation buttons disabled. | `/api/admin/genx/status`, `/api/admin/artifacts`, `/api/admin/workspace/run`, `/api/brain/tts` | Fail for media go-live | Image calls `/api/admin/workspace/run` not canonical `/api/brain/image`; video/music disabled; adult tab absent; model lists hard-coded and incomplete. | Wire image/video/music to real production routes and catalog; add async jobs/artifacts; hide unavailable tabs. | Critical | FAIL |
| Apps & Agents | `/admin/dashboard/apps`, `/admin/dashboard/app-agents` | App registry, app profiles, agents, products, safety, learning, intelligence. | Create/edit app, discover, save profile, test agent, products, strategies, safety, learning/intelligence. | `/api/admin/apps`, `/api/admin/app-profiles`, `/api/admin/app-discovery`, `/api/admin/agents`, `/api/admin/app-agents`, `/api/admin/app-health`, `/api/admin/app-safety`, `/api/admin/learning`, `/api/admin/apps/intelligence`, `/api/admin/brain/test` | Partial | App detail test still uses `/api/admin/brain/test`; per-app repo/tools/permissions not fully tied to Repo Workbench; multi-app deployment not proven. | Replace test endpoints with runtime execute routes; add app repo/tool permission model. | Critical | PARTIAL |
| Artifacts & Jobs | `/admin/dashboard/artifacts`, `/admin/dashboard/jobs` | Artifact library and job list. | Filter, open/download/delete artifact; jobs list. | `/api/admin/artifacts`, `/api/admin/jobs` | Partial | Artifact persistence exists but live media/repo artifact creation not fully E2E verified; jobs are DB/listed but not a universal async queue. | Standardize every heavy operation to job model with artifacts and retention. | High | PARTIAL |
| System Health | `/admin/dashboard/system-health` | VPS/jobs/apps/GenX health. | Refresh/status links. | `/api/admin/vps`, `/api/admin/jobs`, `/api/admin/app-health`, `/api/admin/genx/status` | Partial | Does not call `/api/admin/system/capabilities`; Webdock/VPS runtime not verified; health cannot prove deploy success. | Use single capabilities endpoint and live VPS checks. | Critical | PARTIAL |
| Settings | `/admin/dashboard/settings` | API keys, Aiva, GitHub, storage, adult, Webdock, provider vault. | Save/test multiple integrations; provider create/update/test. | `/api/admin/settings/integrations`, `/api/admin/settings/test-*`, `/api/admin/providers`, `/api/admin/providers/*/health-check` | Partial | Settings writes IntegrationConfig/GitHubConfig/provider records, but runtime consumers use mixed helpers. Some providers not in provider-config CoreProvider. | One source of truth for all keys and migrate GitHub PAT into same vault or clearly bridge. | Critical | PARTIAL |

## Hidden / Redirected / Duplicate Pages

| Old page | Current behavior | Redirect target / canonical replacement | Safe to delete later? | Still visible anywhere? |
| --- | --- | --- | --- | --- |
| `/admin/dashboard/workspace` | redirect | `/admin/dashboard` | Yes after inbound links removed | Should not be visible in canonical nav |
| `/admin/dashboard/build-studio` | page exists with legacy tabs | Repo Workbench / Command Center | No, still contains legacy GitHub/coding UI | Not canonical nav, but route still accessible |
| `/admin/dashboard/media` | page exists | Media Studio | Possibly after links removed | Not canonical nav |
| `/admin/dashboard/media-hub` | page exists | Media Studio / Artifacts | Possibly | Not canonical nav |
| `/admin/dashboard/music-studio` | page exists | Media Studio | Not until route migrated | Not canonical nav |
| `/admin/dashboard/video` | redirect | `/admin/dashboard/media-studio` | Yes | Not canonical nav |
| `/admin/dashboard/voice` | redirect | `/admin/dashboard/media-studio` | Yes | Not canonical nav |
| `/admin/dashboard/models` | page exists | AI Engine | Maybe after model UI consolidated | Not canonical nav |
| `/admin/dashboard/genx-models` | page exists | AI Engine | Maybe after model UI consolidated | Not canonical nav |
| `/admin/dashboard/brain` | redirect | `/admin/dashboard/ai-engine` | Yes | Not canonical nav |
| `/admin/dashboard/lab` | page exists | Command Center / AI Engine | Needs review | Not canonical nav |
| `/admin/dashboard/labs` | page exists | Command Center / AI Engine | Needs review | Not canonical nav |
| `/admin/dashboard/monitor` | page exists | System Health | Maybe after functionality merged | Not canonical nav |
| `/admin/dashboard/readiness` | page exists | System Health / master audit | Keep for now | Linked from Overview |
| `/admin/dashboard/operations` | page exists | Command Center / System Health | Needs review | Not canonical nav |
| `/admin/dashboard/events` | page exists | System Health / Artifacts & Jobs | Maybe | Not canonical nav |
| `/admin/dashboard/alerts` | page exists | System Health | Maybe | Not canonical nav |
| `/admin/dashboard/jobs` | page exists | Artifacts & Jobs | Keep or merge under Artifacts | Linked from Overview |
| `/admin/dashboard/system` | redirect | `/admin/dashboard/system-health` | Yes | Not canonical nav |
| `/admin/dashboard/access` | redirect | `/admin/dashboard/settings` | Yes | Not canonical nav |
| `/admin/dashboard/onboarding` | page exists | Settings / Command Center | Needs review | Not canonical nav |
| Aiva assistant widgets | disabled by default in layout | `NEXT_PUBLIC_AIVA_ENABLED=true` | Not delete | Hidden by default |

## Primary dashboard blockers

1. Media Studio is not live-ready: video/music disabled, image route not canonical, no adult tab.
2. Runtime truth exists but not consistently consumed across visible surfaces.
3. Legacy Build Studio/Cockpit and Repo Workbench overlap.
4. Live provider, VPS, GitHub, deploy and model quota checks are not verified.
5. Visible pages still call test endpoints such as `/api/admin/brain/test`.
