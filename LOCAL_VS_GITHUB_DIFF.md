# LOCAL_VS_GITHUB_DIFF.md

**Generated**: 2026-06-23
**Comparison**: Local HEAD (`178fe29`) vs GitHub origin/main (`03da8ae`)

---

## Summary

| Metric | Count |
|--------|-------|
| **Files Changed Locally** | 45 |
| **Files Added Locally** | 2 |
| **Files Deleted Locally** | 2 |
| **Net Lines Added** | +2,201 |
| **Net Lines Removed** | -6,285 |
| **Net Change** | -4,084 lines |

---

## Files Added Locally

1. `RUNTIME_TRUTH.md` — Canonical source of truth document
2. `prisma/schema.prisma` — Added 6 new Runtime Registry tables

---

## Files Deleted Locally

1. `src/app/api/admin/specialist/minimax-tts/route.ts` — MiniMax TTS route (removed provider)
2. `src/app/api/admin/specialist/qwen-wanx-image/route.ts` — Qwen Wanx image route (removed provider)

---

## Files Changed Locally (43 files)

### Provider Infrastructure (8 files)

| File | Changes |
|------|---------|
| `src/lib/provider-mesh.ts` | Removed Qwen from ProviderMeshId type and PROVIDER_MESH array |
| `src/lib/approved-ai-catalog.ts` | Removed Qwen from ApprovedProviderKey, PROVIDER_NOTES, model lists |
| `src/lib/provider-catalog.ts` | Removed Qwen from CAPABILITY_FAMILIES |
| `src/lib/provider-config.ts` | Removed dashscope and xai from CoreProvider type |
| `src/lib/providers.ts` | Removed all non-active provider health checks |
| `src/lib/specialist-provider-routes.ts` | Removed Qwen/MiniMax specialist routes |
| `src/lib/universal-provider-call.ts` | Updated to active providers only |
| `src/lib/model-registry.ts` | Removed 119 model entries from 13 legacy providers |

### Routing & Capability (6 files)

| File | Changes |
|------|---------|
| `src/lib/capability-router.ts` | Updated fallback chain, removed unused functions |
| `src/lib/capability-engine.ts` | Updated suggested providers for all capabilities |
| `src/lib/command-router.ts` | Updated preferred providers for intents |
| `src/lib/multimodal-router.ts` | Updated CREATIVE_PROVIDER_PREFERENCE |
| `src/lib/multimodal-pipeline.ts` | Updated pipeline templates |
| `src/lib/ai-model-catalog.ts` | Removed Qwen model entries |

### Feature Modules (10 files)

| File | Changes |
|------|---------|
| `src/lib/rag-pipeline.ts` | Changed embedding provider from OpenAI to HuggingFace |
| `src/lib/music-studio.ts` | Replaced Qwen with MiMo in provider checks |
| `src/lib/coding-agent.ts` | Updated CODE_PROVIDER_PREFERENCE |
| `src/lib/workflow-engine.ts` | Changed default provider from OpenAI to GenX |
| `src/lib/workspace-executor.ts` | Updated fallback chain |
| `src/lib/firecrawl.ts` | Replaced Qwen with Together for image_generation |
| `src/lib/repo-workbench.ts` | Removed Qwen from model tier regex |
| `src/lib/repo-workbench-status.ts` | Removed OpenAI/Qwen, added MiMo/Together |
| `src/lib/readiness-audit.ts` | Removed non-active providers from candidates |
| `src/lib/ssml-voice.ts` | Updated TTSProvider type |

### Budget & Cost (1 file)

| File | Changes |
|------|---------|
| `src/lib/budget-tracker.ts` | Removed Qwen/Wanx pricing entries |

### API Routes (4 files)

| File | Changes |
|------|---------|
| `src/app/api/admin/provider-capability-test/route.ts` | Removed MiniMax/Qwen imports |
| `src/app/api/admin/settings/test-adult/route.ts` | Removed xAI from vault key map |
| `src/app/api/admin/settings/test-provider/route.ts` | Removed Qwen test route |
| `src/app/api/admin/studio/execute/route.ts` | Removed Qwen provider selection |

### Tests (10 files)

| File | Changes |
|------|---------|
| `src/lib/__tests__/model-registry.test.ts` | Updated to use active providers |
| `src/lib/__tests__/provider-governance.test.ts` | Updated to final 5-provider policy |
| `src/lib/__tests__/routing-engine.test.ts` | Updated to work with cleaned registry |
| `src/lib/__tests__/runtime-capability-truth.test.ts` | Fixed prisma mocking |
| `src/lib/__tests__/settings-provider-source-of-truth.test.ts` | Updated to final policy |
| `src/lib/__tests__/video-capability.test.ts` | Updated to active providers |
| `src/lib/__tests__/voice-expansion.test.ts` | Updated to active providers |
| `src/lib/__tests__/infrastructure-items.test.ts` | Updated TTSProvider usage |
| `src/lib/__tests__/research-capability.test.ts` | Updated provider assertions |
| `src/lib/__tests__/standalone-provider-truth.test.ts` | Updated to use Groq |

### Schema & Seed (2 files)

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added 6 new Runtime Registry tables |
| `prisma/seed.ts` | Updated seed data to 5 active providers |

---

## Merge Risks

| Risk | Level | Description |
|------|-------|-------------|
| **Conflict with origin/main** | LOW | Local is ahead, no conflicts expected |
| **Breaking changes** | MEDIUM | Removed providers will break any code that depends on them |
| **Test failures** | HIGH | 38 tests still fail (pre-existing + provider removal) |
| **Build timeout** | LOW | Build compiles but times out on static generation (pre-existing) |

---

## Recommendation

**Push local commits to GitHub** to establish the local repository as the source of truth.

The 2 commits ahead of origin contain critical provider policy enforcement that should be preserved.
