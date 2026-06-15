READ THIS FILE FIRST.

# AmarktAI Network V1

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-15
- **PR Number:** #118
- **Purpose:** Complete provider runtime evidence and recover critical dashboard
  execution while preserving the PR #114-#117 architecture.
- **Completed:** Dynamic provider/model evidence fallback, provider
  diagnostics, Studio/Playground/assistant routing repair, Hugging Face
  task-filtered discovery, and Together native adapter completion.
- **Working:** One Brain, one capability router, six providers, canonical jobs,
  artifacts, adult policy, and signed connected-app execution.
- **Partial:** Production live execution, token streaming, research, long-form
  assembly, avatar, music, and advanced MiMo voice/omni require truthful proof.
- **Broken At Start:** Exact model-task matching rejected discovered models
  whose provider catalogs omitted task metadata. Studio used a static
  pre-router whose selected overrides were rejected by canonical execution.
- **Proof:** `npx tsc --noEmit`, 496/496 tests, and the 183-page production
  build pass. No production credentials were available for live latency or
  artifact proof.
- **Next PR:** #119 Research Completion after production smoke verification.

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
