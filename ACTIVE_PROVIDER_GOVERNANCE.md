# ACTIVE_PROVIDER_GOVERNANCE.md

**Generated**: 2026-06-23
**Final Active Providers**: 5 only

---

## Final Active AI Providers

| Provider | Key | Display Name | Base URL | Launch Required |
|----------|-----|--------------|----------|-----------------|
| **GenX** | `genx` | GenX | `https://query.genx.sh` | ✅ Yes (primary) |
| **Hugging Face** | `huggingface` | Hugging Face | `https://router.huggingface.co/v1` | No |
| **Together** | `together` | Together AI | `https://api.together.xyz/v1` | No |
| **Groq** | `groq` | Groq | `https://api.groq.com/openai/v1` | No |
| **MiMo** | `mimo` | Xiaomi MiMo | `https://api.xiaomimimo.com/v1` | No |

---

## Provider Files

### Core Provider Infrastructure

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/provider-mesh.ts` | ✅ Clean | Provider mesh definition (5 active providers) |
| `src/lib/approved-ai-catalog.ts` | ✅ Clean | Approved provider catalog |
| `src/lib/provider-catalog.ts` | ✅ Clean | Canonical provider entries |
| `src/lib/provider-config.ts` | ✅ Clean | Provider configuration |
| `src/lib/providers.ts` | ✅ Clean | Provider health checks |
| `src/lib/model-registry.ts` | ✅ Clean | Model registry (69 models from 3 providers) |

### Routing & Capability

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/capability-router.ts` | ✅ Clean | Main capability router |
| `src/lib/capability-engine.ts` | ✅ Clean | Capability engine |
| `src/lib/command-router.ts` | ✅ Clean | Command routing |
| `src/lib/multimodal-router.ts` | ✅ Clean | Multimodal routing |

---

## Provider Routes

### API Routes

| Route | Provider | Status |
|-------|----------|--------|
| `/api/admin/settings/test-provider` | All 5 | ✅ Active |
| `/api/admin/settings/test-genx` | GenX | ✅ Active |
| `/api/admin/settings/test-huggingface` | HuggingFace | ✅ Active |
| `/api/admin/settings/test-groq` | Groq | ✅ Active |
| `/api/admin/settings/test-together` | Together | ✅ Active |
| `/api/admin/settings/test-mimo` | MiMo | ✅ Active |
| `/api/admin/specialist/minimax-tts` | MiniMax | ❌ Deleted |
| `/api/admin/specialist/qwen-wanx-image` | Qwen | ❌ Deleted |

---

## Provider Config

### Environment Variables

| Provider | Primary Env Var | Aliases |
|----------|-----------------|---------|
| GenX | `GENX_API_KEY` | — |
| Hugging Face | `HUGGINGFACE_API_KEY` | `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN` |
| Together | `TOGETHER_API_KEY` | — |
| Groq | `GROQ_API_KEY` | — |
| MiMo | `MIMO_API_KEY` | `XIAOMI_API_KEY` |

---

## Provider Tests

### Test Files

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/__tests__/provider-governance.test.ts` | ✅ Updated | Tests final 5-provider policy |
| `src/lib/__tests__/settings-provider-source-of-truth.test.ts` | ⚠️ Partial | Some tests still expect removed providers |
| `src/lib/__tests__/runtime-capability-truth.test.ts` | ✅ Updated | Tests runtime truth with 5 providers |
| `src/lib/__tests__/routing-engine.test.ts` | ✅ Updated | Tests routing with active providers |

---

## Governance Rules

1. **Only 5 providers are active**: genx, huggingface, together, groq, mimo
2. **No runtime routing to removed providers**: All fallback chains use only active providers
3. **Apps cannot choose providers**: Runtime decides based on capability and availability
4. **GenX is primary**: Launch required, all other providers are fallbacks
5. **Provider health is tracked**: Via ai_providers table and in-memory cache

---

## Conclusion

The active provider governance is established with 5 providers. All core provider files are clean and aligned with the final policy. Some test files and feature modules still contain references to removed providers that need cleanup.
