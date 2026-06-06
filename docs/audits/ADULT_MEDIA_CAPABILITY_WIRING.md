# Adult + Media Capability Wiring Audit

## Canonical source of truth

`src/lib/media-capability-registry.ts` owns the execution route, execution mode, artifact type, and approved provider/model adapters for:

- `adult_text`
- `adult_image`
- `adult_video`
- `adult_voice`
- `image_generation`
- `video_generation`
- `music_generation`
- `tts`
- `stt`
- `audio`

`provider-capability-governance.ts`, `live-ai-routing.ts`, smart routing, Studio execution, and Studio readiness consume this registry.

## Capability matrix

| Capability | Declared | Routed | Executes | Artifact persistence |
| --- | --- | --- | --- | --- |
| `adult_text` | Universal adult policy + canonical registry | `/api/brain/adult-text` | Together or tested Hugging Face private endpoint | Direct route creates a document Artifact before success |
| `adult_image` | Universal adult policy + canonical registry | `/api/brain/adult-image` | Together or Hugging Face image inference | Direct route creates an image Artifact before success |
| `adult_video` | Universal adult policy + canonical registry | `/api/brain/video-generate` | GenX or Qwen real video job | Sync completion saves immediately; async poll saves the completed video |
| `adult_voice` | Universal adult policy + canonical registry | `/api/brain/tts` | GenX, Groq, or Hugging Face TTS | Direct route creates an audio Artifact before success |
| `image_generation` | Canonical registry + live routing | `/api/brain/image` through Studio | Existing image executor | Studio saves returned image bytes/URL as an image Artifact |
| `video_generation` | Canonical registry + live routing | `/api/brain/video-generate` | GenX or Qwen real video job | Completed video poll creates a video Artifact |
| `music_generation` | Canonical registry + live routing | `/api/admin/music-studio` | GenX music pipeline | Music pipeline persists the completed Artifact and links the job |
| `tts` | Canonical registry + live routing | `/api/brain/tts` | GenX, Groq, or Hugging Face | Direct route creates an audio Artifact before success |
| `stt` | Canonical registry + live routing | `/api/brain/stt` through `/api/admin/studio/stt` | Existing STT executor | Studio saves the transcript as a transcript Artifact |
| `audio` | Canonical registry + live routing | `/api/admin/music-studio` | GenX audio/music pipeline | Completed output uses the music/audio Artifact path |

All adult routes retain app-level `adultMode=true`, `safeMode=false`, and content-policy checks. Legal consenting-adult content is eligible; minors, age ambiguity, non-consensual content, sexualized real-person impersonation, illegal content, violence, hate, self-harm, and exploitation remain blocked.

## Truthful response contract

Adult/media execution responses now expose:

- `success`
- `capability`
- `provider`
- `model`
- `jobStatus`
- `artifactId`
- `storageUrl`
- `error`
- `blocker`

Provider completion is not reported as successful when output is missing or Artifact persistence fails. Async video jobs report queued/processing state and return an Artifact only after a real video URL is available.

## Removed false success

The old Together “video” adapter called an image-generation endpoint and stored the returned image URL as a successful video job. That adapter was removed. Canonical video execution now uses only GenX and Qwen video endpoints.

## Legacy provider residue found

These are outside the canonical adult/media registry and remain identifiable legacy surfaces:

- **Fal:** no active Fal route was found in the audited adult/media paths.
- **Replicate:** historical model entries remain in `src/lib/model-registry.ts`; Replicate is not in the approved provider mesh and is rejected by live routing.
- **OpenAI direct:** direct calls remain in legacy/general routes including image, image edit, suggestive image, STT, embeddings, moderation, research, stream, RAG, and `src/lib/capability-router.ts`. They are not candidates in the canonical adult/media registry.
- **MiniMax:** legacy preference data remains in `src/lib/ai-routing-policy.ts`, model registry entries, and specialist provider helpers. Studio no longer hardcodes MiniMax for voice.
- **Firecrawl:** legacy crawler wiring remains in `src/lib/capability-router.ts` and app-package metadata. The approved mesh uses the local crawler toolchain instead.
- **xAI/Grok adult bypass:** legacy adult branches remain in `src/lib/capability-router.ts`; canonical Adult Text and Adult Image routes no longer select xAI/Grok.
- **Hardcoded route bypass:** `src/lib/capability-router.ts` remains a legacy multi-capability executor with provider-specific branches. Smart routing and Studio adult/media execution no longer use its provider chains; they use the canonical registry and dedicated routes.

## ffmpeg

`ffmpeg` remains an approved provider-mesh tool for transformations. The repaired routes store provider-returned image, MP3, and MP4 outputs without transcoding, so invoking ffmpeg would add work without improving correctness. It should be used only when a provider output requires an actual format conversion, mux, trim, normalization, or validation step.
