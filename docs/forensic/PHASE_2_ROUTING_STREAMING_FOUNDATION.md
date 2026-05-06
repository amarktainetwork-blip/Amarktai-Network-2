# Phase 2 — Routing + Streaming Foundation

Generated: 2026-05-02  
Branch: `phase-2-routing-streaming-foundation`

## Goal

Prepare Amarktai Network for a perfect current-app go-live and future app onboarding without bringing back broken UI or duplicate AmarktAI Assistant surfaces.

This phase adds backend foundations only:

1. App-aware model/provider routing.
2. Cheap/free provider preference so Qwen, Groq, Together and HuggingFace are first-class options.
3. Streaming conversation backend that future AmarktAI Assistant/chat UI can consume.
4. Future app capability profiles for marketing, learning, adult, equine, religious and travel apps.

## Why this phase is backend-first

AmarktAI Assistant was previously removed because it created duplication and did not work reliably. This PR does **not** re-add the floating assistant UI. It only adds the safe backend route needed for AmarktAI Assistant to return later when the frontend can be made clean and fully tested.

## New files

### `src/lib/ai-routing-policy.ts`

Adds a central routing policy with:

- `AiCapability`
- `CostPreference`
- `AppSafetyProfile`
- `AppCapabilityProfile`
- `planAiRoute()`
- `defaultAppCapabilityProfiles()`

Routing now explicitly considers:

- current runtime truth
- configured provider keys
- GenX availability
- adult gate status
- app safety profile
- cost preference
- model capability

Cost preferences:

| Preference | Behaviour |
| --- | --- |
| `free_first` | Prioritise Qwen, Groq, HuggingFace, Together, OpenRouter, then GenX/premium |
| `cheap` | Prioritise very-low/low-cost providers like Qwen, Groq, Together, HuggingFace |
| `balanced` | Prefer GenX, then capable cheap/backbone fallbacks |
| `premium` | Prefer GenX/premium providers, then fall back down |

### `GET/POST /api/admin/ai-routing`

New admin route for inspecting route plans.

`GET` returns default future app profiles and route samples.

`POST` accepts:

```json
{
  "capability": "chat",
  "costPreference": "cheap",
  "appProfile": {
    "appSlug": "amarktai-network",
    "appType": "ai-operating-system",
    "safetyProfile": "standard"
  }
}
```

It returns a route plan with selected provider/model, candidates, blockers and safety profile.

### `POST /api/admin/conversation/stream`

New admin-only Server-Sent Events endpoint.

It:

1. Authenticates admin session.
2. Plans a route via `planAiRoute()`.
3. Streams natively through GenX when GenX is selected.
4. Falls back to direct provider call with simulated token chunks when direct provider is selected.
5. Sends route/status/token/done/error events.

This is the foundation for AmarktAI Assistant/chat streaming, not the final AmarktAI Assistant UI.

## AmarktAI Assistant decision

AmarktAI Assistant should only return when all of this is true:

- One visible assistant surface only.
- It consumes `/api/admin/conversation/stream`.
- It has a real voice selector backed by working TTS providers.
- It can be disabled with one flag.
- It has no duplicate dashboard/chat widgets.
- It never claims tool actions happened unless the backend job/API confirms them.

## Future app profiles added

The policy defines default profiles for:

- current Amarktai Network operator console
- future marketing app
- future learning/courses app
- future adult companion app
- future equine/horse app
- future religious content app
- future travel app

These are not yet persisted DB records. They are the routing template for the app registry phase.

## What this phase deliberately does not do

- Does not redesign the public website.
- Does not re-add AmarktAI Assistant UI.
- Does not add voice picker UI.
- Does not create persisted app registry DB migrations.
- Does not enable video/music routes.
- Does not override adult gates.
- Does not claim live provider success without runtime truth and provider tests.

## Manual test after deploy

### Routing plan

```bash
curl -sS -X POST https://amarktai.com/api/admin/ai-routing \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"capability":"chat","costPreference":"cheap"}' | jq
```

Expected: JSON route plan with selected provider if one is configured, otherwise exact blockers.

### Streaming conversation

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"message":"Say hello in one sentence and state which provider route was selected.","capability":"chat","costPreference":"cheap"}'
```

Expected SSE events:

```text
event: status
event: route
event: token
event: done
```

## Phase 3 recommendation

After this PR is merged and verified:

1. Add a clean AI Engine routing tab that calls `/api/admin/ai-routing`.
2. Add a single AmarktAI Assistant/chat panel that consumes `/api/admin/conversation/stream`.
3. Add voice provider/voice selector backed by existing TTS routes.
4. Redesign public website and dashboard polish in a separate UI-only PR.

## Verdict

This phase makes the system smarter and safer without destabilising go-live. It makes cheap/free models first-class and creates the streaming backbone needed for AmarktAI Assistant to return correctly later.
