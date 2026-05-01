# Model Stack Research

Date: 2026-05-01

## GenX Model Catalogue Summary

GenX is the primary AI gateway. One GenX key unlocks all categories below.

### Text / Reasoning / Coding
- OpenAI: GPT-4o, GPT-4.1, o3, o4-mini
- Anthropic: Claude Opus 4, Claude Sonnet 3.7, Claude Haiku 3.5
- Google: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- xAI: Grok 3, Grok 2 fast
- DeepSeek: R1, V3 (via GenX routing)

### Image Generation
- Recraft v3 (via GenX)
- DALL-E 3 (via GenX)
- Grok Imagine (via GenX)
- Flux family (via GenX)

### Video Generation
- Veo 2 (Google, via GenX)
- Kling (via GenX)
- Seedance (via GenX)
- PixVerse (via GenX)
- Grok Video (via GenX)

### Avatar / Video
- HeyGen (via GenX)
- D-ID (via GenX)

### Voice / TTS
- Grok TTS (via GenX)
- Aura 2 / Deepgram (via GenX)
- GenX LM Voice v1
- OpenAI TTS-1 (via GenX)

### STT / Transcription
- GenX transcription
- Whisper v3 (via GenX)
- Deepgram Nova (via GenX)

### Translation
- GenX Pro translation
- GPT-4 translate (via GenX)

### Music / Audio
- Lyria (Google, via GenX)
- GenX audio models

### Multimodal
- Gemini 2.5 Flash multimodal (via GenX)
- GPT-4o vision (via GenX)

### Embeddings / Reranking
- GenX embeddings
- text-embedding-3 (via GenX)

---

## Providers NOT Duplicated (Covered by GenX)

These providers do NOT need direct API keys. GenX routes to them.

| Provider | Covered capabilities |
|----------|---------------------|
| OpenAI | Text, image (DALL-E), TTS, embeddings, moderation |
| Anthropic | Text, reasoning, coding |
| Google / Gemini / Veo / Lyria | Text, image, video, music, multimodal |
| xAI / Grok | Text, image, video, TTS |
| Recraft | Image generation |
| Kling | Video generation |
| Seedance | Video generation |
| PixVerse | Video generation |
| Deepgram Aura | Voice/TTS |
| GenX Pro | Image, translation, transcription |
| GenX Voice | Voice/TTS |

---

## Optional Fallback Providers

Add direct keys only when GenX is insufficient for the specific use case.

| Provider | Reason | Status |
|----------|--------|--------|
| Hugging Face | Free/open-source models, local diffusion | Listed — not wired yet |
| Together AI | Cheaper open model route | Listed — not wired yet |
| DeepSeek | Cheap specialist coding/reasoning direct | Listed — not wired yet |
| Kimi / Moonshot | Cheap, multilingual | Listed — not wired yet |
| Qwen / Alibaba | Cheap, multilingual, open-source versions | Listed — not wired yet |
| Xiaomi MiMo | Specialist reasoning fallback | Listed — not wired yet |
| NVIDIA / Nemotron | High-performance open models | Listed — not wired yet |
| Mistral / local | Open-source, self-host, privacy | Listed — not wired yet |
| Llama / Meta (local) | Open-source, free, self-host | Listed — not wired yet |
| Replicate | Image/video/audio fallback | Listed — not wired yet |
| RunPod / Modal | Self-host / adult route not on GenX | Listed — not wired yet |
| ElevenLabs | Specialist TTS fallback | Listed — not wired yet |
| Resemble | Voice cloning fallback | Listed — not wired yet |
| Suno | Music generation fallback | Listed — not wired yet |
| Udio | Music generation fallback | Listed — not wired yet |
| Pika | Video generation fallback | Listed — not wired yet |
| Runway | Video generation fallback | Listed — not wired yet |
| Luma | Video/3D fallback | Listed — not wired yet |
| Firecrawl | Web crawler / research | Listed — not wired yet |
| Crawl4AI / local | Self-host crawler fallback | Listed — not wired yet |
| Skrape.ai | Scraping / crawler fallback | Listed — not wired yet |

---

## Model Tiers

### FREE
- Llama 3.3 70B (HuggingFace)
- Mistral 7B (local)
- Phi-3 mini (local)
- SDXL (HuggingFace)

### CHEAP
- DeepSeek V3 Flash
- Kimi k2
- Qwen 2.5 72B
- Gemini 2.0 Flash
- Mistral Nemo (Together)

### BALANCED
- Gemini 2.5 Flash (via GenX)
- GPT-4o mini (via GenX)
- Claude Haiku 3.5 (via GenX)
- Grok 2 fast (via GenX)

### PREMIUM
- GPT-4.1 / o3 (via GenX)
- Claude Opus 4 / Sonnet 3.7 (via GenX)
- Gemini 2.5 Pro (via GenX)
- Grok 3 (via GenX)
- Veo 2, Kling video (via GenX)

### SPECIALIST
- Grok TTS / Aura 2 (voice, via GenX)
- Whisper v3 (STT, via GenX)
- Recraft v3 (image, via GenX)
- Lyria (music, via GenX)
- text-embedding-3 (embeddings, via GenX)

---

## Capability Recommendations

| Capability | Recommended | Fallback |
|------------|-------------|---------|
| coding_agent | GPT-4.1 via GenX | DeepSeek V3 |
| chat | Gemini 2.5 Flash via GenX | Claude Haiku |
| reasoning | o3 via GenX | DeepSeek R1 |
| research | Gemini 2.5 Pro via GenX | Firecrawl + GPT-4o |
| image_generation | Recraft v3 via GenX | SDXL via Replicate |
| video_generation | Veo 2 via GenX | Kling via GenX |
| voice_tts | Aura 2 via GenX | ElevenLabs |
| transcription | Deepgram Nova via GenX | Whisper local |
| music_generation | Lyria via GenX | Suno |
| adult_image | RunPod / HuggingFace local ONLY | — |
| web_crawl | Firecrawl | Crawl4AI local |
| embeddings | text-embedding-3 via GenX | local sentence-transformers |

---

## Wiring Status

### Wired (working)
- GenX status API: ✅
- GenX model catalogue: ✅ (fetched from /api/admin/genx/status)
- Repo Workbench coding agent: ✅
- Apps & Agents CRUD: ✅
- Artifacts library: ✅
- System health (VPS, jobs, app-health): ✅

### Not Yet Wired
- Direct fallback provider key storage: ❌ (Settings shows fields, not stored to vault yet for most)
- Per-app model budget enforcement: ❌
- Music generation (real audio): ❌ (blueprint only)
- Video generation API call: ❌ (GenX endpoint wired, quota needed)
- Voice TTS generation call: ❌ (GenX endpoint wired, key needed)
- Web crawler integration: ❌
- Command Center NL task routing: ❌
- Per-app agent learning: ❌ (framework exists)
