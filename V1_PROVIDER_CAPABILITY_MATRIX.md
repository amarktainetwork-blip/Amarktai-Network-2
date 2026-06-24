# AmarktAI Network V1 Provider Capability Matrix

Last updated: 2026-06-20

Status vocabulary:

- `catalog_visible`: model/provider is listed or statically represented.
- `credential_available`: runtime can resolve a key through `getMeshCredential` or provider config.
- `endpoint_contract_valid`: official endpoint/request/response contract is represented in source.
- `adapter_available`: canonical adapter exists.
- `source_wired`: route/source path exists but live execution is not proven.
- `live_proven`: proof or smoke test completed in target runtime.
- `executable_default`: Brain may select it by default for the capability.
- `fallback_candidate`: Brain may select after higher priority candidates fail.
- `blocked_diagnostic`: visible but blocked with a fix path.

## Runtime Proof Baseline

| Runtime | LIVE_PROVEN | SOURCE_WIRED | PROVIDER_AVAILABLE | BLOCKED | NOT_WIRED |
|---|---:|---:|---:|---:|---:|
| VPS transcript after `13dbde3` | 11 | 6 | 0 | 7 | 1 |
| Local Windows/no DB | 0 | 6 | 0 | 19 | 0 |

VPS proof is the live runtime source. Local proof only confirms CLI behavior without secrets.

## Provider/Model/Capability Matrix

