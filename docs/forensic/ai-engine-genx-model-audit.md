# AI Engine / GenX / Model Audit

## Findings

- GenX status has two implementations: `/api/admin/genx/status` probes live availability; `/api/admin/runtime-truth` uses `runtime-capability-truth.ts` and can fall back to a static `modelCount = 57`.
- AI Engine calls `/api/admin/genx/status`, `/api/admin/runtime-truth`, `/api/admin/models`, `/api/admin/budgets`, and `/api/admin/learning`.
- Media Studio hard-codes three image models and static video/voice/music labels instead of loading the live GenX catalog.
- Repo Workbench model selector is backed by `/api/admin/repo-workbench/models`, combining `listGenXModels()` and `MODEL_REGISTRY`.
- GenX-covered providers are mixed with direct fallback providers in Settings; admin runtime truth must be clearer.

| Capability | GenX models available | UI models shown | Fallbacks shown | Works? | Blocker | Fix required |
| --- | --- | --- | --- | --- | --- | --- |
| chat | Expected via GenX text models if key/quota live | AI Engine/model registry; Aiva uses chat routes | OpenAI/Groq/Gemini/direct depending routes | Partial | Live GenX not verified in audit | Live smoke: `/api/admin/genx/status` plus `/api/brain/execute` chat |
| reasoning | Expected via GenX reasoning models | AI Engine/model registry | direct OpenAI/Groq/Gemini possible | Partial | Model catalog consistency | Use live catalog in all selectors |
| coding agent | Expected via GenX coding/reasoning | Repo Workbench model endpoint | direct fallback if provider configured | Partial | Live Repo Workbench AI task unverified | E2E audit/patch disposable repo |
| code review | Same as coding | Build Studio/Repo Workbench overlap | direct fallback | Partial | Legacy Build Studio duplication | Canonicalize to Repo Workbench |
| repo patching | Same as coding | Repo Workbench | direct fallback | Partial | Patch generation depends on valid AI response format | Add parser/patch E2E tests with live/sandbox model |
| image generation | GenX likely covers image models | Media Studio shows Recraft/Grok/DALL-E only | HF/Replicate in runtime truth | Partial/Fail UI | Media Studio calls `/api/admin/workspace/run` and hard-codes models | Wire `/api/brain/image`, live catalog, artifact/job handling |
| adult image generation | Specialist providers, not accidental GenX | No real Media Studio adult tab | HF/Together/xAI catalog | Fail | Hidden/absent UI and E2E not proven | Adult provider test + gated tab + artifact jobs |
| video generation | GenX video models possible | Media Studio text labels only, button disabled | Replicate possible in system capabilities | Fail UI | No user-run video generation from Media Studio | Wire `/api/brain/video-generate` with job polling and blocker truth |
| image-to-video | Possible via GenX catalog | Not visible as selectable flow | none visible | Missing | No upload/source image flow | Add source asset upload/select and I2V model route |
| avatar video | Possible models mentioned elsewhere | Not visible in Media Studio | none | Missing | No avatar video E2E | Add gated workflow or hide claims |
| voice/TTS | GenX/Deepgram/OpenAI/Groq possible | Voice tab model/provider/speed | Direct `/api/brain/tts` | Partial | Batch only; live provider unverified | Add voice catalog/status and artifact persistence |
| streaming voice | GenX stream exists for text; realtime voice pending | UI explicitly says pending | none | Fail for streaming voice | Needs realtime service | Implement or keep hidden |
| STT/transcription | GenX/Deepgram possible | Aiva assistant uses `/api/brain/stt`; Media Studio lacks STT tab | Deepgram/OpenAI possible | Partial | Not in Media Studio workflow | Add STT UI and artifact storage |
| music/song generation | Runtime truth says GenX music pending; Suno/Udio if keys | Media Studio music button disabled | Suno/Udio | Fail UI | No live audio generation path from Media Studio | Wire music-studio async route or hide |
| translation | GenX catalog may include translation | Not surfaced clearly | none | Partial/Missing UI | No visible workflow | Add capability route UI or hide |
| embeddings | GenX/direct possible | Not user-facing | OpenAI/Cohere/Qdrant | Partial | RAG not fully wired to app knowledge UI | Add health and ingestion verification |
| reranking | Route exists `/api/brain/rerank` | Not visible | Cohere? | Partial | No UI/workflow proof | Add RAG audit tests |
| moderation | `/api/brain/moderation`, guardrails | Adult safety routes | OpenAI/keyword fallback | Partial | Live provider not required but false positives need testing | Add moderation status to Health |
| research | `/api/brain/research`, Firecrawl | Apps discovery/crawl | Firecrawl/GenX | Partial | Firecrawl key required, local fallback unclear | Add crawler status and local fallback claim removal |
| crawler/RAG | Firecrawl/RAG routes exist | Apps/new discovery and agent crawl | Firecrawl | Partial | No full KB lifecycle UI proof | Add upload/crawl/index/search E2E |

## GO-LIVE conclusion

AI Engine is not a GO by itself. The base routing/status layers are present, but model catalog usage is inconsistent and several capability UIs are static, disabled, or hard-coded.
