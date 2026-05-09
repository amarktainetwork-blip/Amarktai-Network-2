# Full Provider, Model, Capability, Routing, and App-Onboarding Governance Audit

Date: 2026-05-09
Branch: `codex/dashboard-go-live-wiring`
Scope: audit and report only. No UI, dashboard, provider, routing, backend, or configuration changes were made for this audit.

## 1. Executive Verdict

The platform has a large amount of real provider, routing, media, app-onboarding, Workbench, Settings, Operations, memory, and artifact infrastructure in the repo, but it is not yet a single governed source of truth. The highest-risk finding is not absence of code; it is drift between catalogs, routes, dashboard truth, and runtime provider checks.

Critical verdict:

- GenX is correctly treated as the primary orchestration/provider layer in `src/lib/genx-client.ts`, `src/lib/universal-model-catalog.ts`, and `src/lib/live-ai-routing.ts`.
- The live GenX catalog endpoint `https://query.genx.sh/api/v1/models` returned 58 model IDs during this audit. The repo runtime truth default in `src/lib/runtime-capability-truth.ts` still defaults to 57. This is a factual model-count drift.
- The approved provider catalog in `src/lib/approved-ai-catalog.ts` is narrower than the governance catalog in `src/lib/ai-provider-governance.ts` and narrower than several actual routes. This creates unclear ownership for Gemini, Replicate, ElevenLabs, Deepgram, xAI/Grok, DeepSeek, Mem0, and other entries that appear in code but are not consistently approved.
- Capability filtering exists, but explicit manual selections in `src/lib/live-ai-routing.ts` verify provider/model existence more strongly than they verify requested modality support. This can still allow capability mismatch unless the caller-side model list prevents it.
- Studio has real protected execution routes, artifact creation, and polling for several modalities, but route behavior is uneven by tab. Music, voice, video, and adult support need clearer governance.
- Adult text and adult image have real policy-gated backend routes. Adult video is not production-supported: catalog entries are experimental/private-endpoint only and no production dashboard route proves provider policy, app policy, safeguards, route execution, and polling.
- Music/song generation is present through GenX Lyria models and the music-studio route, but live generation was not verified with a configured key. Music governance should not claim production readiness until live provider tests pass.
- With no provider keys present in the local runtime audited here, all provider execution claims that require keys remain: Not verified — requires live provider test.

Go-live verdict: not ready for full production go-live as a governed multi-provider/app platform until the source-of-truth drift and live provider test gaps below are fixed. Ready for controlled live testing after required keys are added: yes, provided the dashboard truth remains blocker-first and no provider is marked Connected until a live test passes.

## 2. Evidence Sources

Repo sources inspected:

- Provider catalogs: `src/lib/approved-ai-catalog.ts`, `src/lib/ai-provider-governance.ts`, `src/lib/ai-model-catalog.ts`, `src/lib/universal-model-catalog.ts`, `src/lib/provider-catalog.ts`, `src/lib/provider-config.ts`
- GenX: `src/lib/genx-client.ts`
- Routing: `src/lib/live-ai-routing.ts`, `src/lib/ai-routing-policy.ts`, `src/lib/capability-router.ts`, `src/lib/routing-engine.ts`, `src/app/api/admin/ai-routing/route.ts`, `src/app/api/admin/ai-routing/smart/route.ts`
- Runtime truth: `src/lib/runtime-capability-truth.ts`, `src/lib/platform-settings-truth.ts`, `src/lib/readiness-audit.ts`, `src/lib/system-runtime-status.ts`
- Studio: `src/app/api/admin/studio/execute/route.ts`, `src/app/api/admin/studio/stt/route.ts`, `src/app/api/admin/studio/workbench-handoff/route.ts`, `src/lib/studio-route-map.ts`, `src/app/admin/dashboard/page.tsx`
- Media: `src/app/api/brain/image/route.ts`, `src/app/api/brain/image-edit/route.ts`, `src/app/api/brain/video-generate/route.ts`, `src/app/api/brain/video-generate/[jobId]/route.ts`, `src/app/api/brain/tts/route.ts`, `src/app/api/brain/stt/route.ts`
- Music/voice: `src/app/api/admin/music-studio/route.ts`, `src/app/api/admin/music-studio/jobs/[jobId]/route.ts`, `src/lib/music-studio.ts`, `src/app/api/admin/specialist/minimax-tts/route.ts`, `src/lib/specialist-provider-routes.ts`, `src/app/api/admin/voice/options/route.ts`, `src/app/api/admin/voice/preview/route.ts`
- Adult: `src/lib/adult-model-catalog.ts`, `src/app/api/brain/adult-text/route.ts`, `src/app/api/brain/adult-image/route.ts`, `src/app/api/admin/app-safety/route.ts`
- Workbench: `src/app/admin/dashboard/workbench/page.tsx`, `src/lib/repo-workbench.ts`, `src/lib/repo-workbench-status.ts`, `src/app/api/admin/repo-workbench/**`
- App onboarding: `src/lib/app-profiles.ts`, `src/lib/app-ai-package.ts`, `src/lib/app-ai-package-store.ts`, `src/lib/app-agent.ts`, `src/lib/app-budget-enforcement.ts`, `src/lib/app-discovery.ts`, `src/app/api/admin/app-profiles/route.ts`, `src/app/api/admin/app-ai-package/route.ts`, `src/app/api/admin/app-ai-package/recommend/route.ts`, `src/app/api/admin/app-agents/route.ts`, `src/app/api/admin/app-safety/route.ts`, `src/app/api/admin/app-budgets/route.ts`, `src/app/api/admin/app-health/route.ts`
- Dashboard pages: `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/workbench/page.tsx`, `src/app/admin/dashboard/apps-agents/page.tsx`, `src/app/admin/dashboard/memory-learning/page.tsx`, `src/app/admin/dashboard/operations/page.tsx`, `src/app/admin/dashboard/settings/page.tsx`

Live/runtime evidence:

- `curl.exe -i --max-time 20 https://query.genx.sh/api/v1/models` returned `HTTP/1.1 200 OK`, `Content-Type: application/json`, and a JSON array with 58 model IDs.
- Local environment key presence check returned false for: `GENX_API_KEY`, `GENX_API_URL`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `HUGGINGFACE_API_KEY`, `HF_TOKEN`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `MINIMAX_API_KEY`, `MIMO_API_KEY`, `GITHUB_TOKEN`, `FIRECRAWL_API_KEY`, `REDIS_URL`, `WEBDOCK_API_TOKEN`, `SMTP_HOST`.
- No authenticated live provider generation test was possible in this runtime. Any key-dependent execution claim is: Not verified — requires live provider test.

## 3. Current Provider Inventory

