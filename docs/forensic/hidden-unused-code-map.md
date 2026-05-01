# Hidden / Unused Code Map

Date: 2026-05-01

## Overview

Pages hidden from nav or redirected to their canonical home. Code is kept — safe to delete only after the replacement page has been proven in production.

## Redirected Pages

| Old Path | Redirects To | Reason | Safe to Delete |
|----------|-------------|--------|---------------|
| `/admin/dashboard/workspace` | `/admin/dashboard` | Duplicate — multi-tab workspace merged into Overview + Repo Workbench | After v2 |
| `/admin/dashboard/build-studio` | `/admin/dashboard/repo-workbench` | Replaced by Repo Workbench | After v2 |
| `/admin/dashboard/monitor` | `/admin/dashboard/system-health` | Replaced by System Health | After v2 |
| `/admin/dashboard/readiness` | `/admin/dashboard/system-health` | Replaced by System Health | After v2 |
| `/admin/dashboard/operations` | `/admin/dashboard/system-health` | Replaced by System Health | After v2 |
| `/admin/dashboard/media-hub` | `/admin/dashboard/media-studio` | Replaced by Media Studio | After v2 |
| `/admin/dashboard/media` | `/admin/dashboard/media-studio` | Replaced by Media Studio | After v2 |
| `/admin/dashboard/music-studio` | `/admin/dashboard/media-studio` | Merged into Media Studio | After v2 |
| `/admin/dashboard/video` | `/admin/dashboard/media-studio` | Merged into Media Studio | After v2 |
| `/admin/dashboard/voice` | `/admin/dashboard/media-studio` | Merged into Media Studio | After v2 |
| `/admin/dashboard/genx-models` | `/admin/dashboard/ai-engine` | Duplicate — merged into AI Engine | After v2 |
| `/admin/dashboard/models` | `/admin/dashboard/ai-engine` | Merged into AI Engine > Models tab | After v2 |
| `/admin/dashboard/brain` | `/admin/dashboard/ai-engine` | Merged into AI Engine > Learning tab | After v2 |
| `/admin/dashboard/onboarding` | `/admin/dashboard/apps` | Replaced by Apps & Agents creation flow | After v2 |
| `/admin/dashboard/jobs` | `/admin/dashboard/artifacts` | Jobs tab lives inside Artifacts & Jobs | After v2 |

## Hidden Pages (Code Kept, Not in Nav)

| Path | Reason Hidden | Replacement | Safe to Delete |
|------|--------------|-------------|---------------|
| `/admin/dashboard/lab` | Placeholder — no real functionality | None yet | Yes (after confirming dead) |
| `/admin/dashboard/labs` | Placeholder — no real functionality | None yet | Yes (after confirming dead) |
| `/admin/dashboard/intelligence` | Placeholder / incomplete | AI Engine > Learning | After v2 |
| `/admin/dashboard/settings/aiva-avatar` | Aiva hidden until core system complete | Re-expose when Aiva enabled | No — keep code |
| `/admin/dashboard/deployments` | Deploy flow not production-ready | Will return when PR flow reliable | No — keep code |
| `/admin/dashboard/alerts` | Accessible via System Health | System Health > Providers | No — keep code |
| `/admin/dashboard/events` | Accessible via System Health | System Health | No — keep code |
| `/admin/dashboard/access` | Voice access — niche feature | Settings > integrations | No — keep code |
| `/admin/dashboard/integrations` | Accessible via Settings | Settings | No — keep code |

## Aiva Status

- `src/components/AivaAssistant.tsx` — code kept, not rendered
- `src/components/AivaCentralChat.tsx` — code kept, not rendered
- `src/app/api/admin/aiva/` — all API routes kept, not exposed
- `src/app/admin/dashboard/settings/aiva-avatar/` — page kept, not in nav
- Floating widget: removed from layout.tsx (disabled by default)
- Re-enable: set `NEXT_PUBLIC_AIVA_ENABLED=true` in `.env.local`

## Build Studio Tabs

All tabs under `src/app/admin/dashboard/build-studio/tabs/` are kept as source files.
The parent `build-studio/page.tsx` now redirects to Repo Workbench.
Individual tabs not independently routed — safe to archive after Repo Workbench proves complete.
