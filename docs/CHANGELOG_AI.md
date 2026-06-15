# AmarktAI AI Changelog

Every pull request that changes AI architecture, providers, models,
capabilities, routing, execution, artifacts, memory, agents, research, adult
policy, or operating truth must update this file.

| Date | PR | Branch | Files Changed | Summary | Providers | Capabilities | Blockers | Next Steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-15 | #114 | `codex/v1-operating-truth-docs` | Documentation and README only | Establish V1 operating truth, architecture, roadmap, provider matrix, AI context, and machine-readable documentation structures. | HF, Together, Groq, GenX, Qwen, MiMo documented; no runtime changes. | Canonical product capability names documented; no runtime status changed. | Provider proof remains incomplete for rows marked `partial` or `unknown`. | Implement future phases through the canonical Brain and update this file in every relevant PR. |
| 2026-06-15 | #115 | `codex/phase-1-provider-truth-layer` | Canonical provider modules, focused tests, one stale contract assertion, and operating docs | Add the six-provider truth registry, 23-capability registry, cached dynamic discovery, provider health projection, six scoring profiles, weighted provider/model scoring, and an evidence-only dynamic route planner. Align the stale Groq TTS credential-helper assertion with the already-merged route. | HF, Together, Groq, GenX, Qwen, MiMo. | All 23 canonical product capabilities are represented; execution statuses are unchanged. | Existing execution APIs still use compatibility routing/model catalogs because this PR intentionally does not change workflows or API behavior. Providers that omit model capability metadata produce no dynamic route. | Cut runtime consumers over capability by capability with parity tests, then retire compatibility model and routing truth without changing APIs. |

## Entry Rules

Each entry states date, PR, branch, files changed, summary, providers,
capabilities, blockers, and next steps. Never rewrite history to make an
unproven capability appear complete.

## PR 116

- **Purpose:** Produce the definitive V1 runtime truth audit without changing
  runtime behavior, schemas, integrations, policy, pricing, or UI.
- **Files changed:** `README.md`, `docs/CODEX_CONTEXT.md`,
  `docs/OPERATING_TRUTH.md`, this changelog, and six focused runtime audit
  reports.
- **Runtime findings:** The Brain gateway, capability-router entry,
  orchestrator, connected-app authentication, artifact store, jobs, approvals,
  and adult policy are live. The Phase 1 provider discovery/scoring layer is
  canonical but has no production execution caller. Current execution still
  uses compatibility provider/model/capability layers and hardcoded defaults.
  Agents, research, and most media paths are partial; image edit, avatar video,
  OCR, and voice cloning are not implemented as completed workflows.
- **Deleted items:** None. PR #116 deletes no code.
- **Canonical items:** GitHub and operating-law documents; `src/lib/providers/`
  for provider discovery/scoring; Brain gateway and capability-router entry;
  current orchestrator ownership; artifact store; connected-app auth; app
  policy.
- **Known issues:** Static model catalogs and defaults remain live; prohibited
  provider remnants exist in legacy files and seed data; capability truth has
  multiple compatibility projections; team and some task/job state is
  process-local; media and research proof is incomplete.
- **Next PR target:** Cut one capability family from compatibility routing to
  Phase 1 discovery with parity tests, then remove only the superseded truth
  for that family.

## PR 117

- **Purpose:** Make the Brain the only V1 runtime execution path and promote the
  provider truth, live discovery, and scoring layer to production truth.
- **Files Changed:** Status and operating documents first; canonical Brain,
  capability routing, provider execution, media architecture, agent truth, and
  focused parity tests as required by the cutover.
- **Execution Changes:** The capability router now resolves provider truth,
  live discovery, scoring, and adapter candidates. The compatibility
  orchestrator, specialist media routes, Music Studio, connected-app
  capability engine, stream route, and agent runtime enter this path. Connected
  apps submit scoped capabilities only; provider, model, and endpoint overrides
  are rejected. Adapters require the discovered model and cannot invent a
  default. Missing evidence returns `NO_ROUTE_FOUND`.
- **Deleted Legacy Components:** Removed the runtime-dead legacy orchestration
  body and unused `src/lib/capability-gaps.ts`. Specialist route-local routing,
  policy, and artifact implementations were replaced by thin delegates.
- **Capability Coverage:** Chat, reasoning, research, image, image edit, video,
  image to video, music, TTS, STT, avatar, OCR, documents, embeddings, rerank,
  adult, memory, and artifacts are in the cutover audit. Unsupported discovery
  results return `NO_ROUTE_FOUND`.
- **Remaining Work:** Research remains `PARTIAL`; long-form video has the final
  storyboard-to-artifact architecture but incomplete voice/music composition
  runtime. Deployment must prove live catalog evidence and each desired
  capability. Active Labs/LiteLLM compatibility imports were not deleted
  without parity and are not canonical product execution.
- **Next PR:** #118 Research Completion, followed by #119 Dashboard Completion,
  #120 Website Completion, and #121 Marketing App Integration.