| Provider/tool | Evidence | Current role | Key/config evidence | Governance status |
|---|---|---|---|---|
| GenX | `src/lib/genx-client.ts`, `src/lib/universal-model-catalog.ts`, live `/api/v1/models` | Primary orchestration/provider layer for text, image, video, music, TTS, STT | `GENX_API_URL`, `GENX_API_KEY`; absent locally | Primary, but model-count/catalog drift exists |
| Hugging Face | `src/lib/approved-ai-catalog.ts`, `src/lib/specialist-provider-routes.ts`, adult routes | Specialist HF task routes, adult text/image private endpoint path, fallback TTS/STT | `HUGGINGFACE_API_KEY`/`HF_TOKEN`; absent locally | Approved, but many adult models require private/local endpoint |
| MiniMax / Mimo | `src/lib/ai-model-catalog.ts`, `src/app/api/admin/specialist/minimax-tts/route.ts`, `src/lib/specialist-provider-routes.ts` | TTS specialist and text model catalog entries | `MINIMAX_API_KEY`/`MIMO_API_KEY`; absent locally | Partially wired; Studio TTS route path does not consistently preserve MiniMax selection |
| Qwen / DashScope | `src/lib/ai-model-catalog.ts`, Qwen specialist routes, `src/app/api/brain/stt/route.ts`, video route | Text, image task route, STT via Qwen audio, video via DashScope Wan | `QWEN_API_KEY`/`DASHSCOPE_API_KEY`; absent locally | Approved/partial |
| Together AI | `src/lib/ai-model-catalog.ts`, adult routes, video route | Text, image, adult text/image fallback, video route fallback via image-generation endpoint | `TOGETHER_API_KEY`; absent locally | Approved/partial; video semantics need stricter truth |
| Groq | `src/lib/ai-model-catalog.ts`, `src/app/api/brain/tts/route.ts`, `src/app/api/brain/stt/route.ts` | Fast text, TTS, STT | `GROQ_API_KEY`; absent locally | Approved/partial |
| OpenAI | `src/lib/ai-model-catalog.ts`, TTS/STT/moderation routes | Text, TTS, STT, moderation | `OPENAI_API_KEY`; absent locally | Approved/partial |
| Gemini via GenX | live GenX IDs `gemini-3-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-pro` | GenX-hosted Gemini text/reasoning models | GenX catalog public; execution key absent | Exposed through GenX catalog |
| Gemini direct | `src/lib/ai-provider-governance.ts`, `src/app/api/brain/tts/route.ts`, `src/app/api/brain/stt/route.ts` | Direct TTS/STT routes with Gemini key | `GEMINI_API_KEY` read through vault in routes; not in approved AI catalog | Source-of-truth inconsistency |
| GitHub | `src/lib/github-integration.ts`, `src/app/api/admin/repo-workbench/**` | Workbench repo, branch, commit, push, PR | `GITHUB_TOKEN`; absent locally | Required for Workbench go-live |
| Firecrawl | research/status/settings truth files | Research/crawling | `FIRECRAWL_API_KEY`; absent locally | Required for crawling-backed research |
| Playwright | system/runtime/readiness routes | Browser automation and checks | local dependency/runtime; live status route | Tool status needs live route test |
| Redis | `src/lib/redis.ts`, runtime readiness | Jobs/realtime/queues | `REDIS_URL`; absent locally | Optional/required depending deployment topology |
| Storage | `src/lib/artifact-store.ts`, `src/lib/media-artifacts.ts`, `src/lib/storage-driver.ts` | Artifact persistence and media previews | local/storage env; no cloud key in runtime | Route exists; writability must be live-tested |
| Webdock | `src/app/api/admin/settings/test-webdock/route.ts`, VPS routes | VPS/deployment checks | `WEBDOCK_API_TOKEN`; absent locally | Optional/ops provider unless deployment depends on it |
| SMTP/email | `src/lib/platform-settings-truth.ts` | Email notifications if configured | `SMTP_HOST` absent locally | Optional/partial |
| Replicate | `src/app/api/brain/video-generate/route.ts`, `src/lib/ai-provider-governance.ts` | Video fallback in route | `REPLICATE_API_KEY`; not target approved provider | Wired but outside requested approved-provider list |
| ElevenLabs/Deepgram | `src/app/api/brain/tts/route.ts`, voice preview routes | TTS providers | service vault/env; not in approved AI catalog | Wired but not consistently approved |
| xAI/Grok direct | adult text/image routes | Adult text/image provider path | `xai`/`grok` vault key | Wired in adult routes, not consistently in approved catalog |

## 4. Current Model Inventory

Model sources:

- Live GenX model IDs from `https://query.genx.sh/api/v1/models`: 58.
- Static GenX fallback arrays in `src/lib/genx-client.ts`: text, image, video, I2V, audio/music, TTS, STT.
- Static non-GenX model catalog in `src/lib/ai-model-catalog.ts`: GenX auto aliases, Hugging Face task routes, Qwen text, MiniMax text/TTS/STT, Groq text, Together text/image, OpenAI text/TTS/moderation.
- Adult specialist model catalog in `src/lib/adult-model-catalog.ts`: adult text/image/video model specs, several marked private endpoint/local/experimental.

Important inventory finding:

- Live GenX returned 58 models.
- `src/lib/runtime-capability-truth.ts` default model count is 57.
- Static GenX fallback names do not exactly match live names: for example live has `seedance-2` and `seedance-2-i2v`, while the fallback array contains `seedance-2.0` and `seedance-2.0-i2v`.

## 5. Full GenX 58-Model Capability Table

Classification source note: the live GenX endpoint returned IDs only, not a full capability metadata object. The capability classification below is backed by repo static arrays in `src/lib/genx-client.ts` where present, model IDs returned by the live endpoint, and route behavior. Tool/function calling, structured output, moderation, adult policy, and streaming support were not exposed in the live ID-only response. Those columns are therefore marked Not verified — requires live provider test unless a repo route explicitly proves behavior.

