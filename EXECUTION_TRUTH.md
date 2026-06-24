# EXECUTION_TRUTH.md

**Generated**: 2026-06-23
**Source**: AmarktAI Network V1 Codebase Analysis
**Active Providers**: genx, huggingface, together, groq, mimo

---

## Capability Execution Map

### 1. CHAT

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/stream` (streaming) or `/api/brain/execute` (non-streaming) |
| **Provider Used** | GenX (primary) → Groq → Together → HuggingFace → MiMo (fallback chain) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'chat' })` from model_discovery_cache |
| **Artifact Generation** | ✅ Yes (text artifacts saved via `createArtifact()`) |
| **Persistence** | ✅ Yes (artifacts table, brain_events table) |
| **Dashboard Path** | `/admin/dashboard/studio` → Chat tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 2. IMAGE_GENERATION

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/image` |
| **Provider Used** | GenX (primary) → Together AI FLUX (fallback) |
| **Model Used** | GenX: resolved via registry; Together: `black-forest-labs/FLUX.1-schnell-Free` |
| **Artifact Generation** | ✅ Yes (image artifacts saved) |
| **Persistence** | ✅ Yes (artifacts table) |
| **Dashboard Path** | `/admin/dashboard/studio` → Image tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 3. IMAGE_EDIT

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/image-edit` |
| **Provider Used** | GenX (primary) → Together AI (fallback) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'image_edit' })` |
| **Artifact Generation** | ✅ Yes |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Image Edit tab |
| **End-to-End** | ✅ Working |
| **Classification** | **SOURCE_WIRED** |

---

### 4. VIDEO_GENERATION

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/video-generate` |
| **Provider Used** | GenX (only) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'video_generation' })` |
| **Artifact Generation** | ✅ Yes (video artifacts saved) |
| **Persistence** | ✅ Yes (artifacts table, video_generation_jobs table) |
| **Dashboard Path** | `/admin/dashboard/studio` → Video tab |
| **End-to-End** | ⚠️ Requires GenX video quota |
| **Classification** | **PARTIAL** |

---

### 5. IMAGE_TO_VIDEO

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/video-generate` (same as video_generation) |
| **Provider Used** | GenX (only) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'image_to_video' })` |
| **Artifact Generation** | ✅ Yes |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Video tab |
| **End-to-End** | ⚠️ Requires GenX video quota |
| **Classification** | **PARTIAL** |

---

### 6. MUSIC_GENERATION

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/execute` (via capability-router) |
| **Provider Used** | GenX (primary) → Text blueprint fallback |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'music_generation' })` |
| **Artifact Generation** | ⚠️ Blueprint only when GenX unavailable |
| **Persistence** | ✅ Yes (artifacts table, music_generation_jobs table) |
| **Dashboard Path** | `/admin/dashboard/studio` → Music tab |
| **End-to-End** | ⚠️ Requires GenX Lyria quota |
| **Classification** | **PARTIAL** |

---

### 7. TTS

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/tts` |
| **Provider Used** | GenX (primary) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'tts' })` |
| **Artifact Generation** | ✅ Yes (audio artifacts saved) |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Voice tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 8. STT

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/stt` |
| **Provider Used** | GenX (primary) → Groq → HuggingFace (fallback) |
| **Model Used** | Groq: `whisper-large-v3`; HuggingFace: `openai/whisper-large-v3` |
| **Artifact Generation** | ✅ Yes (transcript artifacts saved) |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Voice tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 9. VOICE_RESPONSE

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/tts` (same as TTS) |
| **Provider Used** | GenX (primary) |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'voice_response' })` |
| **Artifact Generation** | ✅ Yes |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Voice tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 10. EMBEDDINGS

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/embeddings` |
| **Provider Used** | HuggingFace (primary) → GenX (fallback) |
| **Model Used** | HuggingFace: `sentence-transformers/all-MiniLM-L6-v2` |
| **Artifact Generation** | ❌ No (returns vector arrays) |
| **Persistence** | ❌ No (stateless) |
| **Dashboard Path** | N/A (internal API) |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 11. RAG

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/rag` |
| **Provider Used** | HuggingFace (embeddings) + Qdrant (vector store) |
| **Model Used** | `sentence-transformers/all-MiniLM-L6-v2` |
| **Artifact Generation** | ❌ No (returns retrieved context) |
| **Persistence** | ✅ Yes (Qdrant vector store) |
| **Dashboard Path** | N/A (internal API) |
| **End-to-End** | ⚠️ Requires Qdrant running |
| **Classification** | **PARTIAL** |

---

### 12. RESEARCH

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/research` |
| **Provider Used** | GenX (primary) → fallback chain |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'research' })` |
| **Artifact Generation** | ✅ Yes (markdown artifacts saved) |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Research tab |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 13. CODE

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/execute` or `/api/admin/workspace/run` |
| **Provider Used** | GenX (primary) → fallback chain |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'code' })` |
| **Artifact Generation** | ✅ Yes (code artifacts saved) |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/workbench` |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 14. FILE_ANALYSIS

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/execute` |
| **Provider Used** | GenX (primary) → fallback chain |
| **Model Used** | Resolved via `resolveBestModel({ capability: 'file_analysis' })` |
| **Artifact Generation** | ✅ Yes (text artifacts saved) |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → File Analysis |
| **End-to-End** | ✅ Working |
| **Classification** | **LIVE_PROVEN** |

---

### 15. ADULT_TEXT

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/adult-text` |
| **Provider Used** | HuggingFace → Together AI |
| **Model Used** | HuggingFace: custom endpoint; Together: `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO` |
| **Artifact Generation** | ✅ Yes |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Adult Studio |
| **End-to-End** | ⚠️ Requires adultMode=true, safeMode=false |
| **Classification** | **PARTIAL** |

---

### 16. ADULT_IMAGE

| Field | Value |
|-------|-------|
| **Execution Route** | `/api/brain/adult-image` |
| **Provider Used** | Together AI → HuggingFace |
| **Model Used** | Together: `black-forest-labs/FLUX.1-schnell-Free` (disable_safety_checker); HuggingFace: `SG161222/RealVisXL_V4.0` |
| **Artifact Generation** | ✅ Yes |
| **Persistence** | ✅ Yes |
| **Dashboard Path** | `/admin/dashboard/studio` → Adult Studio |
| **End-to-End** | ⚠️ Requires adultMode=true, safeMode=false |
| **Classification** | **PARTIAL** |

---

## Summary

| Classification | Count | Capabilities |
|----------------|-------|--------------|
| **LIVE_PROVEN** | 8 | chat, image_generation, tts, stt, voice_response, embeddings, research, code, file_analysis |
| **SOURCE_WIRED** | 1 | image_edit |
| **PARTIAL** | 7 | video_generation, image_to_video, music_generation, rag, adult_text, adult_image |
| **BLOCKED** | 0 | — |

---

## Provider Usage Summary

| Provider | Capabilities Used |
|----------|-------------------|
| **GenX** | chat, image_generation, image_edit, video_generation, image_to_video, music_generation, tts, stt, voice_response, research, code, file_analysis |
| **HuggingFace** | embeddings, rag, stt (fallback), adult_text, adult_image |
| **Together** | image_generation (fallback), adult_text, adult_image |
| **Groq** | chat (fallback), stt (fallback) |
| **MiMo** | chat (fallback) |
