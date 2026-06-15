READ THIS FILE FIRST.

# AmarktAI Network V1

# CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-15
- **PR Number:** #116
- **Completed:** Runtime ownership and readiness audit for Brain, providers,
  models, agents, media, research, and every admin page.
- **In Progress:** PR #116 documentation review and merge.
- **Blocked:** Production execution does not yet consume Phase 1 dynamic model
  discovery. Several media and research contracts remain partial or absent.
- **Next Steps:** Use `RUNTIME_TRUTH_20260615.md` to perform a narrow,
  capability-by-capability parity cutover.
- **Known Technical Debt:** Duplicate compatibility registries, hardcoded
  models, prohibited-provider remnants, and process-local task/team stores.
- **Runtime Truth Summary:** `src/lib/providers/` is canonical architecture but
  currently unused by production execution. `capability-router.ts` delegates
  to the live legacy-dependent orchestrator. Artifacts are canonical and real.
  PR #116 changes documentation only.

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