| Provider | Model/candidate | Capability | Visible/catalogued | Credential available | Endpoint contract known | Adapter exists | Live-proven | Source-wired | Executable default | Fallback candidate | Diagnostic state | Fix path |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| GenX | `gpt-5.4-mini`, `gpt-5.3-codex`, `claude-sonnet-4.5`, `gemini-2.5-pro` | chat/reasoning/coding | yes | VPS yes/local no | yes | yes | VPS subset | yes | yes, policy-dependent | yes | live_proven/source_wired | Reverify live model catalog and choose best per policy |
| GenX | `gpt-image-1`, `gemini-2.5-pro` | image/image_edit | yes | VPS yes/local no | yes | yes | VPS subset | yes | yes, if input valid | yes | source_wired/image edit timeout seen | Add tighter source-image contract and per-provider failure cap |
| GenX | `veo-3.1` | text_to_video | yes | VPS yes/local no | yes | yes | VPS proof needs media smoke | yes | yes for premium/quality | yes | source_wired | Verify jobs/files/polling and local artifact persistence |
| GenX | provider discovery | image_to_video | yes | VPS yes/local no | yes | yes | no | yes | no until live-proven | yes | source_wired | Validate source image contract and model access |
| GenX | `lyria-3-clip-preview`/music candidates | music | yes | VPS yes/local no | yes | yes | 30s artifact previously proven | yes | yes for <=30s | yes | duration_limited for 60/90s | Segment/compose or route to longer-duration model/provider |
| GenX | `gpt-4o-mini-tts` | TTS | yes | VPS yes/local no | yes | yes | VPS subset | yes | yes | yes | source_wired/live_proven subset | Confirm bytes/audio URL and local artifact |
| GenX | `gpt-4o-transcribe` | STT | yes | VPS yes/local no | yes | yes | VPS subset | yes | yes | yes | source_wired/live_proven subset | Confirm transcript response and artifact policy |
| Hugging Face | `mistralai/Mistral-7B-Instruct-v0.3` | chat/coding | yes | VPS yes/local public only | yes | yes | VPS subset not final | yes | fallback | yes | source_wired | Reverify Inference Providers model access |
| Hugging Face | `stabilityai/stable-diffusion-xl-base-1.0`, curated image models | image/adult_image | yes | VPS yes/local public catalog | yes | yes | VPS subset | yes | fallback | yes | adult gated where applicable | Keep adult policy gate; validate response bytes/URL |
| Hugging Face | `facebook/musicgen-small` | music | yes | VPS yes/local public catalog | specialist endpoint required | adapter guarded | no | yes | no | no until configured | endpoint_required/needs_configuration | Set `HF_ENDPOINT_MUSIC_GENERATION` or `HF_SPECIALIST_ENDPOINTS_JSON` |
| Hugging Face | Wan/video/adult-video candidates | video/adult_video | yes | VPS yes/local public catalog | specialist endpoint required | adapter guarded | no | yes | no | no until configured | endpoint_required | Set `HF_ENDPOINT_TEXT_TO_VIDEO`, `HF_ENDPOINT_IMAGE_TO_VIDEO`, or JSON mapping |
| Hugging Face | `openai/whisper-large-v3` | STT | yes | VPS yes/local public catalog | yes | yes | VPS subset | yes | fallback | yes | source_wired | Confirm provider access and binary/transcript response |
| Hugging Face | `facebook/mms-tts-eng` | TTS | yes | VPS yes/local public catalog | yes | yes | VPS subset | yes | fallback | yes | source_wired | Confirm response is audio bytes, not JSON text |
| Hugging Face | `sentence-transformers/all-MiniLM-L6-v2` | embeddings | yes | VPS yes/local public catalog | yes | yes | no local | yes | fallback | yes | source_wired | Live-prove vector response |
| Hugging Face | `cross-encoder/ms-marco-MiniLM-L-6-v2` | rerank | yes | VPS yes/local public catalog | yes | yes | no local | yes | fallback | yes | source_wired | Live-prove rerank request/response |
| Qwen/DashScope | `qwen-turbo`, `qwen-plus`, `qwen-max` | chat/reasoning/coding | yes | VPS yes/local no | yes | yes | VPS subset | yes | cheap/balanced if free token policy allows | yes | source_wired | Keep paid usage gated by `QWEN_PAID_ENABLED` |
| Qwen/DashScope | `qwen-image*`, `qwen-image-2.0*` | image/image_edit | yes | VPS yes/local no | yes; DashScope native AIGC | yes | VPS subset | yes | yes for low-cost image | yes | source_wired | Reverify region/model access and artifact persistence |
| Qwen/DashScope | `wan2.1-t2v-turbo` | text_to_video | yes | VPS yes/local no | yes | yes | VPS needs media smoke | yes | yes if free/allocated token pool | yes | source_wired | Reverify task create/poll and media URL |
| Qwen/DashScope | `wan2.1-i2v-turbo` | image_to_video | yes | VPS yes/local no | yes | yes | no | yes | candidate | yes | source_wired | Validate source image input and poll result |
| Qwen/DashScope | `qwen3-tts`, `qwen3-asr` catalog candidates | TTS/STT | yes | VPS yes/local no | needs verification | no | no | catalog only | no | no | adapter_missing | Add adapter only after official contract validation |
| MiMo | `mimo-v2.5`, `mimo-v2.5-pro` | chat/reasoning/coding | yes | VPS yes/local no | yes | yes | VPS subset | yes | paid policy-dependent | yes | source_wired | Verify model access from backend-safe runtime endpoint |
| MiMo | `mimo-v2.5-asr` | STT | yes | VPS yes/local no | yes; `/v1/chat/completions` with `input_audio` | yes | VPS subset pending | yes | yes if live-proven | yes | source_wired | Confirm ASR transcript output on VPS |
| MiMo | `mimo-tts-1`/TTS candidates | TTS | yes | VPS yes/local no | yes | yes | VPS subset pending | yes | yes if live-proven | yes | source_wired | Confirm audio data response and artifact persistence |
| MiMo | vision/omni candidates | vision/understanding | yes | VPS yes/local no | yes for understanding | text/multimodal path | no | yes | fallback | yes | source_wired | Do not classify as media generation |
| MiMo | image/video generation candidates | image/video generation | visible if catalog says so | VPS yes/local no | not validated | no | no | no | no | no | adapter_missing/unsupported_by_contract | Add only after official generation contract exists |
| Groq | `llama-3.3-70b-versatile` | chat/reasoning/coding | yes | VPS yes/local no | yes | yes | VPS subset | yes | cheap/fast fallback | yes | source_wired/live_proven subset | Live-prove chat route |
| Groq | `whisper-large-v3-turbo` | STT | yes | VPS yes/local no | yes; `/audio/transcriptions` | yes | VPS subset | yes | yes for STT | yes | source_wired/live_proven subset | Confirm transcript response |
| Groq | `canopylabs/orpheus-v1-english` | TTS | yes | VPS yes/local no | yes; `/audio/speech` | yes | VPS subset | yes | yes for TTS | yes | source_wired/live_proven subset | Confirm audio bytes and artifact |
| Groq | none | image/video/music | no | VPS yes/local no | no official contract in scope | no | no | no | no | no | unsupported_by_contract | Do not invent media routes |
| Together | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | chat/reasoning/coding | yes | VPS yes/local no | yes | yes | VPS subset | yes | fallback | yes | source_wired | Live-prove chat route |
| Together | `black-forest-labs/FLUX.1-schnell`, `FLUX.1.1-pro` | image/adult_image | yes | VPS yes/local no | yes | yes | VPS subset | yes | yes if policy allows | yes | source_wired/live_proven subset | Keep adult gate for adult models |
| Together | `Wan-AI/Wan2.1-T2V-14B`, `minimax/video-01` | text_to_video | yes | VPS yes/local no | yes; async `/videos` | yes | VPS media smoke pending | yes | fallback/default by policy | yes | source_wired | Validate account/model access, poll, `outputs.video_url`, local artifact |
| Together | provider discovery | STT/TTS/embeddings/rerank | visible by catalog | VPS yes/local no | partial | adapters exist for some | VPS subset pending | yes | fallback | yes | source_wired/catalog_visible | Reverify selected executable models and response parsers |

