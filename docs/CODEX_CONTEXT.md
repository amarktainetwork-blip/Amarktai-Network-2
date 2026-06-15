READ THIS FILE FIRST.

# AmarktAI Network V1

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
