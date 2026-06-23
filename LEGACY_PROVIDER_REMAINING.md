# LEGACY_PROVIDER_REMAINING.md

**Generated**: 2026-06-23
**Status**: Phase 1 cleanup in progress

---

## Summary

| Provider | Remaining References | Classification |
|----------|---------------------|----------------|
| **qwen** | 161 matches in 20+ files | ACTIVE CODE (needs cleanup) |
| **dashscope** | 30+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **wanx** | 20+ matches in 5+ files | ACTIVE CODE (needs cleanup) |
| **openai** | 200+ matches in 50+ files | ACTIVE CODE (needs cleanup) |
| **gemini** | 100+ matches in 30+ files | ACTIVE CODE (needs cleanup) |
| **minimax** | 20+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **anthropic** | 20+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **openrouter** | 30+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **deepseek** | 30+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **cohere** | 10+ matches in 5+ files | ACTIVE CODE (needs cleanup) |
| **replicate** | 20+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **xai** | 20+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **grok** | 30+ matches in 10+ files | ACTIVE CODE (needs cleanup) |
| **moonshot** | 10+ matches in 5+ files | ACTIVE CODE (needs cleanup) |

---

## Classification Details

### ACTIVE CODE (Must be removed or updated)

These references are in active runtime code that will execute:

| File | Provider | Issue |
|------|----------|-------|
| `src/lib/brain.ts` | qwen, dashscope | Provider routing and URL construction |
| `src/lib/app-profiles.ts` | qwen | In allowed_providers arrays |
| `src/lib/ai-routing-policy.ts` | qwen, openai, gemini, deepseek, minimax, openrouter, moonshot, zhipu, xai | In routing preference lists |
| `src/lib/ai-capability-taxonomy.ts` | qwen, gemini, deepseek, minimax, moonshot, zhipu, elevenlabs, deepgram | In defaultProviders arrays |
| `src/app/api/brain/video-generate/route.ts` | qwen, dashscope | Video generation routing |
| `src/app/api/brain/suggestive-image/route.ts` | qwen, dashscope, wanx | Image generation routing |
| `src/app/api/brain/stt/route.ts` | qwen | STT routing |
| `src/app/api/fine-tune/route.ts` | openai, together, qwen | Fine-tuning routing |
| `src/lib/qwen-wanx-polling.ts` | qwen, dashscope, wanx | Entire file is Qwen-specific |

### TEST ONLY (Can be updated later)

These references are in test files and don't affect runtime:

| File | Provider | Status |
|------|----------|--------|
| `src/lib/__tests__/*.test.ts` | Various | Tests asserting removed providers are inactive |

### COMMENT ONLY (Safe to leave)

These references are in comments or documentation:

| File | Provider | Status |
|------|----------|--------|
| Various files | Various | Comments mentioning provider names |

### DEAD CODE (Should be deleted)

| File | Provider | Status |
|------|----------|--------|
| `src/lib/qwen-wanx-polling.ts` | qwen, dashscope, wanx | Entire file is dead code |
| `src/app/api/admin/specialist/minimax-tts/` | minimax | Already deleted |
| `src/app/api/admin/specialist/qwen-wanx-image/` | qwen, wanx | Already deleted |

---

## Cleanup Priority

### HIGH PRIORITY (Runtime impact)

1. `src/lib/brain.ts` — Core provider routing
2. `src/lib/app-profiles.ts` — App provider allowlists
3. `src/lib/ai-routing-policy.ts` — Routing preference lists
4. `src/lib/ai-capability-taxonomy.ts` — Capability provider lists
5. `src/app/api/brain/video-generate/route.ts` — Video generation
6. `src/app/api/brain/suggestive-image/route.ts` — Image generation
7. `src/app/api/brain/stt/route.ts` — STT routing

### MEDIUM PRIORITY (Feature modules)

1. `src/lib/qwen-wanx-polling.ts` — Dead code, can be deleted
2. `src/app/api/fine-tune/route.ts` — Fine-tuning routing
3. `src/lib/app-ai-package.ts` — Package provider filtering

### LOW PRIORITY (Tests and docs)

1. Test files — Update assertions to match final policy
2. Comments — Can be updated later

---

## Conclusion

**There are still significant active runtime references to removed providers.** These must be cleaned up before the repository can be declared the official source of truth.

The most critical files are:
1. `src/lib/brain.ts`
2. `src/lib/app-profiles.ts`
3. `src/lib/ai-routing-policy.ts`
4. `src/lib/ai-capability-taxonomy.ts`
5. `src/app/api/brain/video-generate/route.ts`