| GenX model ID | Repo/live classification | Supported by current repo route? | Async/polling | Verification status |
|---|---|---|---|---|
| `aura-2` | TTS (`GENX_TTS_MODELS`) | `/api/brain/tts` via `callGenXMedia` | No route-level poll for TTS | Not verified — requires live provider test |
| `claude-haiku-4-5` | Text/chat/reasoning likely from ID; not in fallback text array | Generic GenX chat/media client only | Not verified | Not verified — requires live provider test |
| `claude-opus-4-6` | Text/chat/reasoning likely from ID; not in fallback text array | Generic GenX chat/media client only | Not verified | Not verified — requires live provider test |
| `claude-opus-4-7` | Text/chat/reasoning likely from ID; not in fallback text array | Generic GenX chat/media client only | Not verified | Not verified — requires live provider test |
| `claude-sonnet-4-6` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Not verified | Not verified — requires live provider test |
| `gemini-3-flash` | Gemini text/reasoning via GenX live ID | Generic GenX route | Not verified | Not verified — requires live provider test |
| `gemini-3.1-flash-lite` | Gemini text/reasoning via GenX live ID | Generic GenX route | Not verified | Not verified — requires live provider test |
| `gemini-3.1-pro` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Not verified | Not verified — requires live provider test |
| `genxlm-pro-v1-img` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image`, Studio image | Possible provider async depending GenX response | Not verified — requires live provider test |
| `genxlm-pro-v1-img-fast` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image`, Studio image | Possible provider async depending GenX response | Not verified — requires live provider test |
| `genxlm-pro-v1-tl` | Unknown from repo; live ID only | No explicit static mapping found | Not verified | Not verified — requires live provider test |
| `genxlm-pro-v1-tr` | STT/transcription (`GENX_STT_MODELS`) | `/api/brain/stt` | No route-level poll | Not verified — requires live provider test |
| `genxlm-voice-v1` | TTS (`GENX_TTS_MODELS`) | `/api/brain/tts` | No route-level poll | Not verified — requires live provider test |
| `gpt-5` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Streaming not verified | Not verified — requires live provider test |
| `gpt-5-mini` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Streaming not verified | Not verified — requires live provider test |
| `gpt-5-nano` | Text/chat/reasoning likely from ID; not in fallback text array | Generic GenX route | Not verified | Not verified — requires live provider test |
| `gpt-5.3-codex` | Coding/text (`GENX_TEXT_MODELS`) | Workbench/Studio coding routing | Not verified | Not verified — requires live provider test |
| `gpt-5.4` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Not verified | Not verified — requires live provider test |
| `gpt-5.4-mini` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Not verified | Not verified — requires live provider test |
| `gpt-5.4-pro` | Text/chat/reasoning likely from ID; not in fallback text array | Generic GenX route | Not verified | Not verified — requires live provider test |
| `gpt-5.5` | Text/chat/reasoning/coding (`GENX_TEXT_MODELS`) | Chat/research/coding routing | Not verified | Not verified — requires live provider test |
| `gpt-image-2` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image`, image edit may use image operation | Possible provider async | Not verified — requires live provider test |
| `grok-4-fast` | Text/chat likely from ID; not in fallback text array | Generic GenX route | Not verified | Not verified — requires live provider test |
| `grok-4.1-fast-reasoning` | Reasoning/text likely from ID | Generic GenX route | Not verified | Not verified — requires live provider test |
| `grok-4.2` | Text/chat/reasoning (`GENX_TEXT_MODELS`) | Chat/research routing | Not verified | Not verified — requires live provider test |
| `grok-4.2-multi-agent` | Text/agent orchestration likely from ID; no repo-specific multi-agent GenX mapping | Generic GenX route | Not verified | Not verified — requires live provider test |
| `grok-4.2-reasoning` | Reasoning/text (`GENX_TEXT_MODELS`) | Chat/reasoning routing | Not verified | Not verified — requires live provider test |
| `grok-4.3` | Text/chat/reasoning likely from ID | Generic GenX route | Not verified | Not verified — requires live provider test |
| `grok-imagine` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image` | Possible provider async | Not verified — requires live provider test |
| `grok-imagine-pro` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image` | Possible provider async | Not verified — requires live provider test |
| `grok-imagine-video` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes, route persists and polls job | Not verified — requires live provider test |
| `grok-tts` | TTS (`GENX_TTS_MODELS`) | `/api/brain/tts`, voice options | No route-level poll | Not verified — requires live provider test |
| `kling-avatar-v2-pro` | Avatar/talking video by ID | Avatar route is absent in `src/lib/studio-route-map.ts` | Not wired | Blocked until backend route exists |
| `kling-v2.5-turbo` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `kling-v2.5-turbo-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | `/api/brain/video-generate` has text prompt path; I2V route support not proven | Yes for video jobs | Not verified — requires live provider test |
| `kling-v2.6-pro` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `kling-v2.6-pro-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | I2V support not proven by Studio route | Yes for video jobs | Not verified — requires live provider test |
| `kling-v3-pro` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `kling-v3-pro-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | I2V support not proven by Studio route | Yes for video jobs | Not verified — requires live provider test |
| `lyria-3-clip-preview` | Music/song generation (`GENX_AUDIO_MODELS`) | `/api/admin/music-studio` via music library | Job route exists | Not verified — requires live provider test |
| `lyria-3-pro-preview` | Music/song generation (`GENX_AUDIO_MODELS`) | `/api/admin/music-studio` via music library | Job route exists | Not verified — requires live provider test |
| `nano-banana-2` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image` | Possible provider async | Not verified — requires live provider test |
| `nano-banana-pro` | Image generation (`GENX_IMAGE_MODELS`) | `/api/brain/image` | Possible provider async | Not verified — requires live provider test |
| `pixverse-v5.5` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `pixverse-v5.5-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | I2V support not proven by Studio route | Yes for video jobs | Not verified — requires live provider test |
| `pixverse-v6` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `pixverse-v6-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | I2V support not proven by Studio route | Yes for video jobs | Not verified — requires live provider test |
| `recraft-v4` | Image generation/vector family (`GENX_IMAGE_MODELS`) | Image route; vector artifact route not proven | Possible provider async | Not verified — requires live provider test |
| `recraft-v4-pro` | Image generation/vector family (`GENX_IMAGE_MODELS`) | Image route; vector artifact route not proven | Possible provider async | Not verified — requires live provider test |
| `recraft-v4-pro-vector` | Vector image by ID | No dedicated vector route found | Not verified | Not verified — requires live provider test |
| `recraft-v4-vector` | Vector image by ID | No dedicated vector route found | Not verified | Not verified — requires live provider test |
| `seedance-2` | Video generation live ID; static fallback uses `seedance-2.0` | `/api/brain/video-generate` if live catalog used | Yes | Static/live name drift; live test required |
| `seedance-2-i2v` | Image-to-video live ID; static fallback uses `seedance-2.0-i2v` | I2V support not proven by Studio route | Yes for video jobs | Static/live name drift; live test required |
| `seedance-2-r2v` | Reference-to-video by ID | No route-specific support found | Not verified | Not verified — requires live provider test |
| `seedance-v1-fast` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` | Yes | Not verified — requires live provider test |
| `seedance-v1-fast-i2v` | Image-to-video (`GENX_VIDEO_MODELS`, `GENX_I2V_MODELS`) | I2V support not proven by Studio route | Yes for video jobs | Not verified — requires live provider test |
| `veo-3.1` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` via GenX | Yes | Not verified — requires live provider test |
| `veo-3.1-fast` | Video generation (`GENX_VIDEO_MODELS`) | `/api/brain/video-generate` via GenX | Yes | Not verified — requires live provider test |

GenX capabilities specifically requested:

| Capability | GenX evidence | Current conclusion |
|---|---|---|
| Chat | Text models in `GENX_TEXT_MODELS` and live text IDs | Wired, not live-tested |
| Reasoning | Text/reasoning model IDs and routing roles | Wired, not live-tested |
| Coding | `gpt-5.3-codex`, `GENX_TEXT_MODELS`, Workbench model use | Wired, not live-tested |
| Research | Studio research uses protected route and text model routing | Partial; Firecrawl-backed crawling separately needs key |
| Image generation | `GENX_IMAGE_MODELS`, image route | Wired, not live-tested |
| Image editing | `GENX_CAPABILITIES` includes image edit/editing; image-edit route exists | Partial; not live-tested |
| Video generation | `GENX_VIDEO_MODELS`, video route | Wired async; not live-tested |
| TTS | `GENX_TTS_MODELS`, TTS route | Wired; not live-tested |
| STT | `GENX_STT_MODELS`, STT route | Wired; not live-tested |
| Music/song | `GENX_AUDIO_MODELS` Lyria models, music studio route | Partial; not live-tested |
| Sound effects | No dedicated SFX route/model field found | Missing/not verified |
| Embeddings | `GENX_CAPABILITIES` includes embeddings, brain embeddings route exists | Partial; not live-tested |
| Moderation | Moderation route exists; GenX-specific moderation model not proven | Partial/not verified |
| Adult text | `GENX_CAPABILITIES` includes adult fields but adult route intentionally does not route normal GenX safe/default chat | Do not claim GenX adult text production support |
| Adult image | `GENX_CAPABILITIES` includes adult image but production adult image route uses xAI/Together/HF | Do not claim GenX adult image support without route/test |
| Adult video | Catalog/policy has experimental entries but no production route | Blocked |
| Tool/function calling | Not exposed by live ID catalog or inspected route metadata | Not verified — requires live provider test |
| Streaming | Chat stream route exists, GenX streaming not proven from catalog | Not verified — requires live provider test |
| Async polling jobs | Video route and music job route support polling | Wired for video/music; provider behavior not live-tested |
| Structured output | Not proven by model catalog metadata | Not verified — requires live provider test |

## 6. Provider-by-Provider Capability Table

| Provider | Chat/reasoning/coding | Research/crawl | Image | Video | Music/song | TTS | STT | Adult text | Adult image | Adult video | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GenX | Yes in catalog/routes | Research via text; crawl needs Firecrawl | Yes | Yes | Yes via Lyria IDs | Yes | Yes | Not production-proven | Not production-proven | Blocked | Broadest primary, live tests missing |
| Hugging Face | Task routes and adult private endpoint path | Possible specialist tasks | Yes through specialist routes; Studio image wrapper blocks direct HF image | Explicitly blocked for video route | Possible models not proven through current integration | Yes fallback | Yes fallback | Yes only with endpoint/key and policy | Yes only with key/private endpoint and policy | Experimental catalog only | Partial/specialist |
| MiniMax/Mimo | Static text models | No | No | Route mentions MiniMax under Replicate, not MiniMax direct | Governance says post-launch, not wired | Specialist TTS route | Static task STT entry but direct route not proven | No | No | No | TTS partial; music not wired |
| Qwen/DashScope | Yes text | No crawl | Specialist Wanx image route | DashScope Wan video route | No | Not proven | Qwen audio STT route | No | No | No | Partial |
| Together | Yes text | No crawl | Yes | Route fallback uses image endpoint, not true video model catalog | No | No | No | Yes through adult text route | Yes through adult image route | No | Partial |
| Groq | Yes text | No crawl | No | No | No | Yes | Yes | Adult route uses xAI/Grok key, not approved Groq catalog | Adult image route uses xAI/Grok key | No | Partial |
| OpenAI | Yes text | No crawl | Static direct image not in current approved catalog except via task? | No | No | Yes | Yes | Not in adult route chain except custom-compatible | No | No | Partial |
| Gemini direct | Governance/voice routes only | No | No direct route verified | Direct route blocks Gemini video | No | Yes via `/api/brain/tts` | Yes via `/api/brain/stt` | No | No | No | Inconsistent approval |
| GitHub | No model role | Workbench repo operations | No | No | No | No | No | No | No | No | Required for Workbench |
| Firecrawl | No | Yes for crawling/research if key | No | No | No | No | No | No | No | No | Required for crawl-backed research |
| Playwright | Browser automation/checks | Yes automation | No | No | No | No | No | No | No | No | Tool health live-test required |
| Redis | Jobs/queue support | No | No | No | No | No | No | No | No | No | Infra partial |
| Storage | Artifact/media persistence | No | Preview/storage | Preview/storage | Preview/storage | Preview/storage | Transcript artifacts | Adult artifacts if created | Adult artifacts if created | No | Infra, needs writable test |
| Webdock | VPS/deploy ops | No | No | No | No | No | No | No | No | No | Optional/ops |
| SMTP/email | Notifications | No | No | No | No | No | No | No | No | No | Optional |

## 7. Capability Ownership Matrix

| Capability | Recommended primary owner from current repo | Fallback owner | Wired? | Dashboard visible? | Real route | Final/async | Polling | Artifacts/previews | Required config | Readiness |
|---|---|---|---|---|---|---|---|---|---|---|
| Chat | GenX text | OpenAI/Groq/Qwen/Together | Yes | Studio | `/api/admin/studio/execute`, chat stream routes | Stream/final | Stream route exists | Chat artifacts/memory partial | GenX or direct key | Partial, not live-tested |
| Reasoning | GenX reasoning/text | OpenAI/Groq/Qwen | Yes | Studio/model selectors | routing + execute route | Final | No | Text artifact possible | Provider key | Partial |
| Coding | GenX `gpt-5.3-codex`/text | OpenAI/Groq | Yes | Studio handoff, Workbench | Workbench routes, Studio handoff | Job/workflow | Workbench job refresh | Diff/check logs | GitHub + model key | Partial |
| Repo audit | Workbench/GitHub | GenX/OpenAI text | Yes | Workbench | `/api/admin/repo-workbench/[workspaceId]/audit` | Workflow | Status routes | Logs/diffs | GitHub token | Not verified live |
| PR creation | GitHub Workbench | None | Yes | Workbench | `/api/admin/repo-workbench/[workspaceId]/pr` | Final | PR status route | PR URL | GitHub token | Not verified live |
| Deployment handoff | Workbench deploy guard | Webdock/VPS routes | Partial | Workbench/Ops | deploy routes | Guarded | Deploy status | Logs | VPS config | Partial |
| Research | GenX/text + Firecrawl | OpenAI/Groq text | Yes | Studio | `/api/admin/research/assist`, Studio execute | Final/job depending route | Research job route exists | Artifacts saved by Studio route | Firecrawl for crawl | Partial |
| Website crawling | Firecrawl | Playwright/manual | Partial | Apps/Research/Ops | app crawl/research routes | Job/final | Route-dependent | App memory possible | Firecrawl key | Not live-tested |
| Browser automation | Playwright | None | Partial | Settings/Ops | system/tool routes | Final/check | No | Logs | Playwright install/runtime | Not live-tested |
| Image generation | GenX image | Together/Qwen/HF specialist | Yes | Studio | `/api/brain/image` via Studio | Final/job depending provider | Studio job polling partial | Image artifact preview | GenX or image provider key | Partial |
| Image editing | GenX image edit | HF/Qwen specialist if route supports | Partial | Studio if tab exists | `/api/brain/image-edit` | Final/job | Not fully proven | Artifact route exists | Provider key | Partial |
| Video generation | GenX video | Qwen/DashScope; route also Replicate/Together | Yes | Studio | `/api/brain/video-generate` | Async | `/api/brain/video-generate/[jobId]` | Video artifact on success | GenX/Qwen/etc | Partial |
| Audio generation | GenX Lyria/music route | None proven | Partial | Studio music/audio | `/api/admin/music-studio` | Async/sync | `/api/admin/music-studio/jobs/[jobId]` | Music artifacts | GenX key | Not live-tested |
| Music/song generation | GenX Lyria | None proven | Partial | Studio music/audio | music-studio route | Async/sync | Yes | Artifacts | GenX key | Not live-tested |
| TTS | GenX TTS or OpenAI/Groq | HF; specialist MiniMax | Yes | Studio/voice | `/api/brain/tts`, MiniMax specialist route | Final audio | No | Audio playback/artifact partial | Provider key | Partial |
| STT/transcription | OpenAI/Groq/GenX/Qwen | HF | Yes | Studio STT | `/api/admin/studio/stt`, `/api/brain/stt` | Final text | No | Transcript artifact | Provider key | Partial |
| Voice selection | Voice options route | Direct TTS params | Partial | Studio | `/api/admin/voice/options`, `/api/admin/voice/preview` | Final audio | No | Preview audio | TTS provider key | Partial |
| Voice cloning/design | ElevenLabs/Deepgram routes mention voices | None | No production app flow found | Not clearly visible | No clone/design route found | N/A | N/A | N/A | External keys | Missing |
| Embeddings | Brain embeddings | OpenAI/HF/GenX depending route | Partial | Not central | `/api/brain/embeddings` | Final | No | Retrieval/memory | Provider key | Partial |
| RAG/retrieval | Retrieval/RAG routes | Memory | Partial | Memory/Ops | `/api/admin/retrieval`, `/api/rag` | Final | No | Memory artifacts | Storage/vector config | Partial |
| Moderation/safety | OpenAI moderation + content-filter | App safety | Yes | Settings/App safety | `/api/brain/moderation`, app safety routes | Final | No | Policy logs not fully proven | OpenAI optional; local filters | Partial |
| Adult text | Adult text route | Together/xAI/HF/custom | Yes | Studio adult | `/api/brain/adult-text` | Final | No | Text artifact via Studio if wired | App adult policy + provider key/endpoint | Partial |
| Adult image | Adult image route | xAI/Together/HF | Yes | Studio adult | `/api/brain/adult-image` | Final | No | Image artifact if response saved | App adult policy + provider key | Partial |
| Adult video | None production-ready | Experimental HF catalog only | No | Should stay blocked | No production adult-video route found | N/A | N/A | N/A | Provider policy + app policy + safeguards + route | Blocked |
| App onboarding | App profile/package/agent routes | Manual config | Yes | Apps & Agents | app profile/package/agent/safety/budget routes | Final | No | App memory partial | DB/session | Partial |
| Agent assignment | App agent route | Registry | Partial | Apps & Agents | `/api/admin/app-agents` | Final | No | DB agent | DB | Partial |
| App memory | Memory routes | Artifact-derived memory | Partial | Memory/Learning | memory routes/app learning | Final | No | Memories/artifacts | DB/storage | Partial |
| Artifact creation | Artifact store | Media artifacts | Yes | Studio/Memory/Ops | `/api/admin/artifacts`, media/file routes | Final | N/A | Preview exists | Storage writable | Partial |
| Artifact preview | Dashboard artifact renderer | File route | Yes | Studio/Memory/Ops | `/api/artifacts/file/[...key]`, admin artifacts media | Final | N/A | Image/video/audio/text | Storage URLs | Partial |
| Cost tracking | Usage/cost routes | Budget enforcement | Partial | Ops/Apps | `/api/admin/costs`, budget routes | Final | N/A | Summaries | DB | Partial |
| Runtime health | System/runtime truth | readiness audit | Yes | Ops/Settings | `/api/admin/runtime-truth`, `/api/admin/readiness`, system status | Final | N/A | Status cards | Env/live tests | Partial |
| Queues/jobs | Jobs, video/music jobs | Redis if configured | Partial | Ops/Studio | jobs routes | Async | Polling for video/music | Job artifacts | DB/Redis | Partial |
| Provider testing | Settings test routes | health-check-all | Yes | Settings | provider/status/test routes | Final | N/A | Last result fields | Keys | Partial |

## 8. Routing Governance Findings

Correct:

- `src/lib/live-ai-routing.ts` has a capability taxonomy and maps request capabilities to model roles.
- `src/lib/universal-model-catalog.ts` centralizes live GenX discovery with static provider catalog fallback.
- Studio execution uses route decisions and records selected provider/model/reason where available.
- Workbench model selection avoids sending GenX auto aliases directly by normalizing to executable model IDs in the dashboard code path.

Incorrect or incomplete:

- Manual explicit provider/model selection in `src/lib/live-ai-routing.ts` can accept a provider/model from the catalog without proving the selected model supports the requested capability. Caller-side filtering reduces risk, but backend governance should also enforce capability compatibility.
- `src/lib/runtime-capability-truth.ts` defaults GenX `modelCount` to 57 while the live endpoint returned 58.
- Static GenX fallback video model names differ from live names for Seedance 2.
- `src/lib/studio-route-map.ts` correctly marks avatar/talking video as missing, but `src/lib/runtime-capability-truth.ts` and adult policy code include broader categories such as adult video/voice. The route truth and policy truth should be reconciled.
- Music routing is inconsistent: Studio's capability normalization maps music/audio to `voice_tts` in `src/app/api/admin/studio/execute/route.ts`, while execution calls `/api/admin/music-studio`. This can select a TTS model for a music job unless the UI or music route corrects it.
- TTS governance is inconsistent: `/api/brain/tts` supports GenX, Groq, OpenAI, Gemini, Hugging Face, ElevenLabs, and Deepgram; `/api/admin/specialist/minimax-tts` supports MiniMax/Mimo; but Studio execution currently limits voice/TTS provider preservation to GenX/Groq/OpenAI/HuggingFace or `auto`, so MiniMax/Mimo selection is not consistently honored in the main Studio execute path.
- Direct Gemini appears in TTS/STT routes and provider governance, but not in the approved AI provider catalog.
- Replicate appears in the video route and governance, but was not part of the requested approved provider list and is not consistently represented in the approved AI catalog.
- Cost-tier routing is present as app/package/budget concepts, but no single route-level governance layer was found that proves cheapest/balanced/premium policy is applied consistently across all capabilities.
- Fallback chains exist in route code, but provider capability truth is inconsistent across dashboard Settings, runtime truth, route maps, and direct route code.

## 9. Studio Route/Capability Findings

Studio page: `src/app/admin/dashboard/page.tsx`
Main route: `POST /api/admin/studio/execute` in `src/app/api/admin/studio/execute/route.ts`
STT route: `POST /api/admin/studio/stt` in `src/app/api/admin/studio/stt/route.ts`
Workbench handoff: `POST /api/admin/studio/workbench-handoff`
Route map: `src/lib/studio-route-map.ts`

| Studio tab/capability | Backend route | Protected? | Result type | Artifact behavior | Finding |
|---|---|---|---|---|---|
| Chat | Studio execute/chat stream routes | Yes | Stream/final | Memory/artifact route-dependent | Real route, key-dependent live behavior not verified |
| Research | `/api/admin/research/assist` through Studio execute | Yes | Final | Studio saves artifact | Firecrawl blocker must remain if key missing |
| Image | `/api/brain/image` through Studio execute | Admin wrapper protected; brain route status not fully audited here | Final/job depending provider | Image artifact saved by Studio path if output exists | HF image direct path is explicitly blocked in wrapper; GenX/Together/Qwen paths need live test |
| Video | `/api/brain/video-generate` | Studio wrapper protected | Async job | Poll route creates artifact when succeeded | Real async route exists; provider key missing |
| Music/audio | `/api/admin/music-studio` | Yes | Sync or async job | Music artifacts route exists | Capability normalization mismatch with `voice_tts` needs fix |
| Voice/TTS | `/api/brain/tts`; specialist MiniMax route exists separately | Studio wrapper protected; brain route not session-protected by itself | Final audio | Audio artifact partial/specialist | MiniMax/Mimo selection not consistently preserved through Studio execute |
| STT | `/api/admin/studio/stt` -> `/api/brain/stt` | Yes | Final transcript | Transcript artifact saved | Real upload route exists, provider key missing |
| Adult text | `/api/brain/adult-text` | Studio wrapper protected; adult route does policy | Final text | Studio artifact behavior route-dependent | Real route with app safety gate |
| Adult image | `/api/brain/adult-image` | Studio wrapper protected; adult route does policy | Final image if provider succeeds | Artifact route-dependent | Real route with app safety gate |
| Adult video/voice | None production-ready | N/A | N/A | N/A | Must stay blocked |
| Avatar/talking video | None in `studio-route-map` | N/A | N/A | N/A | Correctly blocked as route missing |

Misleading Studio risks:

- Music/audio may appear equivalent to real song generation, but live Lyria/GenX execution was not verified and Studio capability routing is mapped through TTS.
- Voice selector can show options from `/api/admin/voice/options`, but MiniMax/Mimo specialist TTS is not part of that options list and main Studio execute does not consistently route to the MiniMax specialist endpoint.
- A route returning a job ID must not be displayed as completed until storage/output URL exists. Video route has proper polling support; image/music behavior must remain stateful and not fake final output.

## 10. Workbench Route/Model Findings

Dashboard: `src/app/admin/dashboard/workbench/page.tsx`
Core library: `src/lib/repo-workbench.ts`
Status library: `src/lib/repo-workbench-status.ts`
Route family: `src/app/api/admin/repo-workbench/**`

Real route surface found:

- GitHub repos/status/branches/PRs: `/api/admin/repo-workbench/github/repos`, `/github/status`, `/github/branches`, `/github/prs`
- Workspace setup/status/tree/file/diff/patch/plan/checks/run/run-check/apply-patch/commit/push/pr/pr-status/merge/deploy/deploy/status/pull/reset
- Job latest/resume/logs: `/api/admin/repo-workbench/jobs/latest`, `/jobs/[jobId]`, `/jobs/[jobId]/logs`
- Models: `/api/admin/repo-workbench/models`

Findings:

- Workbench is a real route-backed workflow, not only UI.
- GitHub token must remain hidden; no evidence found that route output intentionally returns token values.
- Main push/merge/deploy must stay guarded by existing environment checks and explicit confirmation paths.
- Workbench model governance should share the same universal capability filtering as Studio, with backend enforcement that selected models support coding/reasoning and never media-only tasks.
- Latest job resume route exists, but live PR creation/push/check flow is Not verified — requires live provider test and GitHub token.

## 11. Apps & Agents Onboarding Findings

Routes/libraries:

- App profile: `GET/POST /api/admin/app-profiles`, `src/lib/app-profiles.ts`
- App AI package: `GET/POST/DELETE /api/admin/app-ai-package`, `src/lib/app-ai-package.ts`, `src/lib/app-ai-package-store.ts`
- Recommendation: `/api/admin/app-ai-package/recommend`
- Agent registry/agent config: `/api/admin/app-agents`, `/api/admin/app-agents/[slug]`, `src/lib/app-agent.ts`, `src/lib/agent-registry.ts`
- App safety: `/api/admin/app-safety`, `src/lib/content-filter.ts`
- App budgets: `/api/admin/app-budgets`, `src/lib/app-budget-enforcement.ts`
- App health/discovery/crawl/learning: app-health, app-discovery, app-agents slug crawl/learning routes

What exists:

- App profile creation/upsert, with DB-backed `AppAiProfile` and legacy runtime overrides.
- App AI package with provider/model selections, fallback selections, voice, crawler, budget, adult policy, permissions, status, and blockers.
- Provider approval validation through `isApprovedAIProvider`.
- App agent creation/update with capability, adult mode, sensitive-topic, learning, tone, budget, and rules fields.
- App safety policy with `safeMode`, `adultMode`, and `suggestiveMode`, including hardblocked category notes.
- App budget concepts and usage/cost paths.

What is incomplete or risky:

- App AI package validates provider approval, but it does not prove selected model capability against live model metadata at save time.
- Adult policy values include `adult_video` and `adult_voice`, but production adult video/voice route support is missing; app packages must not enable those as executable capabilities.
- App crawling/research exists, but Firecrawl/Playwright live availability was not verified.
- App memory exists through memory/learning routes, but automated memory promotion scheduler remains optional/later rather than production-ready.
- App deployment settings and runtime health per app exist partially, but no single onboarding wizard evidence proves a new app can be fully configured end-to-end without manual route knowledge.

## 12. Music and Voice Capability Findings

Exact answers:

| Question | Answer | Evidence |
|---|---|---|
| Does GenX expose Gemini/Lyria music? | Lyria yes: live GenX has `lyria-3-clip-preview` and `lyria-3-pro-preview`. Gemini text IDs are exposed. Gemini music was not verified separately. | live GenX endpoint, `GENX_AUDIO_MODELS` |
| Real song generation? | Partially wired; not live-verified. | `/api/admin/music-studio`, `src/lib/music-studio.ts`, Lyria GenX IDs |
| Instrumental generation? | Not verified — requires live provider test. | Music request supports genres/styles, but no live provider result |
| TTS? | Wired through GenX, OpenAI, Groq, Gemini, HF, ElevenLabs, Deepgram, plus MiniMax specialist route. | `/api/brain/tts`, `/api/admin/specialist/minimax-tts` |
| Voice selection? | Partially wired. | `/api/admin/voice/options`, `/api/admin/voice/preview`, TTS route body fields |
| STT? | Wired through GenX, OpenAI, Groq, Gemini, Qwen, HF. | `/api/brain/stt`, `/api/admin/studio/stt` |
| SFX? | No dedicated SFX route/model ownership found. | Not found in audited route/catalog files |
| Lyrics/vocals? | Lyrics generation exists in music-studio; vocals depend on provider result and are not live-verified. | `/api/admin/music-studio` action `lyrics_only`, music library |
| MiniMax/Mimo music? | Not production-wired as music. MiniMax/Mimo is TTS/text partial. | `src/lib/ai-provider-governance.ts`, MiniMax specialist TTS route |
| Qwen audio/music? | STT via Qwen audio exists; music/song not found. | `/api/brain/stt` |
| OpenAI music? | TTS/STT yes; song/music generation not found. | `/api/brain/tts`, `/api/brain/stt` |
| HF music/audio? | Task/specialist possibility, but no production music owner proven. | HF task routes and music route do not prove HF music |
| Together/Groq music? | No current setup for song/music. Groq supports TTS/STT in routes. | TTS/STT routes |

Music/voice blockers:

- No provider key was available in this runtime.
- Music generation should use music capability routing, not `voice_tts` routing.
- MiniMax/Mimo must be either routed through the specialist TTS route from Studio or marked unavailable from the main Studio path.
- Voice options omit MiniMax/Mimo despite specialist route existence.

## 13. Adult Capability Findings

Current adult routes:

- Adult text: `POST /api/brain/adult-text`
- Adult image: `POST /api/brain/adult-image`
- App safety: `GET/POST /api/admin/app-safety`
- Catalog: `src/lib/adult-model-catalog.ts`

Adult text:

- Supports policy-gated adult-oriented text through specialist providers only: Hugging Face private/local endpoint, Together AI, xAI/Grok, or custom OpenAI-compatible endpoint.
- Requires `adultMode=true` and `safeMode=false` for the app.
- Blocks hard disallowed categories through `content-filter`.
- Does not silently fall back to normal GenX safe/default chat models.
- Production readiness: partial, Not verified — requires live provider test.

Adult image:

- Supports policy-gated adult image through xAI/Grok image, Together AI, and Hugging Face adult image catalog paths.
- Requires app adult policy and provider access.
- Route notes that HF standard inference may apply moderation and private endpoint is recommended for unrestricted adult content.
- Production readiness: partial, Not verified — requires live provider test.

Adult video:

- Not production-supported.
- `src/lib/adult-model-catalog.ts` contains experimental/private/local adult video entries, but no production dashboard route proves provider policy, app policy, safeguards, route execution, polling, artifact creation, and preview.
- Must stay blocked until all of these exist:
  - real adult-video route
  - provider/model policy permission
  - app policy permission
  - input/output safeguards
  - async job/polling if provider requires it
  - artifact persistence and preview
  - live provider test

Unsupported categories that must stay blocked:

- Minors/CSAM, non-consensual content, exploitation, real-person sexual identification, violence/gore, self-harm facilitation, hate/extremism, terrorism/radicalization, and degrading/coercive/dehumanizing content as implemented or documented by `content-filter` and adult routes.

Missing gates:

- A single adult capability matrix tying `app-ai-package` adult policy values to executable route availability.
- A hard backend check preventing app packages from enabling adult video/voice when routes are absent.
- Live provider tests proving allowed adult text/image providers return safe, policy-compliant outputs.

## 14. App-Onboarding Readiness Findings

| Onboarding area | Exists | Wired | Fake/placeholder risk | Required fix |
|---|---|---|---|---|
| App profile creation | Yes | Yes | Runtime override path is process-lifetime only | Prefer DB-backed profile path and label legacy runtime mode |
| App crawling/research | Yes | Partial | Firecrawl/Playwright not live-tested | Add live test status to onboarding |
| Provider/model selection per app | Yes | Partial | Model capability not proven at save time | Validate provider/model/capability against universal catalog |
| Agent assignment | Yes | Partial | Create/edit status must be honest in UI | Wire registry to assignments and disable unwired actions |
| App memory | Yes | Partial | Automated learning may be overstated | Mark scheduler optional/later |
| Budgets | Yes | Partial | Cost enforcement not uniformly proven at route level | Enforce budget per provider call |
| Safety policy | Yes | Yes | Adult video/voice policy values can exceed route support | Block unsupported executable policies |
| Adult policy per app | Yes | Partial | Adult video/voice unsupported | Enforce allowed executable set |
| Media capabilities per app | Yes | Partial | Provider-specific media support not live-tested | Capability tests per app package |
| Coding/repo capabilities per app | Yes | Partial | GitHub token missing in local runtime | Require GitHub test |
| Workbench repo connection per app | Partial | Partial | App-to-repo relationship not fully proven | Add explicit app repo binding truth |
| Deployment settings per app | Partial | Partial | Deploy guard depends on env/runtime | Require per-app deploy readiness |
| Runtime health per app | Yes | Partial | Needs live provider/tool tests | Surface route test results |
| Artifacts per app | Yes | Yes/partial | Missing storage URL can produce pending output | Keep output-pending state |

## 15. Settings and Operations Truth Findings

Settings page: `src/app/admin/dashboard/settings/page.tsx`
Operations page: `src/app/admin/dashboard/operations/page.tsx`
Truth libraries/routes:

- `src/lib/platform-settings-truth.ts`
- `src/lib/runtime-capability-truth.ts`
- `src/lib/readiness-audit.ts`
- `src/lib/system-runtime-status.ts`
- `/api/admin/settings/status`
- `/api/admin/runtime-truth`
- `/api/admin/readiness`
- `/api/admin/system/live-readiness`
- `/api/admin/providers/health-check-all`
- `/api/admin/settings/test-genx`, `/test-github`, `/test-storage`, `/test-webdock`, `/test-adult`

Truth issues:

- Status semantics are correct in intent: Connected should mean key exists and live test passed. However this runtime has no keys, so no provider should be reported Connected from local evidence.
- Runtime truth model count drift: 57 default vs 58 live GenX models.
- Provider truth is split among approved catalog, governance catalog, universal model catalog, platform settings truth, and route-specific code.
- Settings should distinguish direct Gemini, ElevenLabs, Deepgram, Replicate, xAI/Grok, DeepSeek, and Mem0 as "present in code but not consistently approved" rather than silently treating them as equal to approved providers.
- Operations blockers should include source-of-truth drift and capability mismatch risks, not only missing keys.

## 16. Missing Keys/Config

Absent in this local runtime:

- GenX: `GENX_API_KEY`, `GENX_API_URL`
- OpenAI: `OPENAI_API_KEY`
- Groq: `GROQ_API_KEY`
- Together: `TOGETHER_API_KEY`
- Hugging Face: `HUGGINGFACE_API_KEY`, `HF_TOKEN`
- Qwen/DashScope: `QWEN_API_KEY`, `DASHSCOPE_API_KEY`
- MiniMax/Mimo: `MINIMAX_API_KEY`, `MIMO_API_KEY`
- GitHub: `GITHUB_TOKEN`
- Firecrawl: `FIRECRAWL_API_KEY`
- Redis: `REDIS_URL`
- Webdock: `WEBDOCK_API_TOKEN`
- SMTP/email: `SMTP_HOST`

Result: all provider execution, Workbench GitHub actions, Firecrawl crawl, Redis queue, Webdock VPS, and SMTP claims are Not verified — requires live provider test.

## 17. Missing Routes

Missing or not production-proven routes:

- Adult video generation route: missing.
- Adult voice route: missing.
- Avatar/talking video route: intentionally missing in `src/lib/studio-route-map.ts`.
- Voice cloning/design route: missing.
- Sound effects route: missing.
- Dedicated vector generation artifact route for Recraft vector IDs: not found.
- Dedicated image-to-video upload/reference flow for GenX I2V models: not proven by Studio route.
- Dedicated app-to-repo binding route/workflow for app onboarding: partial/not proven.
- Single governance endpoint that validates selected provider/model against capability, policy, app budget, route existence, and live test status before execution: missing.

## 18. Misleading Dashboard Claims/Risks

The dashboard should avoid or fix these claims:

- Do not call the platform fully connected when local/runtime truth has no provider keys or live test results.
- Do not present GenX model count as 57 when live catalog returns 58.
- Do not present all GenX live model IDs as fully classified when the live endpoint returns IDs only.
- Do not present Music/Audio as production-ready song generation until Lyria/GenX live generation passes and music routing uses a music capability instead of `voice_tts`.
- Do not imply MiniMax/Mimo TTS is available from Studio unless Studio execute calls `/api/admin/specialist/minimax-tts` or `/api/brain/tts` supports MiniMax directly.
- Do not imply adult video/voice is executable because policy enums exist.
- Do not imply Gemini direct is an approved provider unless approved catalog and settings truth agree.
- Do not imply Replicate/Together video ownership is governed the same as approved providers; video route has fallback providers that differ from catalog truth.
- Do not mark any provider Connected unless key exists and live test passed.

## 19. Production-Ready Now

Production-ready from repo evidence means route exists, is protected where admin-facing, has structured errors, and does not require a missing external provider to prove basic route shape. It does not mean provider execution succeeded.

- Protected admin route pattern for dashboard APIs using `getSession`.
- Final six dashboard pages exist under `src/app/admin/dashboard`.
- Universal model catalog architecture exists.
- GenX public model catalog can be fetched and counted.
- Studio protected execution wrapper exists.
- Video async job creation and polling route shape exists.
- STT upload wrapper route saves transcript artifacts when transcription succeeds.
- Music job route shape exists.
- Workbench route family exists for repo, branch, plan, patch, checks, commit, push, PR, deploy guard.
- App profile, app AI package, app agent, app safety, app budget, app health/discovery route shapes exist.
- Artifact store/media file route patterns exist.
- Settings/Operations readiness route patterns exist.

## 20. Beta/Partial

- GenX capability classification: partial because live response returned IDs only.
- Chat/reasoning/coding execution: partial until keys and live tests pass.
- Image/video generation: partial until provider live tests pass.
- Music/song generation: partial until GenX Lyria live test passes.
- TTS/STT: partial until provider live tests pass and MiniMax/Mimo routing is reconciled.
- Research/crawling: partial until Firecrawl/Playwright live tests pass.
- Workbench PR flow: partial until GitHub live token test and PR creation test pass.
- App onboarding: partial until package save validates model capability and per-app route readiness.
- Cost tracking: partial until all provider calls enforce usage/budget.
- Runtime readiness: partial until source-of-truth drift is fixed.

## 21. Blocked/Unsupported

- Adult video: blocked.
- Adult voice: blocked.
- Avatar/talking video: blocked until backend route exists.
- Sound effects: unsupported/missing.
- Voice cloning/design: unsupported/missing.
- Direct production claims for Gemini video/Veo through standard Gemini route: blocked by route comments; GenX Veo IDs exist but live execution is not verified.
- Hugging Face video generation through standard Inference API: explicitly blocked by video route.
- MiniMax/Mimo music: unsupported in current production route path.

## 22. Providers Truly Still Needed

Do not add external providers before fixing governance. The current repo already contains enough provider surface to cover the main platform if keys and routes are reconciled:

- GenX should remain primary for text, coding, image, video, music, TTS, and STT where live tests pass.
- OpenAI/Groq/Qwen/Together/HF/MiniMax can serve fallback/specialist roles already present in code.
- GitHub, Firecrawl, Playwright, Redis, Storage, Webdock, SMTP cover platform operations/tooling.

Possible hard gaps after governance cleanup:

- Sound effects provider/model if SFX is a required product capability.
- Voice cloning/design provider/model if voice cloning/design is required.
- Adult video provider/model only if legal, provider-policy, app-policy, safeguards, and route requirements can be satisfied. Current repo does not satisfy that bar.

## 23. Recommended Final Provider/Model Routing Architecture

Recommended architecture using existing providers only:

1. GenX first for all general AI orchestration:
   - Chat/reasoning/coding: GenX text models, with explicit model capability validation.
   - Image: GenX image models, fallback to Qwen/Together/HF specialist where route supports.
   - Video: GenX video models, fallback to Qwen/DashScope only if key and live test pass; treat Replicate as route-present but not approved until governance says so.
   - Music/song: GenX Lyria models only after live music test.
   - TTS/STT: GenX TTS/STT where live tests pass, fallback OpenAI/Groq/Qwen/HF.

2. Specialist providers by capability:
   - MiniMax/Mimo: TTS specialist only until more is proven.
   - Firecrawl: research crawling.
   - GitHub: Workbench.
   - Playwright: browser automation/testing.
   - Storage: artifact persistence.
   - Redis: jobs/realtime if deployment requires.

3. Adult routing:
   - Adult text: adult route only; no normal GenX safe/default fallback.
   - Adult image: adult route only; xAI/Together/HF with app policy gate.
   - Adult video/voice: blocked until production route and policy proof exist.

4. Governance enforcement:
   - Every execution request must pass one backend function that validates app policy, provider approval, model capability, route support, key/test status, budget, adult policy, and fallback chain.
   - Auto aliases must resolve to concrete executable models before any provider call.
   - Manual selections must be rejected if model capability does not match requested task.
   - Dashboard visibility must be generated from the same capability truth object used by execution.

## 24. Exact Dashboard Changes Needed After This Audit

Report-only task; no dashboard changes were made. Needed later:

- Settings: show live GenX count 58 when live catalog fetch succeeds, and flag static fallback drift.
- Settings: split providers into Approved, Route-present but not approved, Optional tool, and Unsupported.
- Settings: show direct Gemini/Replicate/ElevenLabs/Deepgram/xAI/Grok as route-present inconsistencies unless approved.
- Studio: route Music/Audio through a `music_generation` capability, not `voice_tts`.
- Studio: wire MiniMax/Mimo TTS selection to the MiniMax specialist route or mark it unavailable in the main Studio flow.
- Studio: keep adult video/voice and avatar/talking video blocked.
- Studio: show "Not verified — requires live provider test" for key-dependent providers until a test result exists.
- Workbench: surface model capability validation result before plan/patch execution.
- Apps & Agents: prevent app packages from enabling unsupported adult video/voice as executable.
- Operations: include source-of-truth drift, unsupported capabilities, and missing live tests as blockers.

## 25. Exact Backend Changes Needed After This Audit

- Create a single provider/model/capability governance module that all Studio, Workbench, app package, Settings, and Operations paths use.
- Update runtime GenX default count from 57 or remove hardcoded count entirely in favor of live catalog plus explicit fallback count.
- Normalize live/static GenX model naming, especially Seedance 2.
- Add backend capability enforcement for explicit model selections in `src/lib/live-ai-routing.ts`.
- Add music-generation capability routing and prevent TTS models from owning music jobs.
- Reconcile MiniMax/Mimo TTS route with Studio execute and voice options.
- Reconcile approved provider catalog with route-present providers or clearly mark route-present providers as unsupported/unapproved.
- Add app package validation that selected provider/model supports selected capability and route exists.
- Add adult policy enforcement that blocks unsupported executable `adult_video` and `adult_voice` package values.
- Add live provider test persistence and make Settings/Operations consume it as the only "Connected" source.
- Add SFX/voice cloning only if product requirements demand them; otherwise keep unsupported.

## 26. Validation

Validation commands required by the audit:

- `npm run build`: passed. Next.js production build completed successfully and generated 172 static pages.
- `npm run lint`: passed. No ESLint warnings or errors. The command also reported the existing Next.js 16 deprecation notice for `next lint`.
- `npm test`: passed. Vitest reported 42 test files passed and 1208 tests passed.

Status: validation passed for this report-only change.

## 27. Go-Live Readiness Verdict

Ready for live testing: yes, after required keys are added, because the route surface is broad enough to exercise the platform and the dashboard can expose blockers.

Ready for production go-live: no.

Required blockers before go-live:

- Fix provider/model/capability source-of-truth drift.
- Fix GenX model count/name drift.
- Enforce capability compatibility for manual model selections on the backend.
- Reconcile approved providers with route-present providers.
- Live-test GenX, OpenAI, Groq, Together, Hugging Face, Qwen/DashScope, MiniMax/Mimo, GitHub, Firecrawl, Storage, Redis, Playwright, Webdock, and SMTP where required.
- Fix music routing to use music capability and prove Lyria/GenX music execution.
- Fix MiniMax/Mimo TTS Studio routing or mark it unavailable.
- Keep adult video/voice blocked until production routes and safeguards exist.
- Prove Workbench repo -> branch -> plan -> patch -> checks -> commit -> push -> PR flow with a live GitHub token.
- Prove artifact persistence and previews for each output type.
- Pass build, lint, and tests.

Optional/later:

- Avatar/talking video.
- Automated memory promotion scheduler.
- Extra providers beyond current approved/provider-present set.
- SMTP enhancements.
- Sound effects.
- Voice cloning/design.
