# V1 Runtime Start State

## Baseline

- Canonical branch: `integration/cline-source-of-truth`
- Baseline commit: `3e81919b28f823af6f9db24b95b2a89d577566b0`
- Baseline source: merged PR #103
- Working branch: `codex/v1-runtime-studio-router-proof`
- App files under `src/app`: 258
- Library files under `src/lib`: 185
- API route files: 236
- Page files: 15
- Baseline tests: 28 files, 427/427 passed
- Baseline production build: passed, 178 static pages generated

## Active V1 dashboard routes

| Section | Route |
| --- | --- |
| Command Center | `/admin/dashboard/command` |
| Studio | `/admin/dashboard/studio` |
| Capabilities | `/admin/dashboard/capabilities` |
| Connected Apps | `/admin/dashboard/connected-apps` |
| Artifacts | `/admin/dashboard/artifacts` |
| Jobs | `/admin/dashboard/jobs` |
| Settings | `/admin/dashboard/settings` |

Authentication remains at `/admin/login`. Public pages remain `/`, `/about`,
`/platform`, `/contact`, `/privacy`, and `/terms`.

## Removed or hidden V2 surfaces

- App Builder has no dashboard page or V1 navigation entry.
- Repo Workbench has no dashboard page or V1 navigation entry.
- MCP and provider marketplace have no V1 navigation entries.
- Voice-login and voice-access pages are absent.
- The dashboard uses one layout and the canonical seven-item navigation.

Legacy Repo Workbench API files and supporting libraries still exist. They are
not exposed through V1 navigation, but they are not deleted. This is a backend
cleanup risk for a dedicated removal PR, not evidence that Repo Workbench is a
V1 product.

## Recorded commands

The start-state inspection recorded `git status`, current branch, the latest
commits, sorted `src/app` and `src/lib` inventories, route/page counts, tests,
TypeScript, and production build. Final proof is rerun after this audit work so
the result represents the committed tree.

## Final comparison

- TypeScript: passed with `npx.cmd tsc --noEmit`
- Production build: passed with 178 static pages generated
- Full suite: 28 files, 429/429 tests passed
- Focused runtime contracts: 5 files, 60/60 tests passed
- Prisma schema: validated against the documented MariaDB URL shape
- Test change: two focused contracts were added for storage path traversal and
  the Studio music/style routing contract; no existing test was removed
