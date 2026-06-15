# Dashboard Runtime Truth

Date: 2026-06-15

Every page under `src/app/admin` is listed below.

| Page | Route | Classification | Connected runtime | Missing backend or limitation |
| --- | --- | --- | --- | --- |
| Admin login | `/admin/login` | CANONICAL | `/api/admin/login` | Requires production session and HTTPS configuration. |
| Dashboard redirect | `/admin/dashboard` | CANONICAL | Redirects to Command Center. | None. |
| Command Center | `/admin/dashboard/command` | CANONICAL | Playground execution/history, apps, app safety, approvals, artifact reuse. | Execution still uses compatibility routing below the API. |
| Studio | `/admin/dashboard/studio` | CANONICAL | Studio execute/poll, route matrix, workspaces, safety, approvals, STT, projects, artifact reuse. | Some media capabilities return honest partial/unavailable states. |
| Capabilities | `/admin/dashboard/capabilities` | LEGACY | Directly renders `AI_CAPABILITY_TAXONOMY`. | It does not consume the Phase 1 23-capability registry and can diverge from runtime readiness. |
| Connected Apps | `/admin/dashboard/connected-apps` | CANONICAL | Server-side connected app/event reads and admin mutation APIs. | App execution still depends on compatibility routing. |
| Artifacts | `/admin/dashboard/artifacts` | CANONICAL | Artifact list/filter, preview/download, reuse, archive. | External object storage is future adapter work. |
| Jobs | `/admin/dashboard/jobs` | CANONICAL | Control-plane job list and cancellation. | Some specialist job stores remain local or provider-specific. |
| Providers | `/admin/dashboard/providers` | LEGACY | Provider diagnostics and live-test APIs. | Uses provider mesh/catalog/registry compatibility layers, not Phase 1 discovery directly. |
| Settings | `/admin/dashboard/settings` | CANONICAL | Settings truth, routing policy, safety, runtime tools, capability truth, keys, tests. | Several returned truth objects still originate in compatibility registries. |
| Music Studio | `/admin/dashboard/music-studio` | PARTIAL | Music execution and provider-job polling. | Blueprint output must not be presented as completed audio. |
| Avatars | `/admin/dashboard/avatars` | PARTIAL | Creative workspace list/update. | No working avatar-video/lip-sync backend. |
| Projects | `/admin/dashboard/projects` | PARTIAL | Creative workspace CRUD. | Workspace metadata is real; it is not a complete production project pipeline. |

## Duplicate Dashboard Layers

No second dashboard application exists. The dashboard is one App Router tree
under `src/app/admin/dashboard`. The risk is duplicate backend truth consumed
inside that one UI:

- Capabilities page reads `ai-capability-taxonomy.ts`.
- Studio reads `v1-brain-route-matrix`, which includes provider-gateway aliases.
- Providers reads provider diagnostics backed by compatibility registries.
- Settings combines platform settings, runtime tools, routing policy, and
  capability truth.

The frontend should eventually consume one normalized backend truth response.
That is a later parity/cutover task, not a redesign.

## Placeholder Determination

Input placeholder text is not a placeholder product. Pages are marked PARTIAL
only where their backend cannot complete the named workflow. No page should be
deleted in PR #116.
