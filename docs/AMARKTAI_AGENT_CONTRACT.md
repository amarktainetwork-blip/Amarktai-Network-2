# AmarktAI Network — Agent Contract & Source of Truth

**Version:** 2.0.0  
**Date:** 2026-06-10  
**Status:** AUTHORITATIVE — All agents, PRs, and code changes must comply with this document.

---

## 1. Purpose

This document is the single source of truth for:

- Which AI providers are approved for direct integration
- Which dashboard sections must remain in scope
- How artifacts, jobs, and approvals work
- What proof gates must pass before any change is merged

Any code, test, or documentation that contradicts this contract must be updated to conform to it — not the other way around.

---

## 2. Approved Direct AI Providers

The following providers are the **only** approved direct-integration providers. All others must be removed from direct provider configuration, health checks, and the provider registry.

| Provider | Env Key(s) | Notes |
|----------|-----------|-------|
| **GenX** | `GENX_API_KEY`, `GENX_BASE_URL` | Primary gateway. OpenAI-compatible API. Routes to GPT-4o, Claude, Gemini, etc. as model labels. |
| **Hugging Face** | `HF_TOKEN` | Open-source models, embeddings, MMS-TTS, STT |
| **Qwen / DashScope / Wan** | `QWEN_API_KEY` | Alibaba Cloud: Qwen chat, Qwen-VL, WanX image/video generation |
| **Xiaomi MiMo** | `MIMO_API_KEY` | Reasoning model |
| **Groq** | `GROQ_API_KEY` | Ultra-low-latency inference (Llama, Mixtral, Whisper) |
| **Together AI** | `TOGETHER_API_KEY` | Open-source model hosting (Llama, FLUX, etc.) |

### 2.1 Prohibited Direct Providers

The following providers **must not** appear as directly configurable providers in the admin UI, provider registry, health checks, or environment variables:

- OpenAI (use GenX with `gpt-4o`, `gpt-4.1`, etc. as model labels)
- Anthropic / Claude (use GenX with `claude-3-5-sonnet`, etc. as model labels)
- Google Gemini (use GenX with `gemini-2.5-pro`, etc. as model labels)
- DeepSeek (use GenX with `deepseek-r1`, etc. as model labels)
- MiniMax (removed — use Qwen/WanX for video/audio)
- Replicate (removed)
- Suno (removed)
- Udio (removed)
- NVIDIA NIM (removed)
- Cohere (removed)
- Mistral (removed — use GenX or Together AI)
- OpenRouter (removed — GenX serves this purpose)
- Grok / xAI (removed — use GenX)

### 2.2 GenX Model Labels

When a user or app selects a "model" via GenX, the following labels are valid and route through GenX's gateway:

