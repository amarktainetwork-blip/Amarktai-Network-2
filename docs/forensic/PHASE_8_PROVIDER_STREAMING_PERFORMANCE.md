# Phase 8 — Provider Streaming + Performance Foundation

Generated: 2026-05-02  
Branch: `phase-8-provider-streaming-performance`

## Goal

Make Aiva/live conversation fast and truthful.

The problem before this phase:

- GenX streamed natively.
- Non-GenX providers waited for the full response, then simulated chunks.
- That meant Qwen, DeepSeek, Groq, Together, OpenRouter, Moonshot/Kimi, Zhipu/GLM and MiniMax/Mimo could feel slow even when the provider itself supports streaming.

## Added / changed

### 1. Native streaming for OpenAI-compatible providers

Updated:

```text
src/lib/universal-provider-call.ts
```

New support:

- native streaming parser for SSE-style OpenAI-compatible chat completions
- per-provider timeout defaults
- first-token metrics
- token callbacks
- fallback path for non-stream providers
- provider list metadata via `listUniversalProviders()`

Streaming providers now include:

```text
qwen
deepseek
groq
together
openrouter
moonshot
zhipu
minimax
mimo
```

### 2. Aiva/admin conversation now streams non-GenX providers natively

Updated:

```text
src/app/api/admin/conversation/stream/route.ts
```

Before:

```text
selected direct provider → wait for full response → simulate chunks
```

Now:

```text
selected direct provider → open native stream → emit token events immediately
```

The SSE response emits:

- `status`
- `route`
- `token`
- `error`
- `done`

Token events can include `firstTokenMs`.

### 3. Provider stream health test

New endpoint:

```text
GET /api/admin/provider-stream-test
POST /api/admin/provider-stream-test
```

`GET` lists stream-capable universal providers.

`POST` tests one provider/model for live conversation suitability by measuring:

- total latency
- first token latency
- token count
- output sample
- error message if failed

This prevents slow/unreliable providers from being used as live conversation defaults.

## What this phase does not do

This PR does not claim every specialist route is complete.

Still pending:

- Qwen Wanx image/video execution
- Qwen Omni voice execution
- MiniMax/Mimo video/voice/music execution
- Gemini image/video/voice specialist execution
- Hugging Face dedicated endpoint execution
- provider capability tests for each specialist media/voice/video route
- UI for stream-health dashboard
- automatic latency-based provider failover

## Why this matters

A super AI system is useless if the operator waits too long or cannot see streaming responses.

After this PR, Aiva can stream through multiple configured direct providers, not only GenX.

## Manual tests after merge/deploy

### List stream-capable providers

```bash
curl -sS https://amarktai.com/api/admin/provider-stream-test \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Test Qwen streaming

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-stream-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"provider":"qwen","modelId":"qwen-plus","timeoutMs":15000}' | jq
```

### Test Groq streaming

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-stream-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"provider":"groq","modelId":"llama-3.3-70b-versatile","timeoutMs":12000}' | jq
```

### Test Aiva/direct-provider streaming

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"message":"Reply in one sentence and confirm streaming is active.","capability":"chat","costPreference":"cheap","timeoutMs":15000}'
```

Expected:

```text
event: status
event: route
event: token
event: done
```

For direct providers, token events should arrive before the full response is complete.

## Provider quality rule

A provider should only be used as a default live conversation route if:

- provider stream test passes,
- first token is fast enough,
- total latency is stable,
- it returns real token chunks,
- it does not frequently time out,
- it has a configured fallback.

## Next recommended phase

Phase 9 should wire specialist execution routes, starting with the biggest practical wins:

1. Hugging Face dedicated endpoint helper.
2. MiniMax/Mimo TTS route.
3. Qwen Wanx image route.
4. Provider capability tests updated to execute those routes.
5. Store provider stream test results so routing can avoid slow providers automatically.

## Verdict

Aiva/live conversation now has native streaming for the main direct OpenAI-compatible providers. The system can measure first-token speed and avoid pretending that slow/full-response calls are real streaming.
