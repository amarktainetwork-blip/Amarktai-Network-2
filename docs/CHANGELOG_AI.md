# AmarktAI AI Changelog

Every pull request that changes AI architecture, providers, models,
capabilities, routing, execution, artifacts, memory, agents, research, adult
policy, or operating truth must update this file.

| Date | PR | Branch | Files Changed | Summary | Providers | Capabilities | Blockers | Next Steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Provider scoring, media contract test, operating docs | Fix the GenX fallback routing gate exposed by VPS proof. A failed live model-discovery check can mark GenX health as degraded; configured GenX static runtime fallback candidates now remain routable so the adapter call can prove success or return the real provider error. | GenX. | image first; applies to explicit GenX static runtime fallback candidates. | GenX image execution still needs a fresh VPS smoke after pulling this fix. | Pull the branch on VPS, rerun the focused media contract test/build, restart `amarktai-platform.service`, then retry GenX image and poll the Brain media job. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | GenX provider discovery, media contract test, operating docs | Move the GenX static runtime catalog fallback from VPS-local experimentation into GitHub source of truth. GenX still attempts live `/api/v1/models` discovery first; when that fails, discovery returns known GenX runtime models as provider-contract candidates with an explicit fallback error. | GenX. | Discovery candidates for image, image edit, video, image-to-video, avatar, music, TTS, STT, adult image, and adult video. Execution proof is unchanged. | This environment still cannot run dependency install/build, and the VPS public smoke is blocked by a wrong web service restart target returning 502. GenX job completion is not yet proven. | Pull the branch on VPS, preserve dirty local provider/orchestrator changes before replacing them, identify the correct web service/process, rerun the focused media contract test and build, then start and poll GenX image to artifact completion. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Brain image route, Brain media-job poll route, media contract test, operating docs | Expose local Brain poll URLs and provider job ids from `/api/brain/image`; remove dashboard-session auth from `/api/brain/media-jobs/:jobId`; document that apps poll Brain local jobs and completion requires artifact/media persistence. | GenX path targeted; provider rule applies to async media jobs generally. | image_generation, artifacts, async media jobs. | This environment could not install dependencies because registry access returned 403 for a locked package, and terminal HTTP calls to the live site were blocked. Live VPS smoke proof remains required. | Deploy branch to VPS, start a GenX image job, poll the returned Brain `pollUrl`, confirm completed artifact/media URL, then continue GenX video/music/avatar/TTS/STT provider proof. |
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
- **Root Cause At Start:** Dynamic discovery required exact model-level task
  tags. OpenAI-compatible catalogs commonly returned valid model IDs without
  task metadata, leaving configured healthy providers with zero candidates.
  Studio also preplanned through an obsolete static selector and passed
  provider/model overrides that canonical execution correctly rejected.
- **Providers Tested By Contract:** Hugging Face, Together, Groq, GenX, Qwen,
  and MiMo. Production credentials were unavailable, so no live provider
  success is claimed.
- **Capabilities Under Test:** Chat, streaming, image, video, TTS, STT,
  embeddings, rerank, moderation, avatar, and adult policy routes.
- **Completed:** Added exact metadata plus provider-contract evidence routing,
  task-filtered Hugging Face Hub discovery, Together native adapter completion,
  discovery-selected Qwen/MiMo/GenX tests, canonical Studio and Command Center
  plans, canonical assistant chat/stream delegates, dynamic provider
  diagnostics, and truthful `Wired` capability labels.
- **Proof:** `npm install` completed; TypeScript passed; 40 test files and
  496/496 tests passed; production build passed with 183 pages; diff check
  passed.
- **Remaining:** Run authenticated production provider tests and creative smoke
  proof on the VPS. True token streaming, research, long-form composition,
  avatar/music live proof, and MiMo voice clone/design/omni remain partial.
- **Next PR:** #118 Research Completion, followed by #119 Dashboard Completion,
  #120 Website Completion, and #121 Marketing App Integration.

## PR 118

- **Purpose:** Complete provider runtime discovery and recover dashboard
  execution without redesigning the final Brain architecture.
- **Root Cause At Start:** Dynamic discovery required exact model-level task
  tags. OpenAI-compatible catalogs commonly returned valid model IDs without
  task metadata, leaving configured healthy providers with zero candidates.
  Studio also preplanned through an obsolete static selector and passed
  provider/model overrides that canonical execution correctly rejected.
- **Providers Tested By Contract:** Hugging Face, Together, Groq, GenX, Qwen,
  and MiMo. Production credentials were unavailable, so no live provider
  success is claimed.
- **Capabilities Under Test:** Chat, streaming, image, video, TTS, STT,
  embeddings, rerank, moderation, avatar, and adult policy routes.
- **Completed:** Added exact metadata plus provider-contract evidence routing,
  task-filtered Hugging Face Hub discovery, Together native adapter completion,
  discovery-selected Qwen/MiMo/GenX tests, canonical Studio and Command Center
  plans, canonical assistant chat/stream delegates, dynamic provider
  diagnostics, and truthful `Wired` capability labels.
- **Proof:** `npm install` completed; TypeScript passed; 40 test files and
  496/496 tests passed; production build passed with 183 pages; diff check
  passed.
- **Remaining:** Run authenticated production provider tests and creative smoke
  proof on the VPS. True token streaming, research, long-form composition,
  avatar/music live proof, and MiMo voice clone/design/omni remain partial.
- **Next PR:** #119 Research Completion after production smoke verification.
