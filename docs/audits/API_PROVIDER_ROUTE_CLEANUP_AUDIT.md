# API Provider Route Cleanup Audit

**Date:** 2026-05-04  
**Branch:** copilot/provider-api-governance-cleanup  
**Scope:** Provider-facing API routes and their governance classification.

---

## Classification Key

| Status | Meaning |
|--------|---------|
| `ACTIVE_CANONICAL` | Active, should be called by frontend/UI as the single authoritative path |
| `ACTIVE_ALIAS` | Active, but duplicates a canonical route. Backend only — UI must use canonical |
| `HIDDEN_POST_LAUNCH` | Exists in code but should not be surfaced in product UI until approved |
| `DEPRECATED_DO_NOT_SHOW` | Deprecated; do not call from UI; keep for rollback safety only |
| `REMOVE_SAFE` | No callers found; safe to delete in a future cleanup PR |
| `KEEP_INTERNAL_ONLY` | Used internally by server-side code only; never expose to frontend |

---

## GitHub Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/github/repos` | `ACTIVE_ALIAS` | Legacy direct GitHub wrapper. UI should use `/api/admin/repo-workbench/github/repos` (canonical) |
| `/api/admin/github/branches` | `ACTIVE_ALIAS` | Legacy alias; use `/api/admin/repo-workbench/github/branches` in UI |
| `/api/admin/github/deploy` | `ACTIVE_ALIAS` | Legacy deploy trigger; use repo-workbench `deploy` workspace route |
| `/api/admin/github/file` | `ACTIVE_ALIAS` | Legacy file read/write; use repo-workbench `file` workspace route |
| `/api/admin/github/import` | `ACTIVE_ALIAS` | Legacy import; use `/api/admin/repo-workbench/import` |
| `/api/admin/github/pr` | `ACTIVE_ALIAS` | Legacy PR creation; use repo-workbench `pr` workspace route |
| `/api/admin/github/push` | `ACTIVE_ALIAS` | Legacy push; use repo-workbench `push` workspace route |
| `/api/admin/github/tree` | `ACTIVE_ALIAS` | Legacy tree; use repo-workbench `tree` workspace route |
| `/api/admin/github/validate` | `ACTIVE_ALIAS` | Legacy token validation; use `/api/admin/repo-workbench/github/status` |

**UI Rule:** Settings and Repo Workbench must exclusively call `/api/admin/repo-workbench/github/*` routes.  
`/api/admin/github/*` routes may remain as backend aliases but must not be linked from any UI navigation or provider card.

---

## Repo Workbench Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/repo-workbench/github/status` | `ACTIVE_CANONICAL` | Token health check. Used by Repo Workbench and Settings GitHub section |
| `/api/admin/repo-workbench/github/repos` | `ACTIVE_CANONICAL` | Repo listing |
| `/api/admin/repo-workbench/github/branches` | `ACTIVE_CANONICAL` | Branch listing |
| `/api/admin/repo-workbench/github/prs` | `ACTIVE_CANONICAL` | PR listing |
| `/api/admin/repo-workbench/github/token` | `ACTIVE_CANONICAL` | Token resolution (read) |
| `/api/admin/repo-workbench/import` | `ACTIVE_CANONICAL` | Import a repo into workbench |
| `/api/admin/repo-workbench/repos` | `ACTIVE_CANONICAL` | List tracked repos |
| `/api/admin/repo-workbench/jobs` | `ACTIVE_CANONICAL` | List workbench jobs |
| `/api/admin/repo-workbench/jobs/[jobId]` | `ACTIVE_CANONICAL` | Job detail |
| `/api/admin/repo-workbench/jobs/[jobId]/logs` | `ACTIVE_CANONICAL` | Job logs |
| `/api/admin/repo-workbench/status` | `ACTIVE_CANONICAL` | Workbench status summary |
| `/api/admin/repo-workbench/models` | `ACTIVE_CANONICAL` | AI model list for workbench |
| `/api/admin/repo-workbench/[workspaceId]/*` | `ACTIVE_CANONICAL` | All workspace-scoped operations |
| `/api/admin/repo-workbench/simple` | `DEPRECATED_DO_NOT_SHOW` | Legacy simple workbench. Keep for rollback safety. Do not link from UI. |
| `/api/admin/repo-workbench/safe-test` | `KEEP_INTERNAL_ONLY` | Safety/regression test route. Not for UI. |

---

