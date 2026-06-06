# Phase 1 Backend Source-of-Truth Takeover

## Enforced Rule

`src/lib/provider-mesh.ts` is the active provider/tool registry. Credential status reads `IntegrationConfig` first and approved environment aliases second through `src/lib/provider-mesh-status.ts`. Settings validation, live tests, runtime routing, governance, and readiness must delegate to that mesh.

## Takeover Matrix

| File path | Current problem | Action | Expected result | Remaining blockers |
|---|---|---|---|---|
| `src/lib/provider-mesh.ts` | Provider truth was split across catalogs and included unapproved media providers. | Replace | Only GenX, Hugging Face, Qwen, Xiaomi MiMo, Groq, Together AI, and approved tools are active. | Live connectivity requires credentials. |
| `src/lib/provider-mesh-status.ts` | Credentials needed one precedence rule. | Keep | Saved `IntegrationConfig` credentials win; only mesh-declared environment aliases may fall back. | None known. |
| `src/app/api/admin/settings/test-provider/route.ts` | Removed IDs could be tested and missing keys looked like failed connections. | Fix | Non-mesh IDs are rejected; missing credentials report `missing`; green status requires a real provider or local-tool pass. | External tests cannot pass until keys/services exist. |
| `src/lib/provider-config.ts` | Legacy provider helpers could become independent truth. | Redirect | Compatibility exports resolve mesh IDs/status only. | Legacy callers should gradually import mesh APIs directly. |
| `src/lib/brain.ts` | Runtime could read the old provider vault and execute removed adapters. | Redirect | Credential and execution gates require an approved mesh provider. | Legacy non-approved switch cases remain unreachable compatibility code and should be deleted in a later focused cleanup. |
| `src/lib/genx-client.ts` | GenX incorrectly depended on an old AI Engine URL convention. | Fix | Key is required; URL defaults to `https://query.genx.sh`; saved or environment URL is only an override. | Live model/media behavior depends on the GenX account. |
| `src/app/api/admin/settings/test-genx/route.ts` | Reachability errors could be counted as success and used old naming. | Fix | Chat success requires a successful response and failures are sanitized as GenX failures. | Media probe remains diagnostic, not a generation claim. |
| `src/lib/approved-ai-catalog.ts`, `src/lib/provider-catalog.ts`, `src/lib/ai-model-catalog.ts` | Catalogs advertised removed providers. | Replace | Active catalogs align with the mesh. | Large historical model data remains filtered from active exports. |
| `src/lib/runtime-capability-truth.ts`, `src/lib/provider-capability-governance.ts`, `src/lib/ai-provider-governance.ts` | Runtime/readiness had competing provider lists. | Replace | Capability and governance truth derive from tested mesh status. | Capabilities without a live test stay blocked. |
| `src/lib/readiness-audit.ts` | Readiness required direct OpenAI and audited obsolete providers. | Fix | Provider readiness checks cover the six approved AI providers only. | Broader legacy readiness checks require later simplification. |
| `src/lib/network-apps-registry.ts`, `src/app/api/admin/network-apps/route.ts` | Seeded apps presented unfinished products as connected. | Replace | API returns `apps: []` and the exact truthful empty-state message. | Real apps can be added only after completion and connection. |
| `src/app/admin/dashboard/network-apps/page.tsx` | Dashboard implied connected apps existed. | Replace | Truthful empty state only; no primary navigation entry. | None for Phase 1. |
| `src/app/admin/dashboard/agents/page.tsx`, `src/app/admin/dashboard/apps-agents/page.tsx` | Agent cards/readiness screens looked like products. | Redirect | Agents remain backend orchestration metadata and user routes return to Workspace. | Real job timelines may expose actual worker names later. |
| `src/lib/dashboard-nav.ts` | Navigation exposed Overview, Command, and fake Network Apps. | Replace | Primary navigation is Workspace, Outputs, Memory, Settings, System. | None for Phase 1. |
| `src/app/admin/dashboard/workspace/page.tsx` | No user-facing Workspace route existed. | Fix | Workspace hosts the existing command center. | UI refinement belongs to Phase 2. |
| `src/app/admin/dashboard/command/page.tsx` | Old links may still target Command. | Redirect | Old dashboard URL redirects to Workspace; `/api/admin/command` remains compatible. | Remove the redirect only after all external links migrate. |
| `src/lib/command-router.ts` | Required intents used removed providers and inconsistent surfaces. | Fix | Image, song, voice, repo audit, PR, and system checks route through Workspace and approved provider/tool strategies. | Unsupported live execution returns real blockers. |
| `src/lib/multimodal-pipeline.ts`, `src/lib/music-studio.ts` | Direct OpenAI, Suno, and removed media-provider environment paths bypassed mesh truth. | Replace | Media uses approved provider helpers; GenX owns music/audio/cover-art execution where supported. | No media success is claimed without a real returned URL. |
| `src/app/api/brain/video-generate/route.ts`, `src/app/api/brain/video-generate/[jobId]/route.ts` | Video jobs used removed providers. | Replace | GenX, Qwen, and Together are the only active video paths; failures remain real. | Provider-specific account/model support must be verified with keys. |
| `src/app/api/admin/artifacts/route.ts` | Artifact proxy allowlisted a removed provider CDN. | Fix | Removed-provider hosts are not fetched. | Audit every media endpoint for consistent `Artifact` persistence in Phase 2. |
| `.env.example` | Obsolete provider variables implied active support. | Delete | Example configuration contains only current stack variables. | Operators must add real secrets locally. |

## Residue Classification

- Older documents under `docs/audits/` are historical snapshots and are superseded by this takeover audit; references there do not describe the active stack.
- `src/lib/model-registry.ts` retains historical model records inside `LEGACY_MODEL_REGISTRY`, but exported `MODEL_REGISTRY` filters to approved provider IDs. It is not active provider truth.
- Tests that still describe removed providers are historical coverage outside the focused Phase 1 suite and should be migrated or retired in a later test-debt pass.
- Comments naming removed providers in legacy modules are non-executable residue; active adapters, settings validation, status truth, and routing no longer admit those IDs.

## Artifact Truth

Video completion persists a real artifact only after a provider returns a successful result URL. Other media paths are not uniformly linked to `Artifact` records yet. Phase 1 does not manufacture output records; consistent image, song, voice, and multimodal artifact persistence remains a Phase 2 blocker.

## Operational Handoff

After this PR, deployment setup should require only real database/runtime configuration and approved API keys. Provider cards remain missing or blocked until a live test succeeds; no connection is painted green from key presence alone.
