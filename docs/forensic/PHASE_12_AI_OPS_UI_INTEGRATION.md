# Phase 12 — AI Ops UI Integration

Generated: 2026-05-02  
Branch: `phase-12-ai-ops-ui-integration`

## Goal

Bring the backend AI operations work into usable dashboard surfaces without doing the full public/dashboard redesign yet.

This phase focuses on practical operator UI:

1. Provider Intelligence dashboard.
2. Artifact Gallery UI.
3. App AI Setup UI.
4. Simple Repo Workbench UI.
5. AmarktAI Assistant conversation stream uses smart routing by default.

## Added

### 1. Provider Intelligence dashboard

New page:

```text
/admin/dashboard/ai-engine/intelligence
```

Uses:

```text
GET /api/admin/provider-scores
```

Shows:

- provider/model/capability scores
- success/failure counts
- success rate
- average latency
- failed count
- latest artifact link
- recommendation/status

### 2. Artifact Gallery UI

New page:

```text
/admin/dashboard/ai-engine/artifacts
```

Uses:

```text
GET /api/admin/artifacts/media
```

Shows:

- generated image/audio/task artifacts
- provider
- model
- capability
- size
- created time
- open artifact link

### 3. App AI Setup UI

New page:

```text
/admin/dashboard/ai-engine/app-setup
```

Uses:

```text
POST /api/admin/app-ai-package/recommend
```

Lets the operator generate a per-app package with:

- app slug
- app name
- app type
- optional website URL
- cheap/preferred mode
- adult app permission flag

Displays:

- safety profile
- enabled capabilities
- provider/model selections
- budget mode
- blockers

### 4. Simple Repo Workbench UI

New page:

```text
/admin/dashboard/repo-workbench/simple
```

Uses:

```text
POST /api/admin/repo-workbench/simple
```

Provides the simplified flow:

```text
Repo URL + branch + command + quality → run command → return workspace/patch/next steps
```

This is the first UI surface for the desired prompt-to-PR flow.

### 5. AmarktAI Assistant smart routing by default

Updated:

```text
src/app/api/admin/conversation/stream/route.ts
```

AmarktAI Assistant now applies provider-intelligence avoidance by default using provider result logs.

New request flag:

```json
{"useSmartRouting": true}
```

Default: `true`.

If provider logs show repeated failures for a provider/model/capability, AmarktAI Assistant will skip that route and select the next available candidate.

## Manual checks after merge/deploy

### Provider Intelligence UI

```text
https://amarktai.com/admin/dashboard/ai-engine/intelligence
```

### Artifact Gallery UI

```text
https://amarktai.com/admin/dashboard/ai-engine/artifacts
```

### App AI Setup UI

```text
https://amarktai.com/admin/dashboard/ai-engine/app-setup
```

### Simple Repo Workbench UI

```text
https://amarktai.com/admin/dashboard/repo-workbench/simple
```

### AmarktAI Assistant smart routing stream

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "message":"Reply in one sentence and confirm smart routing is active.",
    "capability":"chat",
    "costPreference":"cheap",
    "useSmartRouting":true,
    "appProfile":{"appSlug":"amarktai-network","safetyProfile":"standard"}
  }'
```

Expected events:

```text
event: status
event: route
event: token
event: done
```

The `route` event should include candidates where provider intelligence can block repeated bad providers.

## Important restraint

This phase intentionally avoids a full rewrite of the existing AI Engine page. The new pages are direct operator surfaces. Final navigation polish and dashboard redesign should happen in the redesign/hardening phase to avoid destabilising the working dashboard.

## Still pending

- Add polished cards/links to AI Engine overview page.
- Add sidebar shortcuts if desired.
- Persist app AI packages to DB.
- Add full UI to edit provider/model selections manually.
- Add artifact retention/cleanup controls.
- Add AmarktAI Assistant tool permission registry and action audit UI.
- Final public website/dashboard redesign.

## Recommended next phase

Phase 13 should complete the app/repo product workflow:

1. Persist app AI package selections.
2. Add App AI package editor UI.
3. Add Repo Workbench PR creation/approval UI if backend supports it.
4. Add AmarktAI Assistant action permission registry.
5. Add navigation links/cards into the main dashboard sections.

## Verdict

The backend AI operations work now has usable UI surfaces. AmarktAI Assistant uses smart routing by default, and operators can inspect provider scores, artifacts, app AI package recommendations, and simple repo-command runs from the dashboard.
