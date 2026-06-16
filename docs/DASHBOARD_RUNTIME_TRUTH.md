# Dashboard Runtime Truth

Date: 2026-06-15

Every page under `src/app/admin` is listed below.

| Page | Route | Classification | Connected runtime | Missing backend or limitation |
| --- | --- | --- | --- | --- |
| Admin login | `/admin/login` | CANONICAL | `/api/admin/login` | Requires production session and HTTPS configuration. |
| Dashboard redirect | `/admin/dashboard` | CANONICAL | Redirects to Command Center. | None. |
| Command Center | `/admin/dashboard/command` | CANONICAL | Playground execution/history, apps, app safety, approvals, artifact reuse. | Execution still uses compatibility routing below the API. |
| Studio | `/admin/dashboard/studio` | CANONICAL | Studio execute/poll, route matrix, workspaces, safety, approvals, STT, projects, artifact reuse. | Some media capabilities return honest partial/unavailable states. |
| Capabilities | `/admin/dashboard/capabilities` | CANONICAL | `/api/admin/system/ai-capabilities-truth` plus Brain route matrix truth. | It still presents the existing grouped UI, but backend capability truth now comes from runtime APIs rather than a page-local static list. |
| Connected Apps | `/admin/dashboard/connected-apps` | CANONICAL | Server-side connected app/event reads and admin mutation APIs. | App execution still depends on compatibility routing. |
| Artifacts | `/admin/dashboard/artifacts` | CANONICAL | Artifact list/filter, preview/download, reuse, archive. | External object storage is future adapter work. |
| Jobs | `/admin/dashboard/jobs` | CANONICAL | `/api/admin/jobs` canonical job list plus cancellation-compatible links. | Some specialist job stores remain local or provider-specific. |
| Providers | `/admin/dashboard/providers` | LEGACY | Provider diagnostics and live-test APIs. | Reachable for diagnostics only; not canonical nav and not a provider picker for normal workflows. |
| Settings | `/admin/dashboard/settings` | CANONICAL | Settings truth, routing policy, safety, runtime tools, capability truth, keys, tests. | Several returned truth objects still originate in compatibility registries or mixed runtime views. |
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

The 2026-06-16 dashboard backend follow-up removes one of the main stale links:
the Capabilities page now fetches the canonical `ai-capabilities-truth` API, and
the Jobs page now reads the canonical `/api/admin/jobs` surface instead of the
older `/api/admin/system/jobs` page-specific feed.

The frontend should eventually consume one normalized backend truth response.
That is a later parity/cutover task, not a redesign.

## Canonical V1 Navigation

The shipped canonical V1 navigation contains:

- Command Center
- Studio
- Capabilities
- Connected Apps
- Jobs
- Artifacts
- Settings

`/admin/dashboard/providers` remains reachable as a legacy diagnostic route, but
it is not part of the canonical V1 navigation.

## Placeholder Determination

Input placeholder text is not a placeholder product. Pages are marked PARTIAL
only where their backend cannot complete the named workflow. No page should be
deleted in PR #116.
