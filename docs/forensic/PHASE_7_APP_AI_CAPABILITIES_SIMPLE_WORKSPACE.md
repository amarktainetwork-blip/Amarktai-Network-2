# Phase 7 — App AI Capabilities + Simple Repo Workspace Foundation

Generated: 2026-05-02  
Branch: `phase-7-app-ai-capabilities-simple-workspace`

## Goal

Move the system closer to the real product target:

1. AmarktAI Assistant can eventually control the full system through approved tools.
2. Each added app gets its own AI provider/model package.
3. Hugging Face is treated as a broad capability platform, not one fixed model.
4. Provider capabilities are tested by capability, not only by API key.
5. Repo Workbench is simplified toward: add/select repo → command → patch/PR.

This phase is a backend/product foundation. It does not pretend that every specialist media route is already fully executed.

## Added

### 1. Full AI capability taxonomy

New file:

```text
src/lib/ai-capability-taxonomy.ts
```

New endpoint:

```text
GET /api/admin/ai-capabilities
```

The taxonomy includes all requested groups:

- Multimodal
- Computer Vision
- Natural Language Processing
- Audio
- Tabular
- Time Series
- Reinforcement Learning
- Robotics
- Graph ML
- System Ops

It includes capability IDs for:

- Audio-Text-to-Text
- Image-Text-to-Text
- Image-Text-to-Image
- Image-Text-to-Video
- Visual Question Answering
- Document Question Answering
- Video-Text-to-Text
- Visual Document Retrieval
- Any-to-Any
- Depth Estimation
- Image Classification
- Object Detection
- Image Segmentation
- Text-to-Image
- Image-to-Text
- Image-to-Image
- Image-to-Video
- Unconditional Image Generation
- Video Classification
- Text-to-Video
- Zero-Shot Image Classification
- Mask Generation
- Zero-Shot Object Detection
- Text-to-3D
- Image-to-3D
- Image Feature Extraction
- Keypoint Detection
- Video-to-Video
- Text Classification
- Token Classification
- Table Question Answering
- Question Answering
- Zero-Shot Classification
- Translation
- Summarization
- Feature Extraction
- Text Generation
- Fill-Mask
- Sentence Similarity
- Text Ranking
- Text-to-Speech
- Text-to-Audio
- Automatic Speech Recognition
- Audio-to-Audio
- Audio Classification
- Voice Activity Detection
- Tabular Classification
- Tabular Regression
- Time Series Forecasting
- Reinforcement Learning
- Robotics
- Graph Machine Learning
- Repo Coding Agent
- Website Crawl Intelligence

### 2. App AI package recommender

New file:

```text
src/lib/app-ai-package.ts
```

New endpoint:

```text
POST /api/admin/app-ai-package/recommend
```

It returns an app-level package with:

- app slug/name/type
- safety profile
- enabled capabilities
- provider/model selections
- optional Hugging Face endpoint URL field
- voice default
- crawler default
- budget defaults
- permissions
- blockers

This is the foundation for app-level AI setup. It does not force one global default.

### 3. Provider capability testing

New endpoint:

```text
POST /api/admin/provider-capability-test
```

For generic text-compatible capabilities, it runs a real provider call using the universal provider caller.

For specialist media/voice/video/vision capabilities, it returns:

```text
status: needs_specialist_route
```

This prevents fake success. A provider is not treated as live for a capability until the actual capability route is wired and tested.

### 4. Simple Repo Workbench command endpoint

New endpoint:

```text
POST /api/admin/repo-workbench/simple
```

Input:

```json
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "command": "Fix the dashboard mobile layout and open a PR.",
  "quality": "balanced"
}
```

It:

1. imports/syncs the repo,
2. runs the existing magic coding pipeline,
3. returns the workspace, run result, patch ID if generated, and exact next steps.

It does **not** auto-merge, auto-deploy, or claim PR creation until those separate actions happen and return proof.

## AmarktAI Assistant control model

AmarktAI Assistant should eventually control the full system through tool-gated actions, not hidden direct access.

Safe control model:

- read status freely,
- propose actions freely,
- execute safe actions with confirmation where needed,
- require approval for repo changes, PR creation, deploys, spend, marketing sends, adult-mode changes, external writes, and destructive actions,
- log every action to artifacts/jobs/audit trail.

This PR lays the capability and package foundation for that control model, but does not give AmarktAI Assistant unrestricted direct system access.

## Hugging Face setup direction

Hugging Face must support:

1. Inference Providers / serverless calls by model ID.
2. Dedicated Inference Endpoints via per-app endpoint URL.
3. App-level custom model IDs.
4. Capability-specific route tests before enabling a task live.

The package selection type already includes:

```text
endpointUrl
```

for future dedicated endpoint wiring.

## Still pending after this PR

These are intentionally not faked:

- Qwen Wanx image/video execution route.
- Qwen Omni voice route.
- MiniMax/Mimo video/voice/music route.
- Gemini image/video/voice specialist routes.
- Hugging Face dedicated endpoint execution router.
- Real-time microphone/STT input for AmarktAI Assistant.
- Tool permission registry for AmarktAI Assistant actions.
- UI for app AI package selector.
- UI for Repo Workbench simple mode.
- Persisting app AI package selections into DB.

## Manual checks after merge/deploy

### Capability taxonomy

```bash
curl -sS https://amarktai.com/api/admin/ai-capabilities \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### App AI package recommendation

```bash
curl -sS -X POST https://amarktai.com/api/admin/app-ai-package/recommend \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "appSlug":"future-marketing-app",
    "appName":"Future Marketing App",
    "appType":"marketing",
    "websiteUrl":"https://example.com",
    "preferCheap":true
  }' | jq
```

### Provider capability test

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-capability-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"provider":"qwen","modelId":"qwen-plus","capabilityId":"text_generation"}' | jq
```

Specialist route honesty check:

```bash
curl -sS -X POST https://amarktai.com/api/admin/provider-capability-test \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"provider":"qwen","modelId":"wanx2.1-t2i-turbo","capabilityId":"text_to_image"}' | jq
```

Expected: `needs_specialist_route` until Qwen Wanx route is wired.

### Simple Repo Workbench

```bash
curl -sS -X POST https://amarktai.com/api/admin/repo-workbench/simple \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "repoUrl":"https://github.com/amarktainetwork-blip/Amarktai-Network-2",
    "branch":"main",
    "command":"Create a small docs/forensic/REPO_WORKBENCH_SIMPLE_TEST.md file confirming simple mode generated this patch. Do not touch app code.",
    "quality":"cheap"
  }' | jq
```

## Recommended next phase

Phase 8 should wire the first specialist provider routes:

1. Hugging Face dedicated endpoint execution helper.
2. Qwen Wanx image route.
3. MiniMax/Mimo TTS route.
4. Provider capability tests updated to execute those routes.
5. UI surfaces for app AI package and simple Repo Workbench.

## Verdict

The system now has the map of all AI tasks it should support, a way to recommend per-app AI packages, a truthful provider capability test path, and a simple repo-command API foundation. It is now ready for specialist route wiring and UI integration.
