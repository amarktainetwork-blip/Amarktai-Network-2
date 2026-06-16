# AmarktAI AI Changelog

Every pull request that changes AI architecture, providers, models,
capabilities, routing, execution, artifacts, memory, agents, research, adult
policy, or operating truth must update this file.

| Date | PR | Branch | Files Changed | Summary | Providers | Capabilities | Blockers | Next Steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Groq provider truth, focused discovery/auth/tooling tests, operating docs | Audit and tighten Groq completion truth without redesigning the runtime. Canonical Groq provider truth keeps async jobs false, preserves chat plus Groq-native TTS/STT support, and removes unproven agent/tool-calling claims that could otherwise create false provider-contract routes from empty Groq catalogs. | Groq. | chat, reasoning, coding, vision, TTS, STT, discovery metadata. | No live Groq provider proof is recorded here beyond prior chat/TTS smoke references. Groq image/video generation and tool-calling are not proven canonical runtime contracts, and canonical Brain async polling still does not exist. | Keep apps capability-only, keep Groq async truth narrowed, and only upgrade Groq rows after authenticated live provider proof. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Hugging Face provider truth, specialist auth aliases, focused provider/discovery tests, operating docs | Audit and tighten Hugging Face completion truth without redesigning the runtime. Canonical HF provider truth keeps async jobs false, represents Hub task discovery plus inference-provider/private/dedicated endpoint metadata conservatively, and no longer claims unproven tool-calling or agent support. The Hugging Face specialist execution path now honors the same auth aliases as canonical provider truth. | Hugging Face. | chat, reasoning, coding, image, video, music, TTS, STT, OCR, embeddings, rerank, documents, avatar, discovery metadata. | No live Hugging Face provider proof is recorded here beyond prior chat connectivity smoke. Non-chat HF rows remain partial without authenticated live proof, and canonical Brain async HF polling still does not exist. | Keep apps capability-only, keep HF async truth narrowed until Brain local polling exists, and upgrade HF rows only after authenticated live provider proof. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | GenX provider truth, provider discovery, focused GenX contract tests, operating docs | Audit GenX completion truth and fix only the proven runtime gap. Canonical GenX provider discovery now honors `GENX_API_URL` and normalizes GenX base URLs the same way as the runtime client. GenX provider truth is narrowed to the families the current repo actually wires and proves conservatively. Focused tests now cover GenX discovery fallback, degraded-health fallback routing, Brain image local polling contract, and canonical artifact persistence after completed GenX polling. | GenX. | chat, reasoning, coding, image, video, music, TTS, async media polling. | No live GenX provider proof is recorded in this repo. Video, music, and TTS remain partial without live proof. Image is locally proven only; image-to-video, avatar, STT, documents, agents, and adult media remain unproven/unsupported in canonical GenX truth. | Keep apps capability-only, keep Brain local media polling canonical, and upgrade GenX rows only after authenticated live provider proof. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Together provider truth tests and operating docs | Audit and tighten Together provider truth without changing architecture. The repo already supports Together auth, dynamic discovery, native image/video routes, canonical Brain local async video polling, and local artifact completion. This update keeps unsupported families out of Together provider truth and keeps non-proven capability rows conservative. | Together. | image, video, image-to-video, TTS, STT, embeddings, rerank, async media polling. | Together image/video contracts are wired locally, but most non-image capability rows remain partial pending live proof. | Keep Together apps capability-only, preserve Brain local polling as the canonical async surface, and only upgrade rows when live proof exists. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Qwen paid-gating env truth, tests, docs | Confirm Qwen paid-only models remain blocked unless `QWEN_PAID_ENABLED=true` exactly. Add the env-example default `QWEN_PAID_ENABLED="false"` and document that free-token-only operation must keep paid routing disabled. | Qwen. | free-quota routing safety only. | Paid Qwen routing remains opt-in only; live proof status is unchanged. | Keep free-token-only deployments at unset/`false` and upgrade Qwen proof conservatively. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Qwen provider truth tests and operating docs | Audit and tighten Qwen provider truth without changing architecture. The repo already supports Qwen auth aliases, dynamic discovery, free-quota gating through `QWEN_PAID_ENABLED`, compatible-mode text routes, AIGC media routes, embeddings, and canonical Brain local Wanx polling. This update keeps unsupported families out of Qwen provider truth and keeps non-chat capability proof conservative. | Qwen. | chat, reasoning, coding, image, video, image-to-video, embeddings, translation, async media polling. | Qwen chat remains the only row treated as proven here; reasoning and other non-chat Qwen rows remain partial pending further live proof. | Keep Qwen apps capability-only, preserve Brain polling as the canonical async surface, and upgrade rows only when live proof exists. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Admin integration key truth, provider tests, operating docs | Align admin provider-key truth with the six approved V1 providers only. `/api/admin/integration-keys` now represents Hugging Face, Together, Groq, GenX, Qwen, and MiMo, and continues to avoid app-facing provider/model selection. | HF, Together, Groq, GenX, Qwen, MiMo. | Admin/provider configuration truth only. | Live capability proof remains unchanged; provider key coverage does not upgrade capability proof. | Keep app callers capability-only and keep admin/provider surfaces aligned with Brain runtime truth. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Canonical media polling truth, provider truth, focused tests | Align canonical async media polling truth with the real Brain runtime. Together video jobs now poll through the canonical Brain local media-job surface using the existing adapter poll contract. Hugging Face async job truth is narrowed because no canonical Brain polling contract exists yet. `/api/brain/video-generate/:jobId` remains legacy compatibility only. | Together, Hugging Face. | async media jobs, video_generation. | Live provider proof remains incomplete; this change aligns runtime truth and contract coverage only. | Continue using Brain local media job URLs as the canonical app polling surface and keep legacy video polling as compatibility only. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Dashboard nav truth docs and tests | Align shipped dashboard navigation with V1 operating truth by restoring Capabilities to canonical nav and removing Providers from canonical nav presentation. Providers remains reachable only as a legacy diagnostic route. | None. | Dashboard surface only. | Capabilities remains a legacy runtime page and Providers remains legacy diagnostics. | Keep dashboard navigation aligned with operating truth while Brain runtime remains source of truth. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | Provider scoring, media contract test, operating docs | Fix the GenX fallback routing gate exposed by VPS proof. A failed live model-discovery check can mark GenX health as degraded; configured GenX static runtime fallback candidates now remain routable so the adapter call can prove success or return the real provider error. | GenX. | image first; applies to explicit GenX static runtime fallback candidates. | GenX image execution still needs a fresh VPS smoke after pulling this fix. GenX image remains incomplete until the Brain `pollUrl` completes and a canonical artifact persists. | Pull the branch on VPS, rerun the focused media contract test/build, restart `amarktai-platform.service`, keep `amarktai-worker.service` aligned with the same deploy, then retry GenX image and poll the Brain media job. |
| 2026-06-16 | #118 follow-up | `integration/cline-source-of-truth` | GenX provider discovery, media contract test, operating docs | Move the GenX static runtime catalog fallback from VPS-local experimentation into GitHub source of truth. GenX still attempts live `/api/v1/models` discovery first; when that fails, discovery returns known GenX runtime models as provider-contract candidates with an explicit fallback error. | GenX. | Discovery candidates for image, image edit, video, image-to-video, avatar, music, TTS, STT, adult image, and adult video. Execution proof is unchanged. | This environment still cannot run dependency install/build, and the VPS public smoke is blocked by a wrong service restart target. GenX job completion is not yet proven. | Pull the branch on VPS, preserve dirty local provider/orchestrator changes before replacing them, identify the correct runtime services, rerun the focused media contract test and build, then start and poll GenX image to artifact completion. |
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
