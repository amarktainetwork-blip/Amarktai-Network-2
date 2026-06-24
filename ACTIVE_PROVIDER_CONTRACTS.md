# Active Provider Contracts

Last audited: 2026-06-18

Canonical owner: `src/lib/providers/provider-truth.ts`

Official/provider docs checked during this audit:

- GenX Router REST API: https://genx.pro/docs/api
- Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/en/index
- Hugging Face HF Inference provider: https://huggingface.co/docs/inference-providers/en/providers/hf-inference
- Alibaba Cloud DashScope OpenAI-compatible chat: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- Alibaba Cloud Wan text-to-video: https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference
- Alibaba Cloud text-to-image V2: https://www.alibabacloud.com/help/en/model-studio/text-to-image-v2-api-reference
- Groq API reference: https://console.groq.com/docs/api-reference
- Groq speech-to-text: https://console.groq.com/docs/speech-to-text
- Together AI OpenAI compatibility: https://docs.together.ai/docs/inference/openai-compatibility
- Xiaomi MiMo first API call: https://mimo.mi.com/docs/en-US/quick-start/summary/first-api-call
- Xiaomi MiMo OpenAI API compatibility: https://mimo.mi.com/docs/en-US/api/chat/openai-api

## Provider Table

| Provider | Repo base URL(s) | Auth/env | Discovery | Chat/text | Image | Video | Voice/TTS | STT | Music/audio | Async job | Match status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GenX | `https://query.genx.sh/api/v1`, `https://query.genx.sh/v1` | Bearer, `GENX_API_KEY` | `/api/v1/models` or `/v1/models` via profile probing | `/v1/chat/completions` | `/api/v1/generate` or `/v1/generate` | `/api/v1/generate` or `/v1/generate` | `/api/v1/generate` or `/v1/generate` | Cataloged fallback only unless GenX exposes STT | `/api/v1/generate` | `/api/v1/jobs/:id` | Mostly matches GenX docs; exact deployment path is probed because GenX supports variants. |
| Hugging Face | `https://huggingface.co`, `https://router.huggingface.co` | Bearer, `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN` | `https://huggingface.co/api/models` | Router/HF inference model endpoint | Router/HF inference model endpoint | Router/HF inference model endpoint if model supported | Router/HF inference model endpoint | Router/HF inference model endpoint | Router/HF inference model endpoint | No canonical provider polling | Matches public model discovery and HF Inference routing shape; model execution remains task/model dependent. |
| Qwen / DashScope | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, `https://dashscope-intl.aliyuncs.com/api/v1` | Bearer, `QWEN_API_KEY` or `DASHSCOPE_API_KEY`; paid gate `QWEN_PAID_ENABLED` | `/models` on compatible-mode | `/chat/completions` via compatible-mode | `/services/aigc/text2image/image-synthesis` or multimodal generation | `/services/aigc/video-generation/video-synthesis` | Not wired as active TTS in V1 matrix | Not wired as active STT in V1 matrix | Not active | DashScope task polling via `qwen-wanx-polling.ts` | Matches official compatible-mode and AIGC endpoints for chat/image/video. |
| Xiaomi MiMo | `https://token-plan-sgp.xiaomimimo.com/v1` | `api-key` header, `MIMO_API_KEY` or `XIAOMI_API_KEY` | `/models` | `/chat/completions` | Not active | Not active | Attempted through chat/audio payload | Not active | Not active | No | Base URL and OpenAI-compatible path are wired with the current MiMo key-header contract; TTS behavior needs live provider proof. |
| Groq | `https://api.groq.com/openai/v1` | Bearer, `GROQ_API_KEY` | `/models` | `/chat/completions` | Not active | Not active | `/audio/speech` if selected model supports it | `/audio/transcriptions` | Not active | No | Chat and STT match Groq docs; TTS route requires live model proof. |
| Together AI | `https://api.together.ai/v1` | Bearer, `TOGETHER_API_KEY` | `/models` | `/chat/completions` | `/images/generations` | `/videos`, `/videos/:id` | `/audio/speech` if model supports it | `/audio/transcriptions` if model supports it | Not active | `/videos/:id` | Chat/image/TTS/embeddings match documented OpenAI compatibility; video/STT must be proven against current Together model support. |

## Removed As Active Providers

OpenAI, Anthropic, Gemini, DeepSeek, NVIDIA, OpenRouter, Cohere, Mistral, Replicate, MiniMax, Suno, Udio, and xAI/Grok are not canonical direct V1 provider IDs. They may still appear as model family names, documentation residue, old test fixtures, or GenX-routed upstream families, but they are not active app-selectable providers.