- `gpt-4o`, `gpt-4.1`, `gpt-4o-mini`, `o1`, `o3`, `o4-mini`
- `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
- `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`
- `deepseek-r1`, `deepseek-v3`, `deepseek-chat`
- `llama-3.1-70b-instruct`, `llama-3.3-70b-instruct`, `mistral-large-latest`
- Any other model string GenX supports — the registry is GenX-authoritative

---

## 3. Dashboard Sections — All Must Remain In Scope

The following dashboard sections are **required** and must not be removed, hidden, or disabled to make tests pass. Each section must remain navigable and functional (even if some features are behind a "coming soon" state).

### 3.1 Core Admin Dashboard

| Section | Route | Status |
|---------|-------|--------|
| Overview / Home | `/admin` | Required |
| Apps | `/admin/apps` | Required |
| App Builder | `/admin/app-builder` | Required |
| Playground / AI Lab | `/admin/playground` | Required |
| Repo Workbench | `/admin/repo-workbench` | Required |
| Media Studio | `/admin/media-studio` | Required |

### 3.2 AI & Providers

| Section | Route | Status |
|---------|-------|--------|
| Providers | `/admin/providers` | Required — shows only approved 6 providers |
| Models | `/admin/models` | Required — GenX-routed model labels |
| Routing | `/admin/routing` | Required |
| AI Routing (Smart) | `/admin/ai-routing` | Required |
| Budgets | `/admin/budgets` | Required |
| Learning | `/admin/learning` | Required |

### 3.3 Memory & Knowledge

| Section | Route | Status |
|---------|-------|--------|
| Memory | `/admin/memory` | Required |
| Retrieval | `/admin/retrieval` | Required |
| App Agents | `/admin/app-agents` | Required |

### 3.4 Outputs & Jobs

| Section | Route | Status |
|---------|-------|--------|
| Artifacts | `/admin/artifacts` | Required |
| Jobs | `/admin/jobs` | Required |
| Approvals | `/admin/approvals` | Required |
| Music Studio | `/admin/music-studio` | Required |

### 3.5 Avatar & Voice

| Section | Route | Status |
|---------|-------|--------|
| Voice Persona | `/admin/voice-persona` | Required |
| Voice Access Settings | `/admin/voice-access-settings` | Required |
| Multimodal | `/admin/multimodal` | Required |

### 3.6 Monitoring & Control

| Section | Route | Status |
|---------|-------|--------|
| Healing | `/admin/healing` | Required |
| Alerts | `/admin/alerts` | Required |
| Readiness | `/admin/readiness` | Required |
| Events | `/admin/events` | Required |
| Costs | `/admin/costs` | Required |
| Usage | `/admin/usage` | Required |

### 3.7 Control Center / System

| Section | Route | Status |
|---------|-------|--------|
| Settings | `/admin/settings` | Required |
| System Status | `/admin/system` | Required |
| VPS | `/admin/vps` | Required |
| Deploy | `/admin/deploy` | Required |
| Integration Hub | `/admin/integration-hub` | Required |
| SDK | `/admin/sdk` | Required |

---

## 4. Artifact & Job Rules

### 4.1 Artifacts

- All AI-generated outputs (text, images, audio, video, code) that are saved must be stored as `Artifact` records.
- Artifacts have a `type` field: `text | image | audio | video | code | document`.
- Artifacts are scoped to an `appSlug` and optionally a `traceId`.
- Artifacts must be viewable in the `/admin/artifacts` dashboard.
- Media artifacts (image, audio, video) must be accessible via `/api/artifacts/file/[...key]`.

### 4.2 Jobs

- Long-running tasks (music generation, video generation, image batch, repo workbench runs) must be tracked as `Job` records with status: `pending | running | completed | failed | cancelled`.
- Jobs must be visible in `/admin/jobs`.
- Jobs that require human review before output delivery must create an `Approval` record.

### 4.3 Approvals

- Any job or output flagged by the moderation pipeline or marked `requiresApproval: true` must create an `Approval` record.
- Approvals are visible in `/admin/approvals`.
- Approved outputs are released; rejected outputs are discarded and logged.

---

## 5. Provider Registry Rules

### 5.1 What the Registry Must Contain

The `model-registry.ts` (or equivalent) must only list models under the 6 approved providers. Specifically:

- **GenX**: All model labels that GenX routes (GPT-4o, Claude, Gemini, DeepSeek, etc. as string labels only — not as separate provider entries)
- **Hugging Face**: Open-source text, embedding, TTS, STT models
- **Qwen/DashScope**: Qwen chat, Qwen-VL, WanX image/video
- **MiMo**: Reasoning models
- **Groq**: Llama, Mixtral, Whisper (fast inference)
- **Together AI**: Llama, FLUX, open-source models

### 5.2 What the Registry Must NOT Contain

- No `openai` provider entry (models appear under `genx` with OpenAI-compatible labels)
- No `anthropic` provider entry
- No `gemini` / `google` provider entry
- No `deepseek` provider entry
- No `minimax` provider entry
- No `replicate` provider entry
- No `suno` / `udio` provider entry
- No `nvidia` provider entry
- No `cohere` provider entry
- No `mistral` provider entry (unless routed via Together AI or GenX)
- No `openrouter` provider entry
- No `grok` / `xai` provider entry

### 5.3 Health Checks

Health checks must only be implemented for the 6 approved providers. Any health check that calls OpenAI, Anthropic, Gemini, etc. directly must be removed or redirected through GenX.

---

## 6. Environment Variables — Approved Set

The following env vars are approved. All others referencing prohibited providers must be removed from `.env.example` and all configuration files.

```
# Core
DATABASE_URL
SESSION_SECRET
APP_URL
NEXT_PUBLIC_APP_URL
COOKIE_SECURE
VAULT_ENCRYPTION_KEY        # AES-256-GCM key for API key encryption at rest

