READ THIS FILE FIRST.

# AmarktAI Network V1

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-16
- **PR Number:** #118 follow-up on `integration/cline-source-of-truth`
- **Purpose:** Complete provider runtime evidence and recover critical dashboard
  execution while preserving the PR #114-#117 architecture.
- **Completed:** Dynamic provider/model evidence fallback, provider
  diagnostics, Studio/Playground/assistant routing repair, Hugging Face
  task-filtered discovery, Together native adapter completion, Brain media
  polling recovery for async image/provider jobs, GitHub-tracked GenX static
  runtime catalog fallback when live GenX model discovery fails, GenX fallback
  routing through degraded discovery-health, canonical GenX discovery base URL
  handling for `GENX_BASE_URL` and `GENX_API_URL`, and canonical Hugging Face
  auth-alias alignment across provider config and specialist execution.
- **Working:** One Brain, one capability router, six providers, canonical jobs,
  artifacts, adult policy, signed connected-app execution, external Brain
  media polling by local job id, and GenX discovery candidates from the existing
  runtime catalog when `/api/v1/models` is unavailable. Focused tests now prove
  the Brain image local polling contract and canonical artifact persistence for
  completed GenX jobs.
- **Partial:** Production live execution, token streaming, research, long-form
  assembly, avatar, music, and advanced MiMo voice/omni require truthful proof.
- **Broken At Start:** Exact model-task matching rejected discovered models
  whose provider catalogs omitted task metadata. Studio used a static
  pre-router whose selected overrides were rejected by canonical execution.
  External `/api/brain/media-jobs/:jobId` polling also returned Unauthorized.
  VPS-local GenX discovery fallback existed outside GitHub until the 2026-06-16
  follow-up. VPS proof then exposed that degraded discovery-health could still
  suppress the explicit GenX fallback route.
- **Proof:** Previous PR #118 proof remains `npx tsc --noEmit`, 496/496 tests,
  and the 183-page production build. VPS proof on 2026-06-16 confirmed install,
  Prisma generation, TypeScript, the focused media contract test, production
  build, local site health, and API health. GenX image still failed with
  `NO_ROUTE_FOUND` before the degraded-health fallback routing fix; rerun VPS
  proof after pulling the latest commit.
- **Next Step:** On the VPS, pull the branch, rerun the focused media contract
  test and build, restart `amarktai-platform.service`, keep
  `amarktai-worker.service` aligned with the same deploy, start a GenX image
  job, poll the returned Brain `pollUrl`, and confirm canonical artifact
  completion before marking GenX image complete.

Single source of truth:

```text
GitHub repo
+
OPERATING_TRUTH.md
+
CHANGELOG_AI.md
```

Current operator truth:

- Branch: `integration/cline-source-of-truth`
- VPS path: `/var/www/amarktai/platform`
- Services: `amarktai-platform.service` and `amarktai-worker.service`
- DB: MariaDB/MySQL
- Standalone deploy: `.next/static` and `public` must be copied into
  `.next/standalone`
- Dashboard reflects Brain runtime; the dashboard is not source of truth
- Canonical V1 dashboard nav: Command Center, Studio, Capabilities, Connected
  Apps, Jobs, Artifacts, and Settings
- `/admin/dashboard/providers` may remain reachable as a legacy diagnostic page,
  but it is not canonical V1 navigation
- Canonical Brain local async media polling currently supports GenX, Qwen, and
  Together
- Canonical GenX provider truth is conservative: chat, reasoning, coding,
  image, text-to-video, music, and TTS are represented; image-to-video, avatar,
  STT, vision, documents, agents, and adult GenX families are not currently
  claimed as working canonical provider truth
- Hugging Face async job truth is narrowed until canonical Brain polling exists
- Hugging Face auth aliases are `HUGGINGFACE_API_KEY`,
  `HUGGINGFACEHUB_API_TOKEN`, and `HF_TOKEN`
- Hugging Face dynamic discovery locally proves Hub task metadata,
  inference-provider metadata, and configured private/dedicated endpoint
  metadata
- Hugging Face canonical provider truth keeps `asyncJobs: false` and does not
  claim unproven tool-calling or agents support
- `/api/brain/video-generate/:jobId` is legacy compatibility only; apps poll
  `/api/brain/media-jobs/:jobId`
- Admin provider-key truth covers only the six approved V1 providers:
  Hugging Face, Together, Groq, GenX, Qwen, and MiMo
- App-facing callers remain capability-only and cannot choose provider, model,
  or endpoint
- Qwen auth aliases are `QWEN_API_KEY` and `DASHSCOPE_API_KEY`
- Qwen free-quota gating exists in canonical scoring through
  `QWEN_PAID_ENABLED`
- Keep `QWEN_PAID_ENABLED` unset or `false` for free-token-only operation
- Qwen Wanx async media jobs poll canonically through Brain local media job URLs
- Keep Qwen non-chat capability proof conservative unless live proof upgrades it
- Together auth alias is `TOGETHER_API_KEY`
- Together image uses the native provider image generation route
- Together video polls canonically through Brain local media job URLs and local
  artifact persistence
- Keep Together non-image/video capability proof conservative unless live proof
  upgrades it
- GenX image is locally proven to return a Brain local job id plus separate
  `providerJobId`, to return `/api/brain/media-jobs/:jobId` as `pollUrl`, and
  to persist a canonical artifact after completed local polling
- GenX still lacks live-provider proof in this repo; keep video, music, and TTS
  partial and keep image-to-video, avatar, STT, vision, documents, agents, and
  adult GenX rows conservative
- Hugging Face non-chat capability rows remain conservative `partial` or
  `unknown` until authenticated live proof upgrades them

Never:

- Hardcode providers.
- Hardcode models.
- Duplicate routing logic.
- Duplicate provider configs.
- Duplicate capability lists.
- Let apps call providers directly.

Everything flows:

```text
APP
  -> BRAIN
  -> CAPABILITY
  -> ROUTER
  -> PROVIDER
  -> ARTIFACT
  -> APP
```

Production ownership:

- `src/lib/providers/*`: provider truth, discovery, cache, health, profiles,
  scoring, and route planning.
- `src/lib/capability-router.ts`: stable product execution entry.
- `src/lib/orchestrator.ts`: policy, adapter execution, jobs, and artifacts.
- `src/lib/ai-capability-adapters.ts`: provider-native protocol calls only;
  adapters never select a fallback model.
- `/api/brain/request`, `/api/brain/execute`, `/api/brain/stream`: public Brain
  entry surfaces. Specialist routes are compatibility delegates.
- `/api/brain/media-jobs/:jobId`: public Brain polling surface for opaque local
  media job ids returned by capability execution. It must not require an admin
  dashboard session.

## Working Rules

1. Read `OPERATING_TRUTH.md`, `ARCHITECTURE.md`, `PROVIDER_MATRIX.md`, and
   `CHANGELOG_AI.md` before changing AI behavior.
2. Treat Hugging Face, Together, Groq, GenX, Qwen, and MiMo as backend
   providers, not product identities.
3. Route by capability, discovery, model discovery, scoring, and execution.
4. Treat adult as a policy-gated capability, never as a provider.
5. Keep models dynamic and discovery-based.
6. Return truthful results, jobs, artifacts, or blockers.
7. Update `CHANGELOG_AI.md` in every relevant PR.
8. Update `PROVIDER_MATRIX.md` when provider capability truth changes.
9. Update `OPERATING_TRUTH.md` when architecture rules change.

GitHub is the only source of truth. Chat history is not.