## Default Routes By Capability

| Capability | Default policy route | Fallback route |
|---|---|---|
| Chat/text | Brain-scored GenX/Qwen/MiMo/Groq/Together/HF by profile | Any healthy provider with executable model |
| Reasoning/coding | GenX or Qwen/MiMo by quality/cost policy | Groq/Together/HF where model evidence allows |
| Image | Qwen/Together/GenX/HF by policy and model availability | Next executable provider with artifact support |
| Image edit | Qwen/GenX/Together/HF with validated source image | Next executable provider; block if no source image |
| Short video | GenX/Qwen/Together by quality, cost, duration | Next async video provider with model access |
| Image-to-video | Qwen/GenX with source image | Next provider with image-to-video contract |
| Music | GenX <=30s until longer route exists | HF specialist endpoint or future composition route |
| TTS | MiMo/Groq/Together/GenX/HF by policy | Next audio provider returning bytes/URL |
| STT | Groq/GenX/HF/Together/MiMo by policy | Next transcript provider |
| Embeddings | Qwen/HF/Together when model executable | Next vector-capable provider |
| Rerank | HF/Together when model executable | Next rerank-capable provider |
| Research | Chat/reasoning provider plus local research tools | Alternate chat provider; block on missing tools where required |
| Avatar video | None yet | None until lip-sync adapter exists |
| Adult media | Policy-gated image/video providers | HF/private/open-source candidates after adult gate and endpoint config |

## Open Source Stack Tracking

| Tool | Phase | Current state | Used by | Fix path |
|---|---|---|---|---|
| ffmpeg | Phase 3 | Tracked; local proof missing | composition, music duration, video overlays | Install and wire media composition proof |
| ffprobe | Phase 3 | Tracked; local proof missing | duration/file proof | Install with ffmpeg |
| Redis/BullMQ | Phase 1/3 | Tracked; local proof missing | async jobs/workers | Install Redis, set `REDIS_URL`, run worker |
| Qdrant | Phase 5 | Tracked; local proof missing | memory/RAG | Run Qdrant and set `QDRANT_URL` |
| Playwright | Phase 5 | Local proof available | research/scraping | Keep browser install current |
| Scrapy | Phase 5 | Tracked; local proof missing | research/scraping | Install Python package |
| Trafilatura | Phase 5 | Tracked; local proof missing | extraction/research | Install Python package |
| Rhubarb/replacement | Phase 4 | Tracked; local proof missing | talking avatar | Install binary or service and adapter |
| Local/open-source models | Future | Tracked | fallback/private media | Add only after provider contracts and policy gates |

