# Phase 9 — Specialist Provider Routes

Generated: 2026-05-02  
Branch: `phase-9-specialist-provider-routes`

## Goal

Begin wiring real specialist provider execution routes so the system does not merely list capabilities.

This phase focuses on the first practical wins:

1. Hugging Face Inference Providers / dedicated endpoint helper.
2. Qwen Wanx text-to-image helper.
3. MiniMax/Mimo TTS helper.
4. Capability tests updated to execute those routes where possible.
5. Direct admin endpoints for specialist testing.

## Added

### `src/lib/specialist-provider-routes.ts`

New helpers:

- `runHuggingFaceInference()`
- `runQwenWanxImage()`
- `runMiniMaxTts()`

### Hugging Face specialist endpoint

```text
POST /api/admin/specialist/huggingface
```

Supports:

- model ID based Inference API calls
- dedicated endpoint URL calls
- arbitrary JSON inputs
- binary or JSON result passthrough

This is the first foundation for Hugging Face being a broad model execution layer.

### Qwen Wanx image endpoint

```text
POST /api/admin/specialist/qwen-wanx-image
```

Supports:

- text-to-image task creation request through DashScope AIGC endpoint
- configurable model
- configurable size

Important: Qwen Wanx image generation is async. This phase sends the task creation request and returns provider JSON. A later phase should add task polling/result retrieval and artifact storage.

### MiniMax/Mimo TTS endpoint

```text
POST /api/admin/specialist/minimax-tts
```

Supports:

- text-to-speech using MiniMax/Mimo key
- optional model
- optional voice ID
- returns audio bytes when provider returns audio payload

May require `MINIMAX_GROUP_ID` or `MIMO_GROUP_ID` depending on the account.

## Capability test update

Updated:

```text
POST /api/admin/provider-capability-test
```

Now executes specialist routes when possible:

| Provider | Capability | Route |
| --- | --- | --- |
| Hugging Face | any non-text specialist test | `runHuggingFaceInference()` |
| Qwen | `text_to_image`, `image_text_to_image` | `runQwenWanxImage()` |
| MiniMax/Mimo | `text_to_speech` | `runMiniMaxTts()` |

Other specialist capabilities still honestly return:

```text
needs_specialist_route
```

## Manual tests after merge/deploy

### Hugging Face text/image/audio model test

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/huggingface \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "modelId":"hexgrad/Kokoro-82M",
    "capability":"text_to_speech",
    "inputs":"Hello from Hugging Face specialist route."
  }' --output /tmp/hf-specialist.bin
```

For dedicated endpoints:

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/huggingface \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "endpointUrl":"https://YOUR-ENDPOINT.endpoints.huggingface.cloud",
    "capability":"custom_endpoint",
    "inputs":"Hello from dedicated endpoint"
  }' | jq
```

### Qwen Wanx image task creation

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/qwen-wanx-image \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "prompt":"A premium dark glassmorphism AI command center dashboard, cinematic lighting",
    "model":"wanx2.1-t2i-turbo",
    "size":"1024*1024"
  }' | jq
```

Expected: provider task creation JSON or exact provider error.

### MiniMax/Mimo TTS

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/minimax-tts \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "text":"Hello, this is Aiva using MiniMax voice.",
    "model":"speech-2.6-turbo"
  }' --output /tmp/minimax-aiva.mp3
```

### Capability test specialist execution

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-capability-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "provider":"qwen",
    "modelId":"wanx2.1-t2i-turbo",
    "capabilityId":"text_to_image",
    "prompt":"A premium AI dashboard"
  }' | jq
```

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-capability-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "provider":"minimax",
    "modelId":"speech-2.6-turbo",
    "capabilityId":"text_to_speech",
    "prompt":"Hello from MiniMax TTS"
  }' | jq
```

## Still pending

This phase does not complete every specialist provider.

Still needed:

- Qwen Wanx async polling/result retrieval.
- Qwen image-to-video route.
- Qwen Omni voice route.
- MiniMax/Mimo video route.
- MiniMax/Mimo music route.
- Gemini specialist image/video/voice routes.
- Artifact storage for generated media.
- Persistent provider capability-test results.
- UI for app AI package and simple Repo Workbench.

## Verdict

The system now has the first real specialist execution helpers and endpoints. It is no longer only a model catalog for these routes; Hugging Face, Qwen image task creation, and MiniMax/Mimo TTS can be executed and tested through admin APIs.
