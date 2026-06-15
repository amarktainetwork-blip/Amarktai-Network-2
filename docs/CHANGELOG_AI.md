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
