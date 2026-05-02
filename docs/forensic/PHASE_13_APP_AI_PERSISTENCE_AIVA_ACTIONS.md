# Phase 13 — App AI Persistence + Aiva Action Permissions

Generated: 2026-05-02  
Branch: `phase-13-app-ai-persistence-aiva-actions`

## Goal

Complete the immediate product workflow foundation before the full frontend redesign.

This phase focuses on:

1. Persisting app-level AI packages.
2. Letting the dashboard save/load recommended app AI packages.
3. Defining Aiva action permissions so “full control” is safe and explicit.
4. Adding an Aiva Actions dashboard page.

## Added

### 1. App AI package file-backed persistence

New file:

```text
src/lib/app-ai-package-store.ts
```

Default storage path:

```text
APP_AI_PACKAGE_STORE_ROOT=/var/www/amarktai/repo/storage/app-ai-packages
```

Supports:

- save package
- load package by app slug
- list packages
- delete package
- version bump on update

This avoids a risky schema migration right before redesign while still giving the product working persistence.

### 2. App AI package persistence API

New endpoint:

```text
GET /api/admin/app-ai-package
POST /api/admin/app-ai-package
DELETE /api/admin/app-ai-package?appSlug=...
```

`GET` with no `appSlug` lists all saved packages.

`GET ?appSlug=...` loads one package.

`POST` saves a package.

`DELETE` removes one package.

### 3. App AI Setup UI save/load

Updated page:

```text
/admin/dashboard/ai-engine/app-setup
```

Now supports:

- loading saved packages,
- generating recommendations,
- saving a package,
- version display,
- saved package selector.

### 4. Aiva action permission registry

New file:

```text
src/lib/aiva-action-permissions.ts
```

Defines safe action categories and risk levels.

Risk levels:

```text
safe_read
low_write
external_write
spend
repo_write
deploy
destructive
adult_mode
```

Action examples:

- read system status
- read provider scores
- recommend app AI package
- save app AI package
- run provider test
- run specialist generation
- import/sync repo
- generate repo patch
- apply repo patch
- create GitHub PR
- deploy app
- send marketing campaign
- change adult mode
- delete data

### 5. Aiva action permission API

New endpoint:

```text
GET /api/admin/aiva/actions
```

Returns:

- all actions,
- actions grouped by category,
- rules stating which actions require confirmation.

### 6. Aiva Actions dashboard page

New page:

```text
/admin/dashboard/ai-engine/aiva-actions
```

Shows:

- action category,
- action risk,
- default allowed/manual only,
- confirmation requirement,
- admin-only status.

## Manual checks after merge/deploy

### App AI package list

```bash
curl -sS https://amarktai.com/api/admin/app-ai-package \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Save recommended package from UI

```text
https://amarktai.com/admin/dashboard/ai-engine/app-setup
```

1. Generate package.
2. Click Save package.
3. Refresh.
4. Confirm saved package appears.

### Aiva actions API

```bash
curl -sS https://amarktai.com/api/admin/aiva/actions \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Aiva actions UI

```text
https://amarktai.com/admin/dashboard/ai-engine/aiva-actions
```

## Important control model

Aiva can eventually control the system, but control must be tool-gated:

- read operations can be default allowed,
- writes require explicit confirmation,
- external writes require explicit confirmation,
- spending requires explicit confirmation,
- repo PR actions require explicit confirmation,
- deploys require explicit confirmation,
- destructive actions require explicit confirmation,
- adult-mode changes require explicit confirmation.

This is the right way to give Aiva “full control” without making the system unsafe.

## Still pending

- Database-backed app AI packages.
- Manual model/package editor for every capability row.
- Aiva action execution endpoint with audit trail.
- Repo Workbench review/apply/create-PR UI polish.
- Main dashboard navigation cards for all new AI Ops pages.
- Final frontend fix/redesign.

## Recommended next phase

Phase 14 should be final pre-redesign hardening:

1. Add navigation cards/links into AI Engine and dashboard.
2. Add Repo Workbench review/create-PR polish if available.
3. Add Aiva action execution/audit shell.
4. Run a production readiness/code audit prompt.
5. Prepare redesign scope and final UI sitemap.

Then Phase 15 can be the major frontend fix/redesign.

## Verdict

App AI packages can now be saved and reloaded. Aiva has an explicit action permission model. This gives the product a safer foundation before the final dashboard/frontend redesign.