## Provider Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/providers` | `ACTIVE_CANONICAL` | List/create provider records. Settings uses this. |
| `/api/admin/providers/[id]` | `ACTIVE_CANONICAL` | Read/update/delete a single provider record |
| `/api/admin/providers/[id]/health-check` | `ACTIVE_CANONICAL` | Test a configured provider key |
| `/api/admin/providers/health-check-all` | `ACTIVE_CANONICAL` | Test an unconfigured (new) key before saving |
| `/api/admin/providers/catalog` | `ACTIVE_CANONICAL` | Returns canonical provider list from `provider-catalog.ts` |
| `/api/admin/provider-capability-test` | `KEEP_INTERNAL_ONLY` | Advanced provider capability testing. Admin diagnostics only. |
| `/api/admin/provider-governance` | `ACTIVE_CANONICAL` | Governance metadata. Used by dashboard AI Engine pages. |
| `/api/admin/provider-scores` | `ACTIVE_CANONICAL` | Scoring/performance metrics for configured providers |

---

## Integration Key Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/settings/integrations` | `ACTIVE_CANONICAL` | **Single canonical route for saving and reading integration keys from vault.** All Settings sections use this. |
| `/api/admin/integration-keys` | `ACTIVE_ALIAS` | Legacy key listing. UI should use `/api/admin/settings/integrations`. Keep backend only. |
| `/api/admin/integrations` | `ACTIVE_ALIAS` | Legacy integrations CRUD. UI must use `/api/admin/settings/integrations`. |
| `/api/admin/integrations/[id]` | `ACTIVE_ALIAS` | Legacy single integration. Same as above. |
| `/api/admin/integrations-status` | `ACTIVE_CANONICAL` | Integration health status for dashboard widgets |
| `/api/admin/integration-hub` | `KEEP_INTERNAL_ONLY` | Hub aggregation for partner integrations. Not for primary Settings UI. |

**UI Rule:** Settings page must use `/api/admin/settings/integrations` (PATCH) as the only save route.  
Runtime truth must use `getServiceKey()` from `service-vault.ts` as the only key resolution path.

---

## Model/AI Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/models` | `ACTIVE_ALIAS` | Legacy model registry list. Use `/api/admin/providers/catalog` for provider-specific models, or `/api/admin/media-studio/models` for media models. |
| `/api/admin/ai-model-catalog` | `ACTIVE_CANONICAL` | AI model catalog with filtering. Primary model discovery for AI Engine pages. |
| `/api/admin/media-studio/models` | `ACTIVE_CANONICAL` | Media-scoped model availability (image/video/voice/music). Must reflect actual route implementations. |
| `/api/admin/repo-workbench/models` | `ACTIVE_CANONICAL` | Coding-specific model list for Repo Workbench. |

---

## GenX Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/genx/status` | `ACTIVE_CANONICAL` | GenX gateway health and model count. Used by AI Engine hub. |
| `/api/admin/settings/test-genx` | `ACTIVE_CANONICAL` | Test a GenX key from Settings. Canonical test route for GenX. |

---

## Brain Routes (Generation)

| Route | Status | Notes |
|-------|--------|-------|
| `/api/brain/request` | `ACTIVE_CANONICAL` | Primary text/chat generation route |
| `/api/brain/stream` | `ACTIVE_CANONICAL` | Streaming text generation |
| `/api/brain/image` | `ACTIVE_CANONICAL` | Image generation dispatcher |
| `/api/brain/image-edit` | `ACTIVE_CANONICAL` | Image editing |
| `/api/brain/video` | `ACTIVE_CANONICAL` | Video generation |
| `/api/brain/video-generate` | `ACTIVE_ALIAS` | Alias for `/api/brain/video`. Backend consolidation needed. |
| `/api/brain/tts` | `ACTIVE_CANONICAL` | Text-to-speech generation |
| `/api/brain/stt` | `ACTIVE_CANONICAL` | Speech-to-text |
| `/api/brain/embeddings` | `ACTIVE_CANONICAL` | Embedding generation |
| `/api/brain/research` | `ACTIVE_CANONICAL` | Web research / Firecrawl route |
| `/api/brain/agent` | `ACTIVE_CANONICAL` | Agent planning/execution |
| `/api/brain/agent-request` | `ACTIVE_ALIAS` | Alias for `/api/brain/agent`. Should be consolidated. |
| `/api/brain/execute` | `ACTIVE_CANONICAL` | Function/tool execution |
| `/api/brain/relay` | `KEEP_INTERNAL_ONLY` | GenX relay proxy. Not for direct frontend calls. |
| `/api/brain/rerank` | `ACTIVE_CANONICAL` | Reranking (Cohere-compatible). |
| `/api/brain/moderation` | `ACTIVE_CANONICAL` | Content moderation |
| `/api/brain/adult-image` | `ACTIVE_CANONICAL` | Adult image generation — guarded by adult mode gate. |
| `/api/brain/adult-text` | `ACTIVE_CANONICAL` | Adult text generation — guarded by adult mode gate. |
| `/api/brain/suggestive-image` | `ACTIVE_CANONICAL` | Suggestive (non-explicit) image route — guarded by adult mode gate. |
| `/api/brain/suggestive-video` | `ACTIVE_CANONICAL` | Suggestive video route — guarded by adult mode gate. |
| `/api/brain/suggestive-video-gen` | `ACTIVE_ALIAS` | Alias for `/api/brain/suggestive-video`. Consolidate in future. |
| `/api/admin/brain` | `KEEP_INTERNAL_ONLY` | Admin brain diagnostics. Not for product UI. |
| `/api/admin/brain/events` | `KEEP_INTERNAL_ONLY` | Brain event stream. Internal monitoring only. |
| `/api/admin/brain/test` | `KEEP_INTERNAL_ONLY` | Brain route test harness. Admin diagnostics only. |

