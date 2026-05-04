# Phase 1 Frontend + Dashboard Cleanup

## Objective

Create one production-facing dashboard direction before wiring more backend features.

This phase does **not** claim unfinished capabilities are working. It makes the frontend and dashboard honest, clearer, and easier to extend.

## Canonical dashboard navigation

Visible dashboard sections now focus on the product foundation:

1. Command Center
2. Aiva
3. Repo Workbench
4. Apps / Packages
5. Media Studio
6. Scraping / Research
7. Artifacts / Storage
8. Actions / Approvals
9. Diagnostics
10. Settings

`/admin/dashboard` remains a redirect alias only and is not a visible nav item.

## Consolidation rules

- Settings is the only API key/provider/tool configuration surface.
- Diagnostics is the only health/readiness/test/proof surface.
- Repo Workbench remains the only repo command-to-PR surface.
- Missing features may be shown only with truthful statuses such as `Ready to wire`, `Needs key`, `Backend pending`, or `Post-launch`.
- Nothing may be marked `Working` unless the endpoint and proof exist.

## Changes in this PR

- Dashboard shell navigation was renamed and consolidated around production modules.
- System Health/Live Readiness/Test concepts were consolidated under visible `Diagnostics` navigation.
- Command Center was refocused as an operator console with module statuses and foundation rules.
- Settings remains the only visible configuration entry point.
- The UI now starts from the correct mental model: foundation first, then backend wiring.

## Not included yet

These must be handled in follow-up PRs after this foundation PR lands:

- Full Settings redesign into consistent tabs/cards.
- Provider stack hard cleanup and saved-key reset script.
- Deleting or redirecting old hidden dashboard route files.
- Repo Workbench UX refinements around Import / Update / Add / Audit.
- Backend wiring for Aiva actions, scraping storage, media, voice and tool execution.
- Public homepage full redesign pass if desired.

## Verification expected before merge

```bash
npm run build
npm run lint
npx vitest run \
  src/lib/__tests__/dashboard-golive.test.ts \
  src/lib/__tests__/repo-workbench-production.test.ts \
  src/lib/__tests__/one-source-of-truth.test.ts
```

## Deployment reminder

After merge, deploy must verify Next static assets:

- CSS asset over `https://amarktai.com/_next/static/...` returns HTTP 200
- JS asset over `https://amarktai.com/_next/static/...` returns HTTP 200
- font asset over `https://amarktai.com/_next/static/...` returns HTTP 200 when present
