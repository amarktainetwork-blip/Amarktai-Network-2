# Phase 14 — Pre-Redesign Hardening

Generated: 2026-05-02  
Branch: `phase-14-pre-redesign-hardening`

## Goal

Complete the final hardening layer before the full frontend fix/redesign.

This phase avoids a broad visual rewrite. It focuses on:

1. Making the new AI Ops surfaces discoverable.
2. Adding an Aiva action execution/audit shell.
3. Defining the exact Phase 15 frontend redesign scope.

## Added

### 1. AI Ops Command Center

New page:

```text
/admin/dashboard/ai-engine/ops
```

This links the new operator tools created in recent phases:

- Provider Intelligence
- Artifact Gallery
- App AI Setup
- Aiva Actions
- Simple Repo Workbench

It also shows a pre-redesign readiness checklist.

### 2. Aiva action audit helper

New file:

```text
src/lib/aiva-action-audit.ts
```

Default storage path:

```text
AIVA_ACTION_AUDIT_ROOT=/var/www/amarktai/repo/storage/aiva-action-audit
```

It records:

- action ID
- permission label
- allowed/blocked decision
- confirmation status
- risk level
- category
- reason
- requested by
- sanitized payload preview
- timestamp

Secrets are redacted from payload previews.

### 3. Aiva action execution/audit shell

New endpoint:

```text
GET /api/admin/aiva/action-execute
POST /api/admin/aiva/action-execute
```

`GET` returns recent audit entries.

`POST` validates an action request against the Aiva action permission registry and records an audit entry.

Important: this endpoint does **not** execute risky actions yet. It returns:

```text
approved_pending_executor
```

for approved actions. Actual per-action executors must be wired separately and safely.

### 4. Phase 15 redesign scope

New document:

```text
docs/forensic/PHASE_15_FRONTEND_REDESIGN_SCOPE.md
```

Defines the next phase:

- product identity
- required dashboard sitemap
- visual direction
- non-negotiable rules
- implementation plan
- success criteria

## Manual checks after merge/deploy

### AI Ops Command Center

```text
https://amarktai.com/admin/dashboard/ai-engine/ops
```

### Aiva action audit API

List audit entries:

```bash
curl -sS 'https://amarktai.com/api/admin/aiva/action-execute?days=7' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

Blocked action without confirmation:

```bash
curl -sS -X POST https://amarktai.com/api/admin/aiva/action-execute \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "actionId":"repo_create_pr",
    "confirmed":false,
    "payload":{"repo":"amarktainetwork-blip/Amarktai-Network-2"}
  }' | jq
```

Expected: blocked / confirmation required.

Approved-pending-executor action with confirmation:

```bash
curl -sS -X POST https://amarktai.com/api/admin/aiva/action-execute \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "actionId":"repo_create_pr",
    "confirmed":true,
    "payload":{"repo":"amarktainetwork-blip/Amarktai-Network-2"}
  }' | jq
```

Expected:

```text
success: true
executed: false
status: approved_pending_executor
```

Verify audit file on VPS:

```bash
sudo find /var/www/amarktai/repo/storage/aiva-action-audit -type f | tail -10
sudo tail -n 20 /var/www/amarktai/repo/storage/aiva-action-audit/*.jsonl 2>/dev/null || true
```

## What this phase intentionally does not do

- Does not redesign the full dashboard.
- Does not wire real executors for deploy/PR/marketing/destructive actions.
- Does not change the main AI Engine page structure.
- Does not add database-backed action audit yet.
- Does not alter existing streaming/provider routing logic.

## Next phase

Phase 15 should be the full frontend fix/redesign.

Scope is documented in:

```text
docs/forensic/PHASE_15_FRONTEND_REDESIGN_SCOPE.md
```

Recommended Phase 15 priorities:

1. Navigation cleanup.
2. New Command Center homepage.
3. AI Engine redesign around the new Ops pages.
4. Aiva streaming panel polish.
5. Repo Workbench simple UX polish.
6. Mobile responsiveness pass.
7. Build/proof checks.

## Verdict

The app now has a final pre-redesign hardening layer: new AI Ops links, a safe Aiva action audit shell, and a clear redesign scope. Phase 15 can focus on frontend quality and premium UX without losing the backend work from Phases 5–14.
