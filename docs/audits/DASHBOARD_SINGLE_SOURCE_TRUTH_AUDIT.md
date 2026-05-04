# Dashboard Single Source of Truth Audit

**Created:** 2026-05-04
**Branch:** `copilot/forensic-one-dashboard-one-workbench`
**Purpose:** Forensic cleanup — one dashboard direction, one Repo Workbench, one source of truth.

---

## Canonical Dashboard Routes

| Route | Purpose |
|-------|---------|
| `/admin/dashboard/command-center` | **Primary landing.** Operator overview, live systems, quick-launch links. |
| `/admin/dashboard/live-readiness` | Real-time go-live blockers and connected systems. |
| `/admin/dashboard/repo-workbench` | **Canonical Repo Workbench** — GitHub → plan → patch → checks → PR. |
| `/admin/dashboard/ai-engine/hub` | AI Engine hub (all AI capabilities). |
| `/admin/dashboard/media-studio` | Media generation (image, video, TTS, audio). |
| `/admin/dashboard/apps` | Apps & Agents management. |
| `/admin/dashboard/artifacts` | Artifact gallery and job results. |
| `/admin/dashboard/system-health` | System health, tool registry, MCP tab. |
| `/admin/dashboard/settings` | **Only** provider key/config setup surface. |

**Total visible nav items: 9**

---

## Redirect Aliases (no visible nav item)

| Route | Redirects To |
|-------|-------------|
| `/admin/dashboard` | `/admin/dashboard/command-center` (redirect alias only — NOT a nav item) |

---

## Deleted Routes

| Route | Status | Reason |
|-------|--------|--------|
| `/admin/dashboard/repo-workbench/simple` | **DELETED** | Merged into canonical `/admin/dashboard/repo-workbench`. |

---

## Hidden / Post-Launch Routes (not in nav, pages exist)

These pages exist but redirect to canonical destinations. They are not in the nav and not actively promoted.

| Route | Redirects To |
|-------|-------------|
| `/admin/dashboard/access` | `/admin/dashboard/settings` |
| `/admin/dashboard/deployments` | `/admin/dashboard/repo-workbench` |
| `/admin/dashboard/emotions` | `/admin/dashboard/system-health` |
| `/admin/dashboard/events` | `/admin/dashboard/system-health` |
| `/admin/dashboard/integrations` | `/admin/dashboard/settings` |
| `/admin/dashboard/intelligence` | `/admin/dashboard/ai-engine` |
| `/admin/dashboard/voice` | `/admin/dashboard/media-studio` |
| `/admin/dashboard/genx-models` | `/admin/dashboard/ai-engine` |
| `/admin/dashboard/brain` | `/admin/dashboard/ai-engine` |
| `/admin/dashboard/build-studio` | `/admin/dashboard/repo-workbench` |
| `/admin/dashboard/workspace` | `/admin/dashboard` |
| `/admin/dashboard/settings/aiva-avatar` | `/admin/dashboard/settings` |

---

## Canonical Repo Workbench Flow

`src/app/admin/dashboard/repo-workbench/page.tsx`

The canonical workbench implements this exact flow:

1. GitHub connection status (from Settings/vault token — no PAT input in Workbench)
2. Repo selector from connected GitHub account
3. Branch selector
4. Import / clone workspace
5. Coding model selector
6. Tell Aiva what to change (prompt)
7. Plan
8. Generate diff (patch)
9. Explicit approval checkbox before write/Git actions
10. Apply patch
11. Run lint / test / build checks
12. Commit
13. Push
14. Create PR
15. PR link/status
16. Logs panel
17. Reset/delete workspace with approval confirmation

### Removed Legacy Clutter (no longer in canonical page)

- Manual GitHub PAT input field
- `AGENT_PRESETS` / `genx_best` / GenX Best preset cards
- Safe Repo Workbench Test panel
- File Explorer
- File Viewer / Editor
- Custom command runner
- Merge button
- Deploy section / `ENABLE_DEPLOY_ACTIONS`

---

## Canonical APIs for Runtime Truth / Readiness / Tool Registry

| API | Purpose |
|-----|---------|
| `GET /api/admin/runtime-truth` | Single source of truth for provider keys, capability status, genx. |
| `GET /api/admin/live-readiness` | System live readiness — blockers, systems, metrics, links. |
| `GET /api/admin/system/live-readiness` | System-level live readiness. |
| `GET /api/admin/tool-registry` | Internal tool registry (MCP tab in System Health). |
| `GET /api/admin/repo-workbench/github/status` | GitHub connection status from vault. |
| `GET /api/admin/repo-workbench/github/repos` | Repos from connected GitHub account. |
| `GET /api/admin/repo-workbench/github/branches` | Branches for selected repo. |
| `GET /api/admin/repo-workbench/models` | Available coding models. |
| `POST /api/admin/repo-workbench/import` | Import/clone workspace. |
| `POST /api/admin/repo-workbench/[workspaceId]/plan` | Generate plan. |
| `POST /api/admin/repo-workbench/[workspaceId]/patch` | Generate patch/diff. |
| `POST /api/admin/repo-workbench/[workspaceId]/apply-patch` | Apply patch (requires approval). |
| `POST /api/admin/repo-workbench/[workspaceId]/run-check` | Run lint/test/build. |
| `POST /api/admin/repo-workbench/[workspaceId]/commit` | Commit (requires approval). |
| `POST /api/admin/repo-workbench/[workspaceId]/push` | Push (requires approval). |
| `POST /api/admin/repo-workbench/[workspaceId]/pr` | Create PR (requires approval). |
| `POST /api/admin/repo-workbench/[workspaceId]/reset` | Reset workspace (requires approval). |
| `DELETE /api/admin/repo-workbench/[workspaceId]` | Delete workspace (requires approval). |

---

## Settings as Only Config Surface

Settings (`/admin/dashboard/settings`) is the **only** place for:

- GitHub token (vault-backed)
- AI/provider keys (GenX, OpenAI, Anthropic, xAI, etc.)
- Adult mode provider/model/test config
- Firecrawl, Mem0, Webdock
- Storage/integrations
- Provider vault settings

No dashboard feature page may contain provider key/password setup forms except Settings.

---

## Proof Commands

```bash
# Verify no /simple references remain in source
grep -RIn --exclude-dir=node_modules --exclude-dir=.next "/admin/dashboard/repo-workbench/simple" src scripts docs
# Expected: no output

# Verify /simple page file is deleted
ls src/app/admin/dashboard/repo-workbench/simple/ 2>&1
# Expected: ls: cannot access ... No such file or directory

# Run targeted tests
npx vitest run \
  src/lib/__tests__/dashboard-golive.test.ts \
  src/lib/__tests__/repo-workbench-production.test.ts \
  src/lib/__tests__/one-source-of-truth.test.ts

# Lint
npm run lint

# Build
npm run build
```

---

## Remaining Blockers / Post-Launch Items

- Deploy functionality is intentionally disabled in Repo Workbench until PR/merge readiness is verified. A single approved deploy path must be defined post-launch before re-enabling.
- MCP external integration: currently shows "Internal Tool Registry" only. External MCP wiring is a separate post-launch task.
- Some non-canonical pages (build-studio tabs, labs, onboarding, monitor, etc.) exist but do not appear in nav. They should be evaluated post-launch for deletion or promotion.
