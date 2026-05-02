# Phase 15 — Frontend Redesign: Public Site + Command Center

Generated: 2026-05-02  
Branch: `phase-15-frontend-redesign-command-center`

## Goal

Start the full frontend fix/redesign by changing the direction of the public website and dashboard from provider-heavy technical pages into an Amarktai Network + Aiva product experience.

This is the first redesign PR. It does not attempt to redesign every dashboard page at once. It creates the new direction and the premium command-center surfaces that the remaining pages can be folded into.

## Added / changed

### 1. Public homepage rewritten around Amarktai Network and Aiva

Updated:

```text
src/app/page.tsx
```

The new homepage now focuses on:

- Amarktai Network as the AI operating system and app-control layer.
- Aiva as the central operator/personality.
- App AI packages.
- Prompt-to-PR workflow.
- Permission-gated control.
- Live readiness and operator visibility.
- The app portfolio vision: companion apps, horse/equine apps, marketing apps, learning/course apps, religious apps, travel apps and future apps.

Removed the public-facing emphasis on provider lists. Providers remain infrastructure, not the story.

### 2. Live readiness overview API

New endpoint:

```text
GET /api/admin/live-readiness
```

It combines:

- readiness audit,
- runtime truth,
- provider scores,
- saved app AI packages,
- recent artifacts.

It returns:

- overall readiness,
- score,
- connected systems,
- blockers,
- metrics,
- links to key tools.

This gives the dashboard a real-time answer to:

```text
What is connected?
What is working?
What still blocks go-live?
```

### 3. Live Readiness dashboard page

New page:

```text
/admin/dashboard/live-readiness
```

Shows:

- go-live score,
- connected systems,
- system states,
- next actions,
- blockers,
- direct links to related tools.

### 4. Redesigned Command Center page

Updated:

```text
/admin/dashboard/command-center
```

The new page is a premium dashboard entry point with:

- Aiva-first command-center copy,
- live go-live score,
- blockers/warnings summary,
- links to Aiva, Live Readiness, Provider Intelligence, App AI Setup, Artifact Gallery and Repo Workbench,
- connected systems list,
- go-live blockers list.

## Why this phase matters

The product now starts to feel like:

```text
Amarktai Network — an AI operating system for your app portfolio, operated by Aiva.
```

not:

```text
A dashboard listing providers and disconnected AI features.
```

## Manual checks after merge/deploy

### Public homepage

```text
https://amarktai.com/
```

Check:

- copy is Amarktai/Aiva-first,
- provider names are not the main story,
- design feels premium and modern,
- CTA flows still work.

### Live readiness API

```bash
curl -sS https://amarktai.com/api/admin/live-readiness \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

Expected:

- `overallReady`
- `score`
- `systems`
- `blockers`
- `metrics`
- `links`

### Live readiness page

```text
https://amarktai.com/admin/dashboard/live-readiness
```

### Command Center

```text
https://amarktai.com/admin/dashboard/command-center
```

## Not included yet

This PR does not yet complete every frontend page.

Still needed:

- Sidebar/navigation redesign.
- Main dashboard overview replacement or redirect to Command Center.
- AI Engine page redesign.
- Aiva streaming panel polish.
- Repo Workbench review/create-PR polish.
- Apps page redesign.
- Settings page cleanup.
- Mobile responsiveness pass across every page.
- Build/test proof after deployment.

## Recommended next PR

Phase 16 should continue the redesign with:

1. Dashboard navigation/sidebar cleanup.
2. Make Command Center the default admin dashboard landing page.
3. Redesign AI Engine main page to use the new Ops pages cleanly.
4. Polish Aiva streaming panel and route metadata UI.
5. Mobile pass on dashboard shell.

## Verdict

The frontend now has the right product direction: Amarktai and Aiva are the public story, while providers remain internal infrastructure. The dashboard has a proper command-center target and a live readiness view to guide go-live work.