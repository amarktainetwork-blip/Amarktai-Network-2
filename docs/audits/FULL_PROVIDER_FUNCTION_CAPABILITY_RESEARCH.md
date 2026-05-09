# Full Provider Function Capability Research

Date: 2026-05-09
Branch: `codex/dashboard-go-live-wiring`
Scope: audit and report only. No implementation, redesign, provider addition, or provider removal was performed.

## 1. Executive Verdict

AmarktAI Network already has a broad provider stack and a broad route surface, but the stack is not yet governed by one capability truth system. The main go-live risk is not a lack of routes. The risk is capability ambiguity: several providers are present in route code but not in the approved provider catalog, several model capabilities are inferred from local arrays rather than live metadata, and several functions are route-shaped but not live-tested with keys.

Most important facts:

- GenX is the intended primary provider/orchestration layer in `src/lib/genx-client.ts`, `src/lib/universal-model-catalog.ts`, and `src/lib/live-ai-routing.ts`.
- The live GenX catalog endpoint `https://query.genx.sh/api/v1/models` returned 58 model IDs during this audit.
- `src/lib/runtime-capability-truth.ts` still has a default GenX model count of 57. This is a source-of-truth bug.
- Official provider docs show current providers can cover most intended functions: chat, coding, reasoning, structured output, function calling, image generation, video generation, music/song generation, TTS, STT, voice cloning/design, web crawling, browser QA, repo PR workflows, runtime health, and storage/artifacts.
- The repo does not yet wire all of those provider capabilities. MiniMax and Qwen are especially underused relative to their official docs.
- Adult text and adult image are route-present and policy-gated in repo code. Adult video, explicit image/video, non-consensual sexual content, minors/age-ambiguous content, deepfake sexualization without consent, genitals, explicit sex acts, coercion, exploitation, violence, degradation, illegal content, and safety bypassing must remain blocked.
- Every key-dependent provider execution claim in this runtime is Not verified - requires live test because local provider keys were absent.

Go-live verdict: not production-ready until capability governance is centralized, live tests are run, and dashboard claims are generated from the same provider/model/function truth used by execution.

## 2. Evidence Sources

Repo sources:

- GenX and models: `src/lib/genx-client.ts`, `src/lib/universal-model-catalog.ts`, `src/lib/ai-model-catalog.ts`
- Approved/governed providers: `src/lib/approved-ai-catalog.ts`, `src/lib/ai-provider-governance.ts`, `src/lib/provider-catalog.ts`, `src/lib/provider-config.ts`
- Routing: `src/lib/live-ai-routing.ts`, `src/lib/capability-router.ts`, `src/lib/routing-engine.ts`, `src/lib/ai-routing-policy.ts`
- Runtime truth: `src/lib/runtime-capability-truth.ts`, `src/lib/platform-settings-truth.ts`, `src/lib/readiness-audit.ts`, `src/lib/system-runtime-status.ts`
- Studio routes: `src/app/api/admin/studio/execute/route.ts`, `src/app/api/admin/studio/stt/route.ts`, `src/app/api/admin/studio/workbench-handoff/route.ts`, `src/lib/studio-route-map.ts`
- Media routes: `src/app/api/brain/image/route.ts`, `src/app/api/brain/image-edit/route.ts`, `src/app/api/brain/video-generate/route.ts`, `src/app/api/brain/video-generate/[jobId]/route.ts`, `src/app/api/brain/tts/route.ts`, `src/app/api/brain/stt/route.ts`
- Music/voice routes: `src/app/api/admin/music-studio/route.ts`, `src/app/api/admin/music-studio/jobs/[jobId]/route.ts`, `src/lib/music-studio.ts`, `src/app/api/admin/specialist/minimax-tts/route.ts`, `src/lib/specialist-provider-routes.ts`, `src/app/api/admin/voice/options/route.ts`, `src/app/api/admin/voice/preview/route.ts`
- Adult routes/catalog: `src/lib/adult-model-catalog.ts`, `src/app/api/brain/adult-text/route.ts`, `src/app/api/brain/adult-image/route.ts`, `src/app/api/admin/app-safety/route.ts`
- App OS: `src/lib/app-profiles.ts`, `src/lib/app-ai-package.ts`, `src/lib/app-ai-package-store.ts`, `src/lib/app-agent.ts`, `src/lib/app-budget-enforcement.ts`, `src/lib/app-discovery.ts`, `src/app/api/admin/app-profiles/route.ts`, `src/app/api/admin/app-ai-package/route.ts`, `src/app/api/admin/app-agents/route.ts`, `src/app/api/admin/app-safety/route.ts`, `src/app/api/admin/app-budgets/route.ts`, `src/app/api/admin/app-health/route.ts`
- Workbench: `src/lib/repo-workbench.ts`, `src/lib/repo-workbench-status.ts`, `src/app/api/admin/repo-workbench/**`, `src/app/admin/dashboard/workbench/page.tsx`
- Dashboard pages: `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/workbench/page.tsx`, `src/app/admin/dashboard/apps-agents/page.tsx`, `src/app/admin/dashboard/memory-learning/page.tsx`, `src/app/admin/dashboard/operations/page.tsx`, `src/app/admin/dashboard/settings/page.tsx`

Live repo/runtime evidence:

- `curl.exe -s --max-time 20 https://query.genx.sh/api/v1/models` returned 58 GenX model IDs.
- Local key presence check from the prior governance audit found these absent: `GENX_API_KEY`, `GENX_API_URL`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `HUGGINGFACE_API_KEY`, `HF_TOKEN`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `MINIMAX_API_KEY`, `MIMO_API_KEY`, `GITHUB_TOKEN`, `FIRECRAWL_API_KEY`, `REDIS_URL`, `WEBDOCK_API_TOKEN`, `SMTP_HOST`.

Official provider documentation used:

