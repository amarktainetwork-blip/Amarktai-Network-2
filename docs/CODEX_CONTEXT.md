READ THIS FILE FIRST.

# AmarktAI Network V1

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-15
- **PR Number:** #117
- **Purpose:** Complete the final V1 Brain architecture and prohibit execution
  outside the canonical capability, discovery, scoring, and artifact path.
- **Completed:** The Brain capability router is the production execution
  owner. It resolves canonical capabilities, discovers provider models, scores
  candidates, executes provider-native adapters, records jobs, and persists
  artifacts. Specialist routes and agents delegate to it.
- **Remaining:** Research completion and deployment proof for each provider
  capability family. PRs #119-#121 own dashboard, website, and Marketing App.
- **Known Issues:** Research and long-form video remain partial. Compatibility
  role names and selected admin diagnostics remain, but cannot choose a
  provider/model for product execution.
- **Go Live Readiness:** Signed apps can execute only when live discovery
  returns evidence. Otherwise the stable result is `NO_ROUTE_FOUND`.
- **Next PR:** #118 Research Completion.

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