---

## Voice Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/voice/options` | `ACTIVE_CANONICAL` | Voice model/provider options for Aiva configuration |
| `/api/admin/voice/preview` | `ACTIVE_CANONICAL` | Preview voice output |
| `/api/admin/voice-access-settings` | `ACTIVE_CANONICAL` | Voice access control settings |
| `/api/admin/voice-login` | `ACTIVE_CANONICAL` | Voice-based login |
| `/api/admin/voice-persona` | `ACTIVE_CANONICAL` | Voice persona configuration |

---

## Tools, Workflows, Webhooks

| Route | Status | Notes |
|-------|--------|-------|
| `/api/tools` | `ACTIVE_CANONICAL` | Tool registry and dispatch |
| `/api/workflows` | `ACTIVE_CANONICAL` | Workflow CRUD and execution |
| `/api/webhooks` | `ACTIVE_CANONICAL` | Inbound webhook handling |

---

## Runtime Truth Route

| Route | Status | Notes |
|-------|--------|-------|
| `/api/admin/runtime-truth` | `ACTIVE_CANONICAL` | **Single source of truth for all dashboard sections.** All Live Readiness, AI Engine, and provider status checks must call this route. |

---

## Provider Policy Summary

### Primary Providers (visible in Settings)
1. GenX Gateway
2. GitHub
3. Qwen / DashScope (aliases: QWEN_API_KEY, DASHSCOPE_API_KEY)
4. MiniMax / Mimo (aliases: MINIMAX_API_KEY, MIMO_API_KEY)
5. DeepSeek
6. Google Gemini
7. Hugging Face (aliases: HUGGINGFACE_API_KEY, HUGGINGFACEHUB_API_TOKEN, HF_TOKEN)
8. Groq
9. Together AI
10. Firecrawl
11. Mem0
12. Webdock

### Specialist Providers (visible in Settings)
13. Replicate (aliases: REPLICATE_API_TOKEN, REPLICATE_API_KEY)
14. ElevenLabs
15. Deepgram

### Advanced Providers (collapsed in Settings — not primary product story)
1. OpenAI Direct
2. OpenRouter
3. xAI / Grok (aliases: XAI_API_KEY, GROK_API_KEY)
4. Moonshot / Kimi
5. Zhipu AI / GLM

### Hidden Providers (never shown in primary UI)
- Cohere (deprecated — available through GenX/HuggingFace)
- Mistral Direct (deprecated — available through GenX/HuggingFace/OpenRouter)

### Post-Launch Backlog (not in UI — this document only)
- Suno, Udio (music — requires API and legal approval)
- Perplexity, Tavily, Jina (research candidates)
- RunPod, fal.ai (specialist media candidates)
- Fireworks AI, Cerebras (cheap inference candidates)

---

## UI Canonical Routes Table

| Settings Section | Save Route | Test Route | Read Route |
|-----------------|------------|------------|------------|
| Provider API keys | `PATCH /api/admin/providers` or `PATCH /api/admin/providers/[id]` | `POST /api/admin/providers/[id]/health-check` | `GET /api/admin/providers` |
| GitHub | `PATCH /api/admin/settings/integrations` | `POST /api/admin/settings/test-github` | `GET /api/admin/settings/integrations` |
| GenX | `PATCH /api/admin/settings/integrations` | `POST /api/admin/settings/test-genx` | `GET /api/admin/settings/integrations` |
| Firecrawl / Mem0 / PostHog / Qdrant | `PATCH /api/admin/settings/integrations` | N/A | `GET /api/admin/settings/integrations` |
| Webdock | `PATCH /api/admin/settings/integrations` | `POST /api/admin/settings/test-webdock` | `GET /api/admin/settings/integrations` |
| Adult Mode | `PATCH /api/admin/settings/integrations` | `POST /api/admin/settings/test-adult` | `GET /api/admin/settings/integrations` |
| Runtime Truth | N/A | N/A | `GET /api/admin/runtime-truth` |

---

*This document is maintained as part of the provider governance cleanup.*  
*See also: `src/lib/ai-provider-governance.ts` for the authoritative provider governance list.*