- OpenAI model, audio, image, structured output, function calling, moderation, and usage policy docs: `https://platform.openai.com/docs/models`, `https://platform.openai.com/docs/guides/audio`, `https://platform.openai.com/docs/guides/image-generation`, `https://platform.openai.com/docs/guides/structured-outputs`, `https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api`, `https://openai.com/policies/usage-policies/`
- Hugging Face Inference Providers and content policy: `https://huggingface.co/docs/inference-providers/providers/hf-inference`, `https://huggingface.co/content-policy`
- Together AI chat, structured outputs, models, and usage/cost docs: `https://docs.together.ai/docs/chat-overview`, `https://docs.together.ai/docs/json-mode`, `https://docs.together.ai/docs/serverless-models`, `https://docs.together.ai/docs/billing-usage-limits`
- Groq docs and policy: `https://console.groq.com/docs`, `https://console.groq.com/docs/speech-to-text`, `https://console.groq.com/docs/structured-outputs`, `https://console.groq.com/docs/legal/ai-policy`
- Qwen/DashScope/Alibaba Cloud Model Studio docs: `https://www.alibabacloud.com/help/doc-detail/2579562.html`, `https://www.alibabacloud.com/help/en/model-studio/user-guide/model/`, `https://www.alibabacloud.com/help/doc-detail/2979031.html`, `https://www.alibabacloud.com/help/en/model-studio/qwen-tts`, `https://www.alibabacloud.com/help/doc-detail/2989727.html`, `https://www.alibabacloud.com/help/doc-detail/2975034.html`
- MiniMax docs: `https://platform.minimax.io/docs/api-reference/api-overview`, `https://platform.minimax.io/docs/guides/video-generation`, `https://platform.minimax.io/docs/guides/music-generation`, `https://platform.minimax.io/docs/api-reference/voice-cloning-clone`
- xAI/Grok docs: `https://docs.x.ai/developers/model-capabilities/images/generation`, `https://docs.x.ai/developers/models/grok-imagine-image`
- Gemini safety docs: `https://ai.google.dev/docs/safety_setting_gemini`, `https://ai.google.dev/gemini-api/docs/safety-guidance`
- Firecrawl docs: `https://docs.firecrawl.dev/`, `https://docs.firecrawl.dev/features/search`, `https://docs.firecrawl.dev/api-reference/v2-endpoint/search`, `https://docs.firecrawl.dev/api-reference/v2-endpoint/extract`
- Playwright docs: `https://playwright.dev/`, `https://playwright.dev/docs/running-tests`, `https://playwright.dev/docs/browsers`, `https://playwright.dev/docs/next/test-snapshots`
- GitHub REST docs: `https://docs.github.com/en/rest/pulls`, `https://docs.github.com/v3/repos/branches`
- Webdock API docs: `https://webdock.io/en/docs/webdock-api`

## 3. Provider Inventory

| Provider/tool | In requested scope | Repo support | Official capability research | Required key/env | Status |
|---|---:|---|---|---|---|
| GenX | Yes | Primary catalog/client/routing in `genx-client`, `universal-model-catalog`, `live-ai-routing` | Live model list has 58 IDs; endpoint returns IDs only, not full metadata | `GENX_API_URL`, `GENX_API_KEY` | Primary, not live-execution verified |
| Hugging Face | Yes | Approved provider, specialist routes, adult catalog | HF Inference supports ASR and CPU-oriented serverless tasks; dedicated Inference Endpoints needed for heavier/private models | `HUGGINGFACE_API_KEY` or `HF_TOKEN` | Partial and underused |
| Together AI | Yes | Approved provider, text/image catalog, adult route fallback, video route fallback | Official docs cover chat, JSON mode, serverless models, image, embedding, rerank, moderation, function calling and structured outputs on specific models | `TOGETHER_API_KEY` | Partial |
| Groq | Yes | Approved provider, text/TTS/STT routes | Official docs cover chat, STT, TTS, OCR/image recognition, reasoning, content moderation, structured outputs | `GROQ_API_KEY` | Partial |
| OpenAI | Yes | Approved provider, text/TTS/STT/moderation/image paths | Official docs cover text/reasoning/coding, images, audio, moderation, tools/function calling, structured outputs, embeddings, video models | `OPENAI_API_KEY` | Partial |
| Qwen/DashScope | Yes | Approved provider, text catalog, image/video/STT route support | Official docs cover text, visual/image/video, TTS, realtime TTS, STT, realtime STT, voice cloning/design, embeddings | `QWEN_API_KEY`, `DASHSCOPE_API_KEY` | Underused |
| MiniMax/Mimo | Yes | Static catalog and MiniMax TTS specialist route | Official docs cover text, tool calls, speech/TTS, voice cloning/design, video, image, music generation | `MINIMAX_API_KEY`, `MIMO_API_KEY` | Underused |
| xAI/Grok | Route-present | Adult text/image routes reference xAI/Grok; GenX has Grok model IDs | Official xAI docs cover Grok Imagine image API; live GenX list includes Grok text/image/video/TTS IDs | `XAI_API_KEY` or vault `xai`/`grok` | Route-present but not consistently approved |
| Gemini direct | Route-present | TTS/STT route-present; provider governance present; not in approved catalog | Gemini safety docs cover adjustable safety filters; Google model docs cover Gemini APIs, but direct app catalog approval is inconsistent | `GEMINI_API_KEY` via vault/env | Route-present but not consistently approved |
| GitHub | Yes | Workbench repo/branch/commit/push/PR routes | Official REST docs support branches and PR create/status/merge endpoints | `GITHUB_TOKEN` | Required for Workbench |
| Firecrawl | Yes | Research status/crawl route references | Official docs support scrape, crawl, map, search, extract, browser/agent features | `FIRECRAWL_API_KEY` | Required for crawl-backed research |
| Playwright | Yes | Runtime/tool/status references | Official docs support browser automation, screenshots, visual comparisons, multi-browser testing | Local browser/deps | Partial/tool readiness required |
| Redis | Yes | `src/lib/redis.ts`, runtime readiness | Redis supports queue/stream patterns; repo route truth must verify connection | `REDIS_URL` | Partial |
| Storage | Yes | Artifact store/media/file routes | Local/cloud storage depends on repo driver | storage env/driver | Partial |
| Webdock | Yes | VPS/settings test routes | Official API docs exist for server/VPS management | `WEBDOCK_API_TOKEN` | Partial/ops |
| SMTP/email | Present if env | Settings truth references SMTP | SMTP is a protocol/provider-dependent capability, not a single vendor | `SMTP_HOST` and auth env | Optional/partial |