# Approved Providers
GENX_API_KEY
GENX_BASE_URL
HF_TOKEN
QWEN_API_KEY
MIMO_API_KEY
GROQ_API_KEY
TOGETHER_API_KEY

# Infrastructure
REDIS_URL
QDRANT_URL
QDRANT_API_KEY
GITHUB_PAT

# Storage
STORAGE_DRIVER
STORAGE_ROOT
AMARKTAI_ALLOW_DEV_STORAGE_FALLBACK

# Notifications
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
CONTACT_EMAIL
ALERT_EMAIL

# Admin Bootstrap
ADMIN_EMAIL
ADMIN_PASSWORD              # Bootstrap only — remove after DB admin user created
WEBDOCK_API_KEY

# Realtime
REALTIME_SERVICE_URL
```

**Prohibited env vars** (must not appear in `.env.example` or be read by any approved code path):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY` / `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `MINIMAX_API_KEY`
- `REPLICATE_API_TOKEN`
- `NVIDIA_API_KEY`
- `COHERE_API_KEY`
- `OPENROUTER_API_KEY`
- `XAI_API_KEY` / `GROK_API_KEY`

---

## 7. Test Suite Rules

### 7.1 Test Targets

All tests must pass with `npm test`. The current baseline is **109 failing tests** that must be fixed.

### 7.2 Root Causes of Test Failures (Known)

1. **Provider mismatch**: Tests import or mock `openai`, `anthropic`, `gemini`, `deepseek`, `minimax`, `replicate` providers that no longer exist or have been renamed.
2. **Model registry mismatch**: Tests assert models exist under provider keys that are now prohibited.
3. **Competing source-of-truth**: Some tests use hardcoded provider lists that conflict with the approved provider set.
4. **Missing mocks**: Tests for GenX, Qwen, MiMo, Groq, Together AI may lack proper mocks.

### 7.3 Fix Strategy

- Update all test files to reference only the 6 approved providers.
- Replace direct provider mocks (OpenAI SDK, Anthropic SDK, etc.) with GenX-compatible mocks.
- Do not delete test coverage — rewrite tests to match the approved architecture.
- Do not skip or `.skip()` tests to make the suite pass.

### 7.4 Proof Gates

Before any batch of changes is considered complete, the following must all pass:

```bash
npx tsc --noEmit          # Zero TypeScript errors
npm run build             # Build succeeds (zero errors)
npm test                  # All tests pass (0 failures)
npm run lint              # Zero lint errors (warnings acceptable)
```

---

## 8. Security Hardening Backlog

The following security fixes are approved and must be implemented **after** the provider consolidation and test fixes are complete:

| Priority | Fix | File |
|----------|-----|------|
| 🔴 Critical | Add `VAULT_ENCRYPTION_KEY` to `.env.example` | `.env.example` |
| 🔴 Critical | Fix `secureEqual()` timing bug (compares `a` to itself) | `src/app/api/admin/quick-access/route.ts` |
| 🟠 High | Persist circuit breaker state to Redis | `src/lib/circuit-breaker.ts` |
| 🟠 High | IP rate limit before brain endpoint auth | `src/app/api/brain/request/route.ts` |
| 🟠 High | Add HTTP security headers | `next.config.mjs` |
| 🟠 High | Move memory/emotion context to system role (prompt injection) | `src/app/api/brain/request/route.ts` |
| 🟡 Medium | Warn when `ADMIN_PASSWORD` + DB user both exist | `src/lib/readiness-audit.ts` |
| 🟡 Medium | Add composite indexes on `AppMetricPoint`, `AppEvent` | `prisma/schema.prisma` |
| 🟡 Medium | Add data retention/pruning job | `scripts/` |
| 🟡 Medium | Validate `SESSION_SECRET` length at startup | `src/lib/session.ts` |
| 🟡 Medium | Fix `COOKIE_SECURE` default to `"true"` | `.env.example` |
| 🟡 Medium | Fix `AMARKTAI_ALLOW_DEV_STORAGE_FALLBACK` default to `"false"` | `.env.example` |

---

## 9. Adult Mode Rules

Adult mode is a **required product feature**. It must not be removed, hidden, or broken.

### 9.1 Default State
- Adult mode is **off by default** for all apps and all operators.
- Operators must explicitly opt in via the admin settings.

### 9.2 Opt-In Mechanism
- Global adult mode toggle: `/api/admin/global-adult-mode`
- Per-app adult policy: set via `AppProfile.adultPolicy` field
- Valid values: `'off'` | `'suggestive'` | `'full_adult_app_mode'`
- Studio page default: `'off'` (operator must change to enable)

### 9.3 Functional Requirements
When adult mode is enabled and app policy allows:
- `/api/brain/adult-text` — adult text generation must route correctly
- `/api/brain/adult-image` — adult image generation must route correctly
- `/api/brain/suggestive-image` — suggestive image must route correctly
- `/api/brain/suggestive-video` — suggestive video must route correctly
- `/api/brain/suggestive-video-gen` — suggestive video generation must route correctly
- All adult outputs must be stored as `Artifact` records
- All adult jobs must be tracked as `Job` records

### 9.4 What Must NOT Happen
- Adult mode must not be removed to make tests pass
- Adult mode must not be hidden behind a feature flag that defaults to disabled
- Adult routes must not return 404 or 501 when adult mode is enabled and configured

---

## 10. Canonical Source-of-Truth Files

The following files are the authoritative sources for their respective domains. All other files must import from these — never duplicate or contradict them.

| Domain | Canonical File | Purpose |
|--------|---------------|---------|
| Provider mesh | `src/lib/provider-mesh.ts` | Approved provider definitions, capabilities, env key mapping |
| Approved model catalog | `src/lib/approved-ai-catalog.ts` | Models available under approved providers |
| Universal model catalog | `src/lib/universal-model-catalog.ts` | Full model list including GenX-routed labels |
| Capability taxonomy | `src/lib/capability-router.ts` | Capability → provider/model routing rules |
| Runtime capability truth | `src/lib/runtime-capability-truth.ts` | Live capability availability based on configured keys |
| App packages | `src/lib/app-ai-package.ts` | Per-app capability bundles |
| Artifact contract | `prisma/schema.prisma` → `Artifact` model | Artifact schema |
| Job contract | `prisma/schema.prisma` → `Job` model | Job schema |
| Approval contract | `prisma/schema.prisma` → `Approval` model | Approval schema |

### 10.1 Import Rules
- `providers.ts` imports from `provider-mesh.ts` for provider definitions
- `routing-engine.ts` imports from `approved-ai-catalog.ts` for model selection
- `orchestrator.ts` imports from `runtime-capability-truth.ts` for live capability checks
- `brain.ts` imports from `capability-router.ts` for routing decisions
- No file may import directly from a prohibited provider SDK

---

## 11. Change Control Rules

1. **No provider additions** without updating this contract first.
2. **No dashboard section removals** — sections may be marked "coming soon" but must remain navigable.
3. **No test skipping** — all tests must pass; fix the code or the test, never skip.
4. **No direct SDK imports** for prohibited providers — all AI calls go through the approved provider abstraction layer.
5. **All changes** must pass the proof gates in §7.4 before being considered complete.
6. **This document** is updated whenever the approved provider list, dashboard sections, or proof gates change.

---

## 12. Revision History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-10 | 2.0.0 | Initial contract — establishes approved providers, dashboard sections, artifact/job rules, proof gates |
