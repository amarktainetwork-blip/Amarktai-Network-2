# Phase 6 — AI Provider + Model Perfection Foundation

Generated: 2026-05-02  
Branch: `phase-6-ai-provider-model-perfection`

## Goal

Make the AI backend capable of supporting the current Amarktai Network app and future added apps without forcing one global default model.

The operator requirement is:

```text
No single default in the dashboard. Each app chooses the AI providers/models it needs.
```

This phase establishes that backend direction.

## Important design decision

"All models" must not mean hardcoding a giant stale list.

Correct architecture:

1. Curated starter catalog for each provider.
2. Live catalog discovery where the provider supports it.
3. Custom model ID support so an app can use any provider-supported model.
4. Hugging Face model ID support for Inference Providers.
5. Hugging Face endpoint URL support later for dedicated Inference Endpoints.
6. App-level model package selection when each app is added.

## Added / changed

### 1. Expanded provider governance

Updated:

```text
src/lib/ai-provider-governance.ts
```

New/expanded governed providers:

- GenX
- Qwen / DashScope
- MiniMax / Mimo
- DeepSeek
- Gemini
- Hugging Face
- Groq
- Together AI
- Moonshot / Kimi
- Zhipu AI / GLM
- OpenRouter
- Replicate
- ElevenLabs
- Deepgram
- Firecrawl
- Mem0
- Webdock

Direct OpenAI and xAI/Grok remain advanced optional because GenX normally covers them.

Deprecated direct primary providers remain:

- Cohere
- Mistral Direct

Proposed backlog remains:

- Perplexity
- Tavily
- Jina
- RunPod
- fal.ai
- Fireworks AI
- Cerebras
- Suno
- Udio

### 2. New AI model catalog foundation

New file:

```text
src/lib/ai-model-catalog.ts
```

It provides catalog entries for:

- GenX live/static models
- Qwen text, long-context, vision, omni, Wanx image/video
- MiniMax/Mimo text, speech, Hailuo video and music
- DeepSeek chat/reasoner
- Gemini text/multimodal/TTS/embeddings
- Hugging Face curated starter models
- Moonshot/Kimi long-context/coding models
- Zhipu/GLM text and vision models
- Groq text/TTS
- Together text/image

It also supports custom model IDs for provider families that can accept them.

### 3. New admin model catalog API

New endpoint:

```text
GET /api/admin/ai-model-catalog
```

Optional provider filter:

```text
GET /api/admin/ai-model-catalog?provider=qwen
GET /api/admin/ai-model-catalog?provider=huggingface
GET /api/admin/ai-model-catalog?provider=genx
```

It returns:

- configured status
- governance status
- model list
- recommended defaults
- whether custom model IDs are allowed
- whether live discovery is supported
- rules stating there is no global default and apps must select model packages

### 4. Universal provider execution helper

New file:

```text
src/lib/universal-provider-call.ts
```

Adds execution support for OpenAI-compatible text/chat providers:

- Qwen
- DeepSeek
- Groq
- Together
- OpenRouter
- Moonshot/Kimi
- Zhipu/GLM
- MiniMax/Mimo

This does not claim specialist media routes are done. Image/video/voice/music still require capability-specific endpoints.

### 5. Conversation stream uses universal provider helper

Updated:

```text
src/app/api/admin/conversation/stream/route.ts
```

Aiva/admin conversation now routes non-GenX providers through `callUniversalProvider()`, so the new governed direct providers can execute text/chat responses once configured.

### 6. Routing policy expanded

Updated:

```text
src/lib/ai-routing-policy.ts
```

Routing now includes:

- Qwen
- DeepSeek
- Groq
- MiniMax/Mimo
- Gemini
- Together
- Hugging Face
- Moonshot/Kimi for long-context research/data ingestion
- Zhipu/GLM for agentic/coding routes
- GenX as gateway where appropriate

## What this phase does not fully solve yet

This is the backend foundation, not the final perfect AI admin UI.

Still needed after this PR:

1. Settings UI must be updated to show governed providers and model catalogs.
2. Each app needs a model package selector.
3. Repo Workbench must be simplified to: add repo → type command → review PR.
4. Specialist provider routes must be added for:
   - Qwen Wanx image/video
   - Qwen Omni voice
   - MiniMax/Mimo video/voice/music
   - Gemini image/video/voice where supported by selected API
   - Hugging Face Inference Endpoints dedicated endpoint URL per app
5. Provider test endpoints should test each provider by capability, not only by key.
6. Firecrawl onboarding should write recommended model packages using the expanded catalog.
7. App Registry should store provider/model choices per app.

## What the user asked and current status

| Requirement | Status in this PR |
| --- | --- |
| GenX integrated to use all models | Improved: live GenX catalog preferred, static fallback kept |
| Qwen integrated with all models | Foundation: curated Qwen starter catalog + custom model ID support + text route. Wanx/Omni specialist media routes still pending |
| Mimo integrated with all models | Foundation: MiniMax/Mimo governance + catalog + text route. Video/voice/music specialist routes still pending |
| DeepSeek | Added/confirmed as core direct route |
| Gemini | Added as core governed provider with catalog entries |
| Hugging Face any model via API key | Foundation added: custom HF model IDs and curated starter catalog. Dedicated endpoint URL wiring is next |
| Moonshot/Kimi | Added active optional provider and long-context route candidate |
| Zhipu/GLM | Added active optional provider and route candidate |
| Groq/Together | Kept as core direct providers |
| Web crawler for app onboarding | Already exists via Firecrawl app intelligence route; this phase keeps Firecrawl core |
| No global default | Enforced in model catalog response rules; app-level selector still pending |
| Repo workspace simple | Not done in this PR; must be next backend/product phase |

## Manual checks after merge/deploy

### Model catalog all providers

```bash
curl -sS https://amarktai.com/api/admin/ai-model-catalog \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Provider-specific catalogs

```bash
curl -sS 'https://amarktai.com/api/admin/ai-model-catalog?provider=qwen' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq

curl -sS 'https://amarktai.com/api/admin/ai-model-catalog?provider=minimax' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq

curl -sS 'https://amarktai.com/api/admin/ai-model-catalog?provider=huggingface' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Routing plans

```bash
curl -sS -X POST https://amarktai.com/api/admin/ai-routing \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"capability":"chat","costPreference":"cheap"}' | jq
```

### Aiva/provider execution

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"message":"Reply in one sentence and state your selected provider route.","capability":"chat","costPreference":"cheap"}'
```

Expected:

- `event: route`
- `event: token`
- `event: done`

or an exact provider configuration blocker.

## Recommended next phase

Phase 7 should not be redesign yet.

Recommended next phase:

```text
Phase 7 — App AI Setup + Simple Repo Workspace UX
```

Scope:

1. App-level AI model package selector.
2. Settings UI driven by provider governance and model catalog.
3. Hide/de-emphasise deprecated providers.
4. Firecrawl app onboarding recommends provider/model package from the new catalog.
5. Repo Workbench simplified to: add/select repo → command → PR.

Only after Phase 7 should public website/dashboard redesign begin.

## Verdict

The backend AI stack is now moving toward the right model: many providers, many models, no forced global default, and app-specific AI setup when each app is added.
