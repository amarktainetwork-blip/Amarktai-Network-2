# Dashboard AI System Consolidation Audit

Date: 2026-05-01
Branch: copilot/fix-amarktai-network-dashboard

## Audit Summary

All pages under `src/app/admin/dashboard/` audited for purpose, real API calls, button status, and action.

---

## Page Inventory

| Old Path | Purpose | Real API Calls | Buttons Real/Dead | Status | New Home | Action |
|----------|---------|----------------|-------------------|--------|----------|--------|
| `/admin/dashboard` (page.tsx) | Overview / truth dashboard | `/api/admin/vps`, `/api/admin/genx/status`, `/api/admin/dashboard`, `/api/admin/truth`, `/api/admin/readiness`, `/api/admin/storage`, `/api/admin/jobs` | Refresh: real | Works | Overview | KEEP |
| `/admin/dashboard/workspace` | Old Workspace (multi-tab) | `/api/admin/workspace/config`, `/api/admin/workspace/run` | Tab buttons: real but duplicated by other sections | Duplicate | — | REDIRECT → /admin/dashboard |
| `/admin/dashboard/build-studio` | Build Studio (old multi-tab) | Various (imports tabs) | Mostly dead/duplicate | Duplicate | — | REDIRECT → /admin/dashboard/repo-workbench |
| `/admin/dashboard/repo-workbench` | Coding agent workspace | `/api/admin/repo-workbench/*`, `/api/admin/github/*` | Real production buttons | Works | Repo Workbench | KEEP |
| `/admin/dashboard/ai-engine` | AI Engine | `/api/admin/genx/status`, `/api/admin/models` | Refresh: real | Rewritten with 7 tabs | AI Engine | KEEP (rewritten) |
| `/admin/dashboard/genx-models` | GenX Models (duplicate of AI Engine) | Redirects to ai-engine | — | Duplicate | — | REDIRECT → /admin/dashboard/ai-engine |
| `/admin/dashboard/models` | Models page | `/api/admin/models` | — | Duplicate of AI Engine | — | REDIRECT → /admin/dashboard/ai-engine |
| `/admin/dashboard/media-hub` | Old Media Hub | Various | Stale | Duplicate | — | REDIRECT → /admin/dashboard/media-studio |
| `/admin/dashboard/media` | Old Media | Various | Stale | Duplicate | — | REDIRECT → /admin/dashboard/media-studio |
| `/admin/dashboard/music-studio` | Music Studio | `/api/brain/music*` | Mix of real/placeholder | Merged | — | REDIRECT → /admin/dashboard/media-studio |
| `/admin/dashboard/video` | Video page | `/api/brain/video*` | Honest blockers | Merged | — | REDIRECT → /admin/dashboard/media-studio |
| `/admin/dashboard/voice` | Voice TTS | `/api/brain/tts*` | Mix | Merged | — | REDIRECT → /admin/dashboard/media-studio |
| `/admin/dashboard/apps` | App list | `/api/admin/apps` | Create/view: real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/apps/[slug]` | App detail | `/api/admin/apps/[slug]` | Real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/apps/new` | Create app | `/api/admin/apps` POST | Real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/app-agents` | Agent list | `/api/admin/app-agents` | Real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/app-agents/[slug]` | Agent detail | `/api/admin/app-agents/[slug]` | Real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/app-agents/new` | Create agent | `/api/admin/app-agents` POST | Real | Works | Apps & Agents | KEEP |
| `/admin/dashboard/artifacts` | Artifacts library | `/api/admin/artifacts` | Real | Works | Artifacts & Jobs | KEEP |
| `/admin/dashboard/jobs` | Jobs list (duplicate of artifacts) | `/api/admin/jobs` | Real | Duplicate | — | REDIRECT → /admin/dashboard/artifacts |
| `/admin/dashboard/monitor` | Monitor | `/api/admin/monitor`, `/api/admin/vps` | Real | Replaced by System Health | — | REDIRECT → /admin/dashboard/system-health |
| `/admin/dashboard/system` | System info | Various | Mix | Replaced by System Health | — | KEEP (sub-route ok) |
| `/admin/dashboard/readiness` | Readiness check | `/api/admin/readiness` | Real | Replaced by System Health | — | REDIRECT → /admin/dashboard/system-health |
| `/admin/dashboard/operations` | Operations | Various | Real | Replaced by System Health | — | REDIRECT → /admin/dashboard/system-health |
| `/admin/dashboard/deployments` | Deployments | `/api/admin/deploy` | Real but disabled | Keep as hidden | — | KEEP (sub-route ok, not in nav) |
| `/admin/dashboard/events` | Events log | `/api/admin/events` | Real | Not in main nav | — | KEEP (sub-route ok) |
| `/admin/dashboard/alerts` | Alerts | `/api/admin/alerts` | Real | Not in main nav | — | KEEP (sub-route ok) |
| `/admin/dashboard/brain` | Brain/learning | `/api/admin/brain/*` | Real | Merged into AI Engine > Learning | — | REDIRECT → /admin/dashboard/ai-engine |
| `/admin/dashboard/lab` | Lab | `/api/admin/labs` | Placeholder | Hidden | — | DELETE LATER |
| `/admin/dashboard/labs` | Labs | `/api/admin/labs` | Placeholder | Hidden | — | DELETE LATER |
| `/admin/dashboard/intelligence` | Intelligence | `/api/admin/apps/intelligence` | Placeholder | Hidden | — | DELETE LATER |
| `/admin/dashboard/onboarding` | Onboarding assistant | Various | Mix | Replaced by Apps creation flow | — | REDIRECT → /admin/dashboard/apps |
| `/admin/dashboard/access` | Voice/access settings | `/api/admin/voice-access-settings` | Real | Hidden | — | KEEP (sub-route ok) |
| `/admin/dashboard/integrations` | Integrations | `/api/admin/integrations` | Real | Merged into Settings | — | KEEP (sub-route ok) |
| `/admin/dashboard/settings` | Admin settings | `/api/admin/settings/*` | Real | Settings | KEEP | KEEP |
| `/admin/dashboard/settings/AmarktAI Assistant-avatar` | AmarktAI Assistant avatar config | `/api/admin/AmarktAI Assistant/avatar-config` | Real | Hidden (AmarktAI Assistant hidden) | — | KEEP (code kept, not in nav) |

---

## Nav Change Summary

### Removed from Nav
Workspace, AmarktAI Assistant, Music Studio, Image Studio, Video Studio, Workflows, Monitor, Deployments, AI Engine (old), GenX Models, Models, Media Hub, Media, Music Studio, Video, Voice, Jobs, Brain, Onboarding, Access, Integrations, Labs, Lab, Intelligence, Operations, Readiness, Events, Alerts, System

### New Nav (9 sections)
1. Overview
2. Command Center (new)
3. Repo Workbench (kept)
4. AI Engine (rewritten)
5. Media Studio (new, merges video/voice/music/images)
6. Apps & Agents (kept)
7. Artifacts & Jobs (kept, jobs redirected here)
8. System Health (new, replaces monitor/readiness/operations)
9. Settings (kept)

### AmarktAI Assistant Status
- All AmarktAI Assistant pages and components: code kept, not exposed in nav
- Floating AmarktAI AssistantAssistant widget: disabled by default
- Re-enable: set `NEXT_PUBLIC_AmarktAI Assistant_ENABLED=true`
