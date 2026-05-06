# Phase 17 — AmarktAI Assistant + Repo Workbench Polish

Generated: 2026-05-03  
Branch: `phase-17-AmarktAI Assistant-repo-mobile-polish`

## Goal

Polish the two highest-impact operator surfaces before the final proof/deploy phase:

1. AmarktAI Assistant streaming assistant panel.
2. Simple Repo Workbench prompt-to-PR flow.

## Changed

### 1. AmarktAI Assistant panel polish

Updated:

```text
src/components/admin/AmarktAI AssistantAssistantPanel.tsx
```

Improvements:

- better mobile-safe sizing,
- stream status displayed in header,
- smart routing explicitly enabled in request payload,
- route details collapsed by default,
- route details can be expanded when needed,
- clearer voice/TTS locked messaging,
- route status updated from SSE status/route/done events,
- less cramped assistant/user message layout on small screens.

AmarktAI Assistant still uses:

```text
POST /api/admin/conversation/stream
```

No backend stream contract was changed.

### 2. Simple Repo Workbench UX polish

Updated:

```text
src/app/admin/dashboard/repo-workbench/simple/page.tsx
```

Improvements:

- redesigned hero around “give the repo one clear command”,
- three-step prompt-to-PR mental model,
- clearer repo/branch/quality input layout,
- example commands,
- explicit review-gated/no auto-merge/no hidden deploy messaging,
- better result cards for workspace, patch ID, report artifact and status,
- better next-step display.

Backend endpoint unchanged:

```text
POST /api/admin/repo-workbench/simple
```

## Manual checks after merge/deploy

### AmarktAI Assistant panel

If enabled with:

```text
NEXT_PUBLIC_AmarktAI Assistant_ENABLED=true
```

Open dashboard and click AmarktAI Assistant.

Check:

- panel fits desktop and mobile viewport,
- stream status updates,
- route details are collapsed by default,
- asking a question streams tokens,
- voice selector remains locked unless TTS is verified,
- stop button cancels current stream/audio.

### Repo Workbench simple

```text
/admin/dashboard/repo-workbench/simple
```

Check:

- page feels like a simple prompt-to-PR workflow,
- example commands populate the command box,
- Run command calls existing backend endpoint,
- results show workspace, patch/report IDs and next steps,
- messaging clearly says PR/deploy/destructive actions require approval.

## Remaining before redeploy

Recommended Phase 18:

1. Apps page quick cleanup.
2. Settings page quick cleanup if needed.
3. Mobile sanity pass on key routes.
4. Final build/test proof.
5. VPS redeploy.
6. Live endpoint verification.

## How many phases left?

After this PR merges, there should be **one final phase before redeploy/go-live verification**:

```text
Phase 18 — final proof, build, deploy and live verification
```

The system will continue improving after launch, but the launch path should be down to one final phase.

## Verdict

AmarktAI Assistant and Repo Workbench now feel much closer to the intended operator experience: real-time, controlled, review-gated and less technical for normal use.