## 4. Full GenX 58-Model Table

Source: live `https://query.genx.sh/api/v1/models` response plus repo arrays in `src/lib/genx-client.ts`. The live endpoint returned IDs only. Anything beyond ID/category mapping is Not verified - requires live test.

| Model | Capability classification | Repo route support | Should own | Should never own | Status |
|---|---|---|---|---|---|
| `aura-2` | TTS from `GENX_TTS_MODELS` | `/api/brain/tts` | TTS fallback/voice | Chat, video, coding | Partial, live test required |
| `claude-haiku-4-5` | Text likely from ID, not in fallback array | Generic GenX client only | Chat/fast text if live metadata confirms | Media | Not verified |
| `claude-opus-4-6` | Text/reasoning likely from ID, not in fallback array | Generic GenX client only | Reasoning if live metadata confirms | Media | Not verified |
| `claude-opus-4-7` | Text/reasoning likely from ID, not in fallback array | Generic GenX client only | Reasoning if live metadata confirms | Media | Not verified |
| `claude-sonnet-4-6` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Chat/reasoning/coding | Media | Partial, live test required |
| `gemini-3-flash` | Gemini text via GenX live ID | Generic GenX client | Fast chat/research if verified | Media unless metadata confirms | Not verified |
| `gemini-3.1-flash-lite` | Gemini text via GenX live ID | Generic GenX client | Fast chat if verified | Media unless metadata confirms | Not verified |
| `gemini-3.1-pro` | Text/reasoning in fallback text array | Studio/Workbench text routes | Reasoning/research | Media unless metadata confirms | Partial |
| `genxlm-pro-v1-img` | Image generation in fallback image array | `/api/brain/image` | Image generation | Text/coding/video | Partial |
| `genxlm-pro-v1-img-fast` | Image generation in fallback image array | `/api/brain/image` | Fast image generation | Text/coding/video | Partial |
| `genxlm-pro-v1-tl` | Unknown from repo | No explicit support found | Nothing until metadata known | Production routing | Not verified |
| `genxlm-pro-v1-tr` | STT/transcription in fallback STT array | `/api/brain/stt` | STT | TTS/chat/video | Partial |
| `genxlm-voice-v1` | TTS in fallback TTS array | `/api/brain/tts` | TTS | STT/chat/video | Partial |
| `gpt-5` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Reasoning/coding | Media | Partial |
| `gpt-5-mini` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Balanced chat/coding | Media | Partial |
| `gpt-5-nano` | Text likely from ID, not in fallback array | Generic GenX client | Fast/simple text if verified | Media | Not verified |
| `gpt-5.3-codex` | Coding/text in fallback text array | Workbench/Studio coding | Coding, repo audit | Media | Partial |
| `gpt-5.4` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Reasoning/coding | Media | Partial |
| `gpt-5.4-mini` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Balanced text/coding | Media | Partial |
| `gpt-5.4-pro` | Text/reasoning likely from ID | Generic GenX client | Premium reasoning if verified | Media | Not verified |
| `gpt-5.5` | Text/reasoning/coding in fallback text array | Studio/Workbench text routes | Premium reasoning/coding | Media | Partial |
| `gpt-image-2` | Image generation in fallback image array | `/api/brain/image`, image edit possible | Image generation/editing | Text/coding/video | Partial |
| `grok-4-fast` | Text likely from ID | Generic GenX client | Fast chat if verified | Media | Not verified |
| `grok-4.1-fast-reasoning` | Reasoning/text likely from ID | Generic GenX client | Reasoning if verified | Media | Not verified |
| `grok-4.2` | Text/reasoning in fallback text array | Studio text routes | Chat/reasoning | Media | Partial |
| `grok-4.2-multi-agent` | Multi-agent text by ID; no repo-specific mapping | Generic GenX client | Multi-agent orchestration only if metadata/test confirms | Media | Not verified |
| `grok-4.2-reasoning` | Reasoning/text in fallback text array | Studio text routes | Reasoning | Media | Partial |
| `grok-4.3` | Text/reasoning likely from ID | Generic GenX client | Reasoning if verified | Media | Not verified |
| `grok-imagine` | Image generation in fallback image array | `/api/brain/image` | Image generation | Text/coding | Partial |
| `grok-imagine-pro` | Image generation in fallback image array | `/api/brain/image` | Premium image generation | Text/coding | Partial |
| `grok-imagine-video` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Chat/coding | Partial |
| `grok-tts` | TTS in fallback TTS array | `/api/brain/tts`, voice options | TTS | STT/chat/video | Partial |
| `kling-avatar-v2-pro` | Avatar/talking video by ID | No Studio backend route | Nothing until route exists | Public available avatar claims | Blocked |
| `kling-v2.5-turbo` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Text/coding | Partial |
| `kling-v2.5-turbo-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `kling-v2.6-pro` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Text/coding | Partial |
| `kling-v2.6-pro-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `kling-v3-pro` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Text/coding | Partial |
| `kling-v3-pro-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `lyria-3-clip-preview` | Music/song in fallback audio array | `/api/admin/music-studio` | Short music/song generation | TTS/chat/video | Partial |
| `lyria-3-pro-preview` | Music/song in fallback audio array | `/api/admin/music-studio` | Full music/song generation | TTS/chat/video | Partial |
| `nano-banana-2` | Image generation in fallback image array | `/api/brain/image` | Image generation | Text/coding | Partial |
| `nano-banana-pro` | Image generation in fallback image array | `/api/brain/image` | Premium image generation | Text/coding | Partial |
| `pixverse-v5.5` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Text/coding | Partial |
| `pixverse-v5.5-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `pixverse-v6` | Video generation in fallback video array | `/api/brain/video-generate` | Video generation | Text/coding | Partial |
| `pixverse-v6-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `recraft-v4` | Image/vector family in fallback image array | `/api/brain/image` | Image generation | Text/video | Partial |
| `recraft-v4-pro` | Image/vector family in fallback image array | `/api/brain/image` | Premium image generation | Text/video | Partial |
| `recraft-v4-pro-vector` | Vector image by ID | No dedicated vector route found | Vector generation after route exists | Chat/video | Not verified |
| `recraft-v4-vector` | Vector image by ID | No dedicated vector route found | Vector generation after route exists | Chat/video | Not verified |
| `seedance-2` | Video live ID; fallback has `seedance-2.0` | `/api/brain/video-generate` if live catalog used | Video generation | Text/coding | Misconfigured static/live drift |
| `seedance-2-i2v` | I2V live ID; fallback has `seedance-2.0-i2v` | Video route, I2V upload not proven | I2V after route support | Text/coding | Misconfigured static/live drift |
| `seedance-2-r2v` | Reference-to-video by ID | No route-specific support found | R2V only after route exists | Text/coding | Not verified |
| `seedance-v1-fast` | Video generation in fallback video array | `/api/brain/video-generate` | Fast video generation | Text/coding | Partial |
| `seedance-v1-fast-i2v` | Image-to-video in fallback I2V/video arrays | Video route, I2V upload not proven | I2V after route support | Text/coding | Partial |
| `veo-3.1` | Video generation in fallback video array | `/api/brain/video-generate` via GenX | Premium video | Text/coding | Partial |
| `veo-3.1-fast` | Video generation in fallback video array | `/api/brain/video-generate` via GenX | Fast video | Text/coding | Partial |

## 5. Provider-by-Provider Function Table

| Provider | Strong official capabilities | Repo route support | Underused or misconfigured | Should own | Should never own |
|---|---|---|---|---|---|
| GenX | Live catalog covers text, image, video, music, TTS, STT IDs | Studio/Workbench/media routes | Live endpoint lacks metadata; runtime count drift | Primary orchestration and broad fallback chain | Unsupported/adult claims without route/policy proof |
| Hugging Face | Inference tasks, ASR, embeddings/text ranking, private Inference Endpoints | Specialist route, adult HF catalog, TTS/STT fallback | Heavy media/adult should use private endpoint; serverless mostly CPU-oriented per HF docs | Specialist/private endpoint models, embeddings, STT fallback | Production video through standard HF Inference API |
| Together | Chat, JSON mode, serverless text/image/vision/video/audio/embedding/rerank/moderation categories, function calling on listed models | Text/image catalog, adult text/image fallback | Video route uses image endpoint semantics; model-specific capability not enforced | Open models, structured output fallback, adult text/image where policy allows | Video unless true model/route/test proves it |
| Groq | Fast chat, STT, TTS, structured outputs on select models, content moderation/OCR/image docs | Text/TTS/STT routes | Direct moderation/OCR not fully surfaced in dashboard | Low-latency chat, STT, TTS | Image/video/music |
| OpenAI | Text/coding/reasoning, images/edits, audio/TTS/STT, moderation, embeddings, tools/function calling, structured output, video models | Text/TTS/STT/moderation, static catalog | Current catalog has older `gpt-4o`/task aliases, not latest official model set | General fallback, moderation, embeddings, STT/TTS | Adult image/video or anything policy-disallowed |
| Qwen/DashScope | Text, image/video, speech recognition/synthesis, realtime STT/TTS, voice cloning/design, embeddings | Text catalog, Qwen image task, video route, STT route | TTS/voice cloning/design official capability not fully wired | Qwen text, Wan image/video, STT/TTS after wiring | Adult/media claims without policy/test |
| MiniMax/Mimo | Text/tool calls, speech/TTS, voice clone/design, video, image, music | MiniMax TTS specialist, static text/TTS/STT entries | Video/music/image/voice clone/design not wired; Studio TTS route can bypass MiniMax | TTS, voice clone/design, music/video after wiring | Claims through Studio until route preserved |
| xAI/Grok | Image generation API; GenX has Grok text/image/video/TTS IDs | Adult text/image route-present, GenX IDs | Direct xAI approval/catalog inconsistent | Direct image/adult text-image only if policy/key/live tests pass | Unreviewed adult/deepfake flows |
| Gemini direct | Safety filters and Gemini API capability family | TTS/STT route-present; not approved catalog | Direct Gemini not normalized into provider truth | TTS/STT if approved and tested | Adult/unsafe content; direct video unless route supports |
| GitHub | Branch/PR/merge/status API | Workbench routes | Requires token and live PR test | Repo/workbench source of truth | AI generation |
| Firecrawl | Search, scrape, crawl, map, extract, browser/agent | Research/crawl references | Must connect live status to Settings/Ops | Search/crawl/extract | AI generation |
| Playwright | Browser automation/testing/screenshots/visual comparisons | Tool/runtime status references | Needs live install/status and dashboard truth | Browser QA/screenshot checks | Web search replacement |
| Redis | Queues/streams/caching | Redis runtime references | No local key | Job queues/realtime | Durable artifact storage by itself |
| Storage | Artifact persistence | Artifact/media/file routes | Writable test required | Artifacts/previews | Provider health |
| Webdock | VPS API | VPS/status/test routes | Token missing | VPS/deploy status | AI functions |
| SMTP/email | Notifications | Settings truth if env exists | No configured env | Alerts/notifications | AI functions |

## 6. Full Product Function Matrix

Status legend:

- Production-ready: route exists and can work without unverified external behavior, or infrastructure path is fully local.
- Partial: route or provider support exists but needs wiring, keys, tests, or governance.
- Not verified: provider docs/repo suggest support, but no live test in this runtime.
- Unsupported/blocked: no route, not permitted, or must remain disabled.

| Function | Best current owner | Fallback | Repo evidence | Official/API evidence | Current status |
|---|---|---|---|---|---|
| Chat | GenX text | OpenAI/Groq/Qwen/Together | Studio execute, model catalogs | OpenAI/Together/Groq/Qwen docs | Partial, live key tests required |
| Reasoning | GenX GPT/Gemini/Grok/Claude text | OpenAI reasoning/Groq | `GENX_TEXT_MODELS`, routing roles | OpenAI/Groq/Together model docs | Partial |
| Long-context reasoning | MiniMax/Qwen/Together/OpenAI where available | GenX if metadata confirms | Static model catalog lacks full context truth | Together serverless model table, MiniMax text docs | Not verified |
| Coding | GenX `gpt-5.3-codex` and GPT text | OpenAI/Groq/Qwen | Workbench models/routes | OpenAI models/docs, Qwen/Together docs | Partial |
| Repo audit | Workbench + coding model | OpenAI/GenX | Workbench audit route | GitHub APIs + LLM docs | Partial |
| Code review | Workbench + coding model | OpenAI/GenX | Workbench diff/plan/check routes | GitHub PR/comment APIs, LLM docs | Partial |
| Structured output/JSON | OpenAI/Together/Groq | GenX if passthrough supports | No single governance route proof | Official OpenAI/Together/Groq structured output docs | Partial |
| Function/tool calling | OpenAI/Together/MiniMax | GenX if metadata confirms | Static catalog has limited fields | Official OpenAI function calling, Together/MiniMax docs | Partial |
| Streaming | Studio chat stream | OpenAI/Groq/Together/GenX if tested | stream routes exist | Official chat docs | Partial |
| Multi-agent orchestration | App agents + GenX `grok-4.2-multi-agent` if proven | Local agent registry | app-agent/agent-registry | GenX ID only, not metadata | Partial/not verified |
| Web search | Firecrawl | OpenAI search tools if added; manual | research routes | Firecrawl search docs | Partial |
| Website crawl | Firecrawl | Playwright/manual | app crawl/research routes | Firecrawl scrape/crawl docs | Partial |
| URL research | Firecrawl + research assist | LLM-only summary | research routes | Firecrawl extract/search docs | Partial |
| Competitor research | Firecrawl + LLM | Manual/Playwright | research routes | Firecrawl search/extract docs | Partial |
| Scraping | Firecrawl | Playwright | app-discovery/crawl | Firecrawl docs | Partial |
| Browser automation | Playwright | Firecrawl browser if wired | runtime/tool references | Playwright docs, Firecrawl browser docs | Partial |
| Screenshot/browser QA | Playwright | None | Playwright status/check references | Playwright screenshot/visual comparison docs | Partial |
| Document understanding | OpenAI/Qwen/Gemini/HF if wired | Firecrawl PDF scrape | Not central in current routes | OpenAI model docs, Firecrawl parsers | Partial/not verified |
| Image generation | GenX image | OpenAI/Together/Qwen/HF | brain image, specialist routes | OpenAI image, xAI image, Qwen/Model Studio docs | Partial |
| Image editing | OpenAI/GenX | Qwen/HF if route supports | brain image-edit | OpenAI image edits docs | Partial |
| Image-to-image | GenX/OpenAI/Qwen | HF private endpoint | image-edit route | Official image docs vary by provider | Partial/not verified |
| Image-to-video | GenX I2V models, MiniMax/Qwen | None | GenX I2V arrays, video route lacks upload proof | MiniMax/Qwen docs support I2V | Partial/underwired |
| Video generation | GenX video | Qwen/DashScope/MiniMax if wired | brain video-generate | MiniMax/Qwen/OpenAI model docs; GenX live IDs | Partial |
| Video editing | None | Qwen/MiniMax if official route supports future | No route found | Qwen model docs mention video editing/generation categories | Unsupported/not wired |
| Avatar/talking video | GenX `kling-avatar-v2-pro` if route added | MiniMax subject-reference video maybe | `studio-route-map` says missing | MiniMax video docs subject-reference | Blocked/not wired |
| Audio generation | GenX music/TTS | MiniMax/Qwen/OpenAI | music/tts routes | MiniMax music/speech, OpenAI audio, Qwen speech | Partial |
| Sound effects | None | Not verified via MiniMax/OpenAI audio | No route found | No current route-backed provider proof | Unsupported |
| Music generation | GenX Lyria | MiniMax Music if wired | music-studio, GenX audio array | MiniMax music docs, GenX live Lyria IDs | Partial/underwired |
| Full song generation | GenX Lyria/MiniMax Music | None | music-studio route | MiniMax music docs says complete song with vocals | Partial/not wired for MiniMax |
| Lyrics | Music studio | LLM text | music-studio `lyrics_only` | LLM text providers | Partial |
| Vocals | GenX/MiniMax music if live | None | music-studio | MiniMax music docs | Not verified |
| Instrumental music | GenX/MiniMax music if live | None | music-studio | MiniMax/GenX IDs | Not verified |
| TTS | GenX/OpenAI/Groq | MiniMax/Qwen/HF/Gemini | brain TTS, MiniMax specialist | OpenAI/Groq/Qwen/MiniMax docs | Partial |
| Voice selection | GenX/OpenAI/Groq routes | MiniMax/Qwen if wired | voice options/preview | MiniMax/Qwen docs | Partial |
| Voice cloning/design | MiniMax/Qwen | None | No product route found | MiniMax/Qwen official docs support | Underused/not wired |
| STT/transcription | OpenAI/Groq/GenX/Qwen | HF/Gemini | brain STT, Studio STT | OpenAI/Groq/Qwen/HF docs | Partial |
| Translation | OpenAI/Groq STT translation/Qwen | LLM text | STT route has language, Groq docs translation endpoint | Groq STT docs, Qwen docs | Partial/not verified |
| Dubbing | Qwen/MiniMax pipeline | OpenAI pipeline | No dedicated route found | Qwen S2S/TTS/STT docs; MiniMax speech | Underused/not wired |

## 7. Adult Capability Matrix

Global platform policy for this audit:

- Always blocked: minors/age-ambiguous content, CSAM, real-person sexualization/deepfakes without consent, genitals, explicit sex acts, coercion/exploitation/violence/degradation, illegal content, and safety bypassing.
- Provider-policy claims are conservative. If policy or route is unclear, status is Not verified - requires live test and legal/provider review.

| Adult/companion function | Provider candidates | Repo route support | Policy evidence | Status |
|---|---|---|---|---|
| Flirty/romantic conversation | Adult text route providers: HF private/local, Together, xAI/Grok, custom | `/api/brain/adult-text` | Adult route blocks minors/coercion/degradation; provider policies vary | Partial, live/provider-policy tests required |
| Sexual adult companion text | HF private/local, Together, xAI/Grok/custom only through adult route | `/api/brain/adult-text` | OpenAI/Gemini/Groq policies require strong restrictions; adult route avoids normal GenX safe models | Partial and must be app-policy gated |
| Non-explicit sexy/glamour image | Adult image route through xAI/Together/HF | `/api/brain/adult-image` | HF policy bans non-consensual/underage sexual content; OpenAI bans sexualization of minors and non-consensual intimate imagery | Partial |
| Topless/non-explicit adult image | xAI/Together/HF only if provider policy and app policy allow | `/api/brain/adult-image` | Not verified for each provider/model | Not verified - requires provider policy/live test |
| Non-explicit adult video | None production-ready | No adult video route | Adult video route absent; provider policies not verified | Blocked |
| Adult audio/voice | None production-ready | No adult voice route | Provider policy unclear; no app gate | Blocked |
| Explicit sex image/video/genitals | None | No route allowed | Platform blocked | Blocked |
| Real-person sexual/deepfake without consent | None | No route allowed | OpenAI policy and app policy block | Blocked |
| Degrading/coercive/violent sexual content | None | Adult text route explicitly blocks degradation patterns | Platform blocked | Blocked |

## 8. Music/Song Capability Matrix

| Capability | Provider capability | Repo wiring | Owner recommendation | Status |
|---|---|---|---|---|
| Music generation | GenX `lyria-3-*`; MiniMax official Music Generation | GenX via `music-studio`; MiniMax not wired | GenX first, MiniMax second after route | Partial |
| Full song with vocals | MiniMax docs state complete song with vocals from description/lyrics; GenX Lyria IDs likely music | Music-studio, provider not live-tested | MiniMax should be added to existing route only after approval/wiring | Underused/not verified |
| Lyrics | Any text model; music-studio `lyrics_only` | Wired | GenX/OpenAI/Groq text | Partial |
| Instrumental | GenX/MiniMax likely if model supports parameters | No live proof | GenX/MiniMax after live test | Not verified |
| Audio preview/playback | Artifact/media support | Partial | Storage/artifact layer | Partial |
| SFX | No verified provider/route | Missing | Keep unsupported until provider docs/route prove | Unsupported |

## 9. Voice/TTS/STT Capability Matrix

| Capability | Provider support researched | Repo support | Misconfiguration/underuse | Status |
|---|---|---|---|---|
| TTS | GenX, OpenAI, Groq, Qwen, MiniMax, HF, Gemini, ElevenLabs/Deepgram route-present | `/api/brain/tts`, MiniMax specialist | MiniMax not consistently reached by Studio execute; Qwen TTS not wired | Partial |
| Voice selection | OpenAI/Groq/GenX voice IDs; Qwen/MiniMax voices | Voice options/preview | Voice list omits Qwen/MiniMax despite official support | Partial |
| Voice cloning | Qwen and MiniMax docs support | No product route found | Underused | Not wired |
| Voice design | Qwen and MiniMax docs support | No product route found | Underused | Not wired |
| STT | OpenAI/Groq/GenX/Qwen/HF/Gemini | `/api/brain/stt`, `/api/admin/studio/stt` | Needs live provider tests | Partial |
| Translation | Groq STT translation endpoint; Qwen multilingual recognition | STT route has provider/language | Groq translation not explicitly surfaced | Partial |
| Dubbing | Qwen/MiniMax pipeline possible | No dedicated route | Missing | Not wired |

## 10. Image/Video Capability Matrix

| Capability | Provider support researched | Repo route | Current blocker |
|---|---|---|---|
| Image generation | GenX, OpenAI, xAI/Grok, Together, Qwen, HF | `/api/brain/image`, Qwen/HF specialist routes | Key/live tests and provider catalog drift |
| Image editing | OpenAI, GenX likely, possibly Qwen/HF | `/api/brain/image-edit` | Route/provider tests required |
| Image-to-image | GenX/OpenAI/Qwen/HF possible | image-edit route | No universal capability truth |
| Image-to-video | GenX I2V, MiniMax, Qwen/Wan | `/api/brain/video-generate` text path; I2V upload not proven | Missing input-image workflow |
| Video generation | GenX, MiniMax, Qwen/Wan, route-present Replicate/Together fallback | `/api/brain/video-generate`, poll route | MiniMax official capability underused; Replicate not approved |
| Video editing | Qwen model category mentions video editing/generation, exact route not found | No route | Unsupported/not wired |
| Avatar/talking video | GenX Kling avatar ID, MiniMax subject-reference video | No Studio route | Blocked |

## 11. Research/Crawling Capability Matrix

| Function | Owner | Repo route evidence | Official evidence | Status |
|---|---|---|---|---|
| Web search | Firecrawl | research/status routes | Firecrawl `/search` docs | Partial |
| Website crawl | Firecrawl | app crawl/research routes | Firecrawl crawl/scrape docs | Partial |
| URL research | Firecrawl + LLM | research assist/url routes | Firecrawl extract/search docs | Partial |
| Competitor research | Firecrawl + LLM | research assist | Firecrawl search/extract docs | Partial |
| Scraping | Firecrawl | app-discovery/crawl | Firecrawl scrape docs | Partial |
| Browser automation | Playwright | tool/runtime status references | Playwright browser automation docs | Partial |
| Screenshot/browser QA | Playwright | status/check references | Playwright screenshot/visual comparison docs | Partial |
| Document understanding | OpenAI/Qwen/Gemini/HF + Firecrawl PDF parser | Not centralized | Provider docs and Firecrawl parser docs | Partial/not verified |

## 12. Workbench Capability Matrix

| Function | Repo route support | API/provider support | Status |
|---|---|---|---|
| Repo import | `/api/admin/repo-workbench/import`, repos routes | GitHub API | Partial, token required |
| Branch loading | `/github/branches`, workspace branches | GitHub branches API | Partial |
| File tree | `/tree`, `/file` | GitHub/repo filesystem | Partial |
| File read/write | file/patch/apply routes | Local/GitHub | Partial |
| Planning | `/plan` | GenX/OpenAI/Groq/Qwen text | Partial |
| Patch/diff | `/patch`, `/diff`, `/apply-patch` | Local repo | Partial |
| Checks | `/checks`, `/run-check`, `/run` | npm/scripts/Playwright | Partial |
| Commit | `/commit` | Git/GitHub | Partial |
| Push | `/push` | GitHub token | Partial, guarded |
| PR creation | `/pr` | GitHub REST PR API | Partial, token/live test required |
| PR status | `/pr-status`, GitHub PR routes | GitHub PR/status APIs | Partial |
| Merge guard | `/merge` | GitHub merge/checks | Partial, guarded |
| Deploy guard | `/deploy`, `/deploy/status` | VPS/Webdock/deploy config | Partial |
| Logs | `/logs`, clear logs | Local storage/log redaction | Partial |
| Resume jobs | `/jobs/latest`, `/jobs/[jobId]` | DB/storage | Partial |

## 13. App Onboarding Capability Matrix

| Function | Repo support | Current readiness |
|---|---|---|
| App onboarding | `/api/admin/onboarding`, app profile/package/agent routes | Partial |
| App profile creation | `/api/admin/app-profiles` | Wired, DB and runtime modes |
| App-specific provider/model selection | `/api/admin/app-ai-package` | Partial; needs capability validation |
| App-specific agents | `/api/admin/app-agents` | Partial |
| App memory | memory/app learning routes | Partial |
| App policy | app safety/package policies | Partial |
| App budgets | app budget routes/libs | Partial |
| App safety | `/api/admin/app-safety`, content filter | Partial |
| App repo binding | Workbench routes exist; explicit app repo binding not proven | Partial/missing |
| App deployment settings | deploy/VPS routes | Partial |
| App runtime health | app-health/runtime truth | Partial |
| App artifacts | artifact store routes | Partial |

## 14. Memory/RAG Capability Matrix

| Function | Repo evidence | Provider/tool dependency | Status |
|---|---|---|---|
| Memory save/read | `src/lib/memory.ts`, admin memory routes | DB/storage | Partial |
| Embeddings | `/api/brain/embeddings`, provider catalogs | OpenAI/HF/GenX depending implementation | Partial/not verified |
| Vector search | retrieval/RAG routes | Vector backend not fully proven | Partial |
| Artifact-to-memory | artifact/memory routes | Storage + memory | Partial |
| App memory | app learning/memory routes | DB | Partial |
| User memory | memory routes | DB/session | Partial |
| Learning loop | cross-app/federated memory libs | Scheduler not proven | Partial |
| Summarization | text models | GenX/OpenAI/Groq/Qwen | Partial |
| Retrieval | retrieval/RAG routes | embeddings/vector store | Partial |
| Reranking | `/api/brain/rerank`; HF/Together categories | provider key/model | Partial/not verified |

## 15. Operations/Governance Capability Matrix

| Function | Repo evidence | Provider/tool | Status |
|---|---|---|---|
| Provider health tests | settings/provider health routes | provider keys | Partial |
| Route health tests | readiness/system routes | app routes | Partial |
| Runtime health | runtime truth/status routes | system | Partial |
| Storage health | settings test storage, artifact store | storage driver | Partial |
| Redis/queue health | redis lib/runtime truth | Redis | Partial |
| Job tracking | jobs/video/music/workbench routes | DB/Redis | Partial |
| Artifact tracking | artifact routes/store | storage | Partial |
| Cost tracking | costs/usage/budget routes | DB/provider usage | Partial |
| Budget enforcement | app budget enforcement lib | DB | Partial |
| Approvals | approvals routes | DB/session | Partial |
| Alerts | alerts route | SMTP/ops | Partial |
| Webdock/VPS status | vps/settings test webdock | Webdock API | Partial |
| SMTP/email notifications | settings truth | SMTP | Optional/partial |
| Moderation | moderation/content-filter/adult routes | OpenAI/local filters | Partial |
| Model capability validation | universal catalog/routing | all providers | Partial; backend explicit selection gap |
| Fallback chains | live routing/provider routes | all providers | Partial |
| Cost-tier routing | app package/budget concepts | all providers | Partial/not enforced everywhere |
| Live-test status | settings tests | all providers | Partial |

## 16. What We Already Have

- One final dashboard route tree with six pages.
- A live GenX catalog fetch path.
- Static catalogs for approved AI providers.
- Studio execution wrapper with route decisions, media job handling, and artifact behavior.
- Video async job creation and polling route.
- Music studio route and job polling route.
- STT upload wrapper that saves transcript artifacts.
- TTS route with multiple provider branches.
- Adult text and adult image routes with app-safety gates.
- Workbench repo workflow routes.
- App profile/package/agent/safety/budget routes.
- Artifact store and media preview/file routes.
- Settings/Operations/readiness route surfaces.

## 17. What Is Misconfigured

- GenX live model count is 58, but runtime truth fallback is 57.
- GenX static fallback uses `seedance-2.0` names while live catalog has `seedance-2` names.
- Approved provider catalog and route-present provider set disagree.
- Direct Gemini, xAI/Grok, Replicate, ElevenLabs, and Deepgram appear in routes/governance but are not consistently approved in `approved-ai-catalog`.
- Studio music routing normalizes Music/Audio as `voice_tts` before calling the music-studio route.
- Studio TTS does not consistently preserve MiniMax/Mimo selection into the specialist MiniMax route.
- Backend explicit model selection does not fully enforce requested capability compatibility.
- App AI packages can express adult video/voice policies beyond production route support.

## 18. What Is Underused

- Hugging Face private Inference Endpoints for specialist/adult-safe/private deployments.
- Qwen/DashScope TTS, realtime TTS, STT, voice cloning, voice design, and broader Wan video/image capabilities.
- MiniMax video generation, music generation, voice cloning, voice design, and multimodal APIs.
- Groq structured outputs, moderation/OCR/image recognition docs, and STT translation.
- Together structured outputs/function-calling model metadata.
- Firecrawl extraction/search/crawl as a formal app-onboarding research engine.
- Playwright screenshot/browser QA as an operations readiness check.

## 19. What Is Missing

- Single provider/model/function governance source of truth.
- Backend hard enforcement for explicit model capability matching.
- Live provider test persistence consumed by Settings and Operations.
- Dedicated SFX route/provider owner.
- Dedicated voice cloning/design product routes.
- Dedicated dubbing route/pipeline.
- Dedicated I2V input/reference workflow.
- Dedicated avatar/talking-video backend route.
- Adult video/voice production routes and safeguards.
- App repo binding and app deployment readiness truth.
- Universal cost-tier routing enforcement.

## 20. What Must Stay Blocked

- Minors or age-ambiguous sexual content.
- CSAM.
- Real-person sexualization or deepfakes without consent.
- Genitals and explicit sex acts.
- Coercion, exploitation, violence, degradation, or dehumanization.
- Illegal content.
- Safety bypassing.
- Adult video and adult voice until routes, provider policy, app policy, safeguards, and live tests all exist.
- Avatar/talking video until a backend route exists.
- Hugging Face standard Inference API video generation because the route explicitly blocks it.
- Gemini direct video in the current route because the video route explicitly blocks standard Gemini/Veo direct usage.

## 21. What Can Be Enabled With Current Providers

After keys and live tests:

- GenX-first chat, reasoning, coding, image generation, video generation, TTS, STT, and music if live tests pass.
- OpenAI fallback for text, coding, image generation/editing, TTS, STT, moderation, embeddings.
- Groq fallback for fast text, STT, TTS, structured output on supported models.
- Together fallback for text, structured output on supported models, image, adult text/image where policy allows.
- Qwen/DashScope for text, image/video, STT, TTS, voice cloning/design after wiring.
- MiniMax/Mimo for TTS, video, music, voice cloning/design after wiring.
- Firecrawl for research/crawl/search/extract.
- GitHub for Workbench PR workflows.
- Playwright for browser QA.
- Webdock for VPS/deploy ops if token is configured.

## 22. What Requires Live Keys/Tests

Everything that calls an external provider:

- GenX generation/chat/media/music/TTS/STT.
- OpenAI text/image/audio/moderation/embeddings.
- Groq text/TTS/STT/structured output.
- Together text/image/structured output/adult route attempts.
- Hugging Face inference/private endpoint models.
- Qwen/DashScope text/image/video/TTS/STT/voice cloning.
- MiniMax/Mimo TTS/video/music/voice cloning/design.
- xAI/Grok direct image/adult text/image.
- Firecrawl search/crawl/extract.
- GitHub repo PR workflow.
- Webdock VPS status.
- SMTP notifications.
- Redis queue/realtime connection if production requires Redis.

## 23. Recommended Provider Ownership Architecture

1. GenX primary:
   - Chat, reasoning, coding, image generation, video generation, music, TTS, STT when live tests pass.
   - Never use GenX model IDs for unsupported capabilities unless live metadata or repo arrays prove support.

2. Specialist fallback:
   - OpenAI: moderation, embeddings, high-reliability text/audio/image fallback.
   - Groq: low-latency text/STT/TTS and structured output where supported.
   - Together: open-model text, JSON/function calling where model table supports, image fallback, adult text/image only through gated adult routes.
   - Qwen/DashScope: Wan image/video, STT/TTS, voice clone/design after wiring.
   - MiniMax/Mimo: TTS, video, music, voice clone/design after wiring.
   - Hugging Face: private/specialist endpoints, embeddings/reranking/STT fallback, adult private/local endpoint path with strict policy gates.
   - xAI/Grok: direct image/adult route-present only if approved and policy-tested.

3. Tools:
   - GitHub owns Workbench repo/PR.
   - Firecrawl owns search/crawl/extract.
   - Playwright owns browser QA and screenshots.
   - Redis owns queues/realtime if deployed.
   - Storage owns artifacts/previews.
   - Webdock owns VPS status/deploy support.
   - SMTP owns notifications.

## 24. Recommended Dashboard Capability Model

The dashboard should not hardcode provider claims. It should consume one backend capability object with:

- provider approval status
- route presence
- model list
- model capability
- provider policy limits
- required key/env
- last live test result
- sync/async behavior
- polling URL if async
- artifact support
- preview support
- dashboard visibility
- blocker
- recommended owner
- fallback chain
- status: production-ready, beta, partial, not verified, unsupported, blocked

Connected must mean key exists and live test passed. Configured must mean key exists but live test has not passed. Route-present must not mean production-ready.

## 25. Recommended Implementation Phases

Phase 1 - Truth consolidation:

- Build one provider/model/function capability registry.
- Resolve approved vs route-present provider drift.
- Replace hardcoded GenX count and static/live name drift.
- Persist live provider test results.

Phase 2 - Enforcement:

- Enforce capability matching for explicit model selections.
- Reject unsupported app package capabilities.
- Add route readiness checks for every dashboard action.
- Connect Settings and Operations to the same truth object.

Phase 3 - Studio completion:

- Fix music capability routing.
- Wire or disable MiniMax/Mimo TTS accurately.
- Wire Qwen/MiniMax voice cloning/design only if product-approved.
- Keep adult video/voice and avatar blocked.

Phase 4 - App OS:

- Validate app provider/model selections.
- Add app repo binding.
- Add app deployment readiness.
- Add app memory/artifact provenance.

Phase 5 - Live testing:

- Run provider-by-provider smoke tests.
- Run Workbench GitHub PR flow.
- Run artifact preview tests for every modality.
- Run Operations go-live blockers with real env.

## 26. Go-Live Verdict

Ready for controlled live testing after keys are added: yes.

Ready for production go-live: no.

Required blockers before go-live:

- Centralized provider/model/function governance.
- Live provider test results for all required providers.
- Fixed GenX model count/name drift.
- Approved provider vs route-present provider reconciliation.
- Backend capability enforcement for manual model selection.
- Music, MiniMax, Qwen, and voice capability wiring truth.
- Adult video/voice kept blocked until fully supported.
- Workbench PR flow tested with GitHub token.
- Storage/artifact preview tests for image/video/audio/text.
- Build/lint/tests passed after report and implementation changes.

## 27. Validation

Validation commands required:

- `npm run build`: passed. Next.js production build compiled successfully and generated 172 static pages.
- `npm run lint`: passed. No ESLint warnings or errors. The command emitted the existing `next lint` deprecation notice for Next.js 16.
- `npm test`: passed. Vitest reported 42 test files passed and 1208 tests passed.

Status: validation passed for this report-only change.
