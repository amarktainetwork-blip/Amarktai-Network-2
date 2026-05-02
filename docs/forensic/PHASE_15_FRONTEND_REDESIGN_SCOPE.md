# Phase 15 — Frontend Fix + Redesign Scope

Generated: 2026-05-02

## Objective

After Phase 14 merges, the next phase should be the full frontend fix/redesign.

The redesign must not remove the backend work completed in Phases 5–14. It must expose it clearly and make the product feel like a premium AI operating system.

## Product identity

- Product: Amarktai Network
- AI personality: Aiva
- Public positioning: AI operating system and app-control layer
- Do not market as “GenX-powered” in public copy
- GenX remains internal infrastructure/gateway

## Required dashboard sitemap

### 1. Command Center

Purpose: single executive overview.

Must show:

- Aiva status and conversation panel
- provider health summary
- active apps
- repo workbench status
- recent artifacts
- recent Aiva action audit entries
- go-live blockers

### 2. Aiva

Purpose: real-time conversational operator.

Must include:

- streaming chat
- smart routing metadata collapsed by default
- voice controls when verified
- action approval cards
- action audit trail
- tool permissions

### 3. AI Engine

Purpose: provider/model/capability control.

Must include:

- Provider Intelligence
- Model Catalog
- Capability Tests
- Stream Tests
- App AI Setup
- Aiva Actions
- Artifact Gallery

Existing useful routes:

```text
/admin/dashboard/ai-engine/ops
/admin/dashboard/ai-engine/intelligence
/admin/dashboard/ai-engine/artifacts
/admin/dashboard/ai-engine/app-setup
/admin/dashboard/ai-engine/aiva-actions
```

### 4. Apps

Purpose: manage connected apps.

Must include:

- app registry
- app AI package selector/editor
- website crawl intelligence
- app permissions
- app budgets
- app artifacts

### 5. Repo Workbench

Purpose: simple prompt-to-PR flow.

Desired UX:

```text
Add/select repo → type command → review diff → create PR → merge in GitHub → deploy
```

Existing useful route:

```text
/admin/dashboard/repo-workbench/simple
```

### 6. Artifacts

Purpose: generated media/task/code/report outputs.

Must include:

- media artifacts
- repo artifacts
- generated reports
- filters by app/provider/capability

### 7. Settings

Purpose: keys, providers, budgets and safety.

Must include:

- provider key vault
- provider governance grouping
- advanced providers hidden by default
- adult-mode gate
- deploy action flag
- budget controls

## Visual direction

Keep dark premium base, but improve:

- layout hierarchy
- spacing
- mobile responsiveness
- card consistency
- navigation clarity
- empty states
- loading states
- error states
- action confirmation cards

Suggested feel:

```text
premium dark glass
cyan/emerald highlights
less clutter
command-center layout
enterprise SaaS polish
AI OS personality
```

## Non-negotiable rules

- Do not remove working backend routes.
- Do not remove AI provider/model/capability logic.
- Do not make fake success states.
- Do not make Aiva execute risky actions without confirmation.
- Preserve streaming conversation.
- Preserve smart routing.
- Preserve app AI package persistence.
- Preserve artifact/provider result logs.
- Preserve Repo Workbench simple mode.

## Phase 15 implementation plan

### Step 1 — Navigation cleanup

Add first-class dashboard nav links for:

- Command Center
- Aiva
- AI Engine
- Apps
- Repo Workbench
- Artifacts
- Settings

### Step 2 — New Command Center

Build a high-level operator homepage pulling from existing APIs.

### Step 3 — AI Engine redesign

Fold the Phase 12/13 pages into a polished AI Ops experience.

### Step 4 — Aiva panel polish

Make the streaming conversation feel live and premium.

### Step 5 — Repo Workbench simple UX polish

Make the prompt-to-PR flow obvious and minimal.

### Step 6 — Mobile pass

Fix all layout overflow, cramped cards and poor spacing.

### Step 7 — Final proof

Run build, lint/type checks where available, and verify key routes.

## Success criteria

Phase 15 is complete when:

- dashboard looks premium and coherent,
- all new Phase 5–14 tools are discoverable,
- Aiva streams quickly,
- app setup can be saved/reloaded,
- artifacts and provider scores are visible,
- repo simple mode is obvious,
- no route has fake success,
- mobile layout is usable,
- build passes.
