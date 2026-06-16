READ THIS FILE FIRST.

# AmarktAI Network V1

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-16
- **PR Number:** #118 follow-up on `integration/cline-source-of-truth`
- **Purpose:** Complete provider runtime evidence and recover critical dashboard
  execution while preserving the PR #114-#117 architecture.
- **Completed:** Dynamic provider/model evidence fallback, provider
  diagnostics, Studio/Playground/assistant routing repair, Hugging Face
  task-filtered discovery, Together native adapter completion, and Brain media
  polling recovery for async image/provider jobs.
- **Working:** One Brain, one capability router, six providers, canonical jobs,
  artifacts, adult policy, signed connected-app execution, and external Brain
  media polling by local job id.
- **Partial:** Production live execution, token streaming, research, long-form
  assembly, avatar, music, and advanced MiMo voice/omni require truthful proof.
- **Broken At Start:** Exact model-task matching rejected discovered models
  whose provider catalogs omitted task metadata. Studio used a static
  pre-router whose selected overrides were rejected by canonical execution.
  External `/api/brain/media-jobs/:jobId` polling also returned Unauthorized.
- **Proof:** Previous PR #118 proof remains `npx tsc --noEmit`, 496/496 tests,
  and the 183-page production build. On 2026-06-16 this environment could not
  install dependencies because registry access returned 403 for a locked
  package, and terminal HTTP calls to the live site were blocked; VPS proof must
  be run from the server.
- **Next Step:** Deploy the branch on the VPS, start a GenX image job, poll the
  returned Brain `pollUrl`, and confirm artifact completion before marking GenX
  image complete.

Single source of truth:

```text
GitHub repo
+
OPERATING_TRUTH.md
+
CHANGELOG_AI.md
```

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
