# V1 Provider Capability Matrix

This matrix is conservative. `working` requires repository evidence of a
provider-native route plus successful proof. Provider documentation, code
presence, or theoretical support alone is insufficient.

- `working`: route and successful proof exist.
- `partial`: some route or contract exists; end-to-end proof is incomplete.
- `planned`: intentionally scheduled but not implemented.
- `blocked`: a known blocker prevents use.
- `unknown`: not proven; no support claim is made.

| Capability | HF | Together | Groq | GenX | Qwen | MiMo |
| --- | --- | --- | --- | --- | --- | --- |
| chat | working | working | working | working | working | working |
| reasoning | partial | partial | partial | partial | partial | partial |
| coding | partial | partial | partial | partial | partial | partial |
| research | unknown | unknown | unknown | unknown | unknown | unknown |
| image | partial | partial | unknown | partial | partial | unknown |
| image edit | unknown | unknown | unknown | unknown | unknown | unknown |
| video | partial | partial | unknown | partial | partial | unknown |
| image_to_video | unknown | partial | unknown | unknown | partial | unknown |
| avatar | partial | unknown | unknown | unknown | unknown | unknown |
| music | partial | unknown | unknown | partial | unknown | unknown |
| tts | partial | working | working | partial | unknown | partial |
| stt | partial | partial | partial | unknown | unknown | unknown |
| voice clone | unknown | unknown | unknown | unknown | unknown | unknown |
| ocr | partial | unknown | partial | unknown | partial | unknown |
| vision | partial | partial | partial | unknown | partial | partial |
| embeddings | partial | partial | unknown | unknown | partial | unknown |
| rerank | partial | partial | unknown | unknown | unknown | unknown |
| translation | partial | unknown | unknown | unknown | partial | unknown |
| documents | partial | unknown | unknown | unknown | unknown | unknown |
| agents | unknown | unknown | unknown | unknown | unknown | unknown |
| adult_text | unknown | unknown | unknown | unknown | unknown | unknown |
| adult_image | unknown | unknown | unknown | unknown | unknown | unknown |
| adult_video | unknown | unknown | unknown | unknown | unknown | unknown |

## Evidence Notes

- PR #113 recorded successful smoke checks for all six providers. This matrix
  treats that as chat connectivity proof only.
- Hugging Face auth accepts `HUGGINGFACE_API_KEY`,
  `HUGGINGFACEHUB_API_TOKEN`, and `HF_TOKEN` in canonical provider truth.
- The canonical Hugging Face specialist/admin execution path now honors that
  same alias set for authentication.
- Hugging Face dynamic catalog discovery is locally proven through the Hub model
  API, including task metadata, inference-provider metadata, and configured
  private/dedicated endpoint metadata.
- Hugging Face async jobs remain `false` in canonical provider truth because no
  canonical Brain local polling contract exists.
- Hugging Face provider truth is conservative around tool-calling and agent
  claims. The canonical provider layer does not claim Hugging Face tool-calling
  or agents as working provider truth.
- Groq auth currently depends on `GROQ_API_KEY` in canonical provider truth.
- Groq dynamic catalog discovery is locally proven through its provider model
  catalog plus conservative metadata mapping.
- Groq has canonical chat plus Groq-native TTS/STT adapter paths, but no
  canonical image/video generation or Brain async polling contract.
- Groq tool-calling and agents are kept conservative here. The current repo does
  not prove a canonical Groq tool-calling execution contract, so provider truth
  does not claim `agents` or `toolCalling` as working.
- MiMo auth accepts `MIMO_API_KEY` and `XIAOMI_API_KEY` in canonical provider
  truth.
- MiMo dynamic catalog discovery is locally proven through its token-plan model
  catalog plus conservative metadata mapping.
- MiMo has canonical chat/reasoning/coding through the OpenAI-compatible text
  path and a MiMo-native TTS adapter path, but no canonical STT, voice-clone,
  image/video generation, or Brain async polling contract.
- MiMo tool-calling, artifact support, and media-generation claims are kept
  conservative here because the current repo does not prove canonical contracts
  for those families.
- PR #113 recorded persisted playable TTS artifacts through Together, Groq, and
  MiMo.
- Together auth currently depends on `TOGETHER_API_KEY`.
- Together image uses the native `/images/generations` route, not chat
  completions.
- Together video uses canonical Brain local async polling through
  `/api/brain/media-jobs/:jobId` and persists canonical artifacts locally when
  provider polling completes.
- Together TTS, STT, embeddings, and rerank have runtime adapters, but remain
  conservative `partial` rows until live proof upgrades them.
- Together does not currently claim music, translation, documents, OCR,
  voice-clone, or adult-family provider truth in the canonical provider layer.
- Qwen auth accepts both `QWEN_API_KEY` and `DASHSCOPE_API_KEY`.
- Qwen uses compatible-mode chat plus AIGC image/video endpoint families.
- Qwen free-quota routing truth exists in canonical scoring through
  `QWEN_PAID_ENABLED`; models flagged outside free quota are excluded unless the
  paid gate is enabled.
- Free-token-only operation must keep `QWEN_PAID_ENABLED` unset or `false`.
- Qwen canonical Brain local async media polling exists for Wanx task-based
  media jobs.
- Qwen chat remains `working` here, while reasoning, coding, vision, OCR,
  image, video, image-to-video, embeddings, and translation remain conservative
  `partial` rows without upgraded live proof.
- `partial` means a route, adapter, or provider declaration exists in canonical
  V1 code, but live proof is insufficient to call it working.
- Adult rows remain `unknown` at provider level because adult is a Brain policy
  gate, not a provider feature.
- Admin provider-key and provider-test surfaces cover only the six approved V1
  providers. This does not upgrade any capability row to `working`.
- Provider capability changes must update this file and `CHANGELOG_AI.md`.

## Phase 1 Discovery Coverage

| Provider | Dynamic model discovery | Task/capability evidence | Extra discovery |
| --- | --- | --- | --- |
| HF | Hub model metadata | pipeline task metadata and conservative descriptor mapping | inference providers plus configured private/dedicated endpoints |
| Together | provider model catalog | model metadata when supplied | configured dedicated endpoints |
| Groq | provider model catalog | model metadata when supplied | chat/vision/audio discovery truth only |
| GenX | async `/api/v1/models` family, then the existing runtime image/video/music/TTS fallback when the live catalog fails | model metadata or explicit provider-contract runtime catalog fallback | streaming and async job truth |
| Qwen | compatible-mode model catalog | model metadata when supplied | compatible/AIGC split, free-quota and paid guard |
| MiMo | token-plan model catalog | model metadata when supplied | token-plan text/TTS endpoint truth |

Discovery support does not upgrade a capability row to `working`. The working,
partial, blocked, and unknown statuses above remain evidence-based execution
truth. A discovered model is preferred when its metadata identifies the
requested capability. PR #118 adds a lower-scored provider-contract fallback
only for dynamically discovered models whose catalogs omit task metadata.
Models identified as another modality are not relabeled.

The 2026-06-16 GenX follow-up adds a second GenX-specific provider-contract
fallback from the existing runtime catalog when configured live GenX model
discovery fails. This now conservatively recovers routing candidates only for
image, text-to-video models covered by the explicit GenX video contract,
music/audio generation, and TTS. Unproven GenX families such as image edit,
image-to-video, avatar, STT, documents, agents, and adult media are not exposed
through that fallback.

GenX image is locally proven to return a Brain `pollUrl`, to complete through
the Brain local media-job surface, and to persist a canonical artifact in the
focused contract tests. It is not yet live-provider proven in this repo.

GenX video has canonical adapter and polling contracts plus provider-contract
fallback candidates, but remains `partial` without live provider proof. GenX
music and TTS have canonical adapter paths and conservative fallback evidence,
but remain `partial` without live provider proof. GenX STT, avatar, vision,
documents, agents, and adult families remain `unknown` here because the current
repo does not prove those GenX families end to end.

PR #117 makes this discovery evidence the production routing dependency.
Provider-native adapters receive the discovered model and contain no fallback
model selection. If the catalog supplies no discovered model and no
provider-contract evidence, execution returns `NO_ROUTE_FOUND`. PR #118 also
adds task-filtered Hugging Face Hub discovery and Together-native video, STT,
embeddings, and rerank adapter paths. The matrix remains conservative because
repository wiring is not live provider proof.

Hugging Face has local proof for dynamic Hub discovery, task-to-capability
mapping, inference-provider metadata, configured private/dedicated endpoint
metadata, and canonical adapter paths for image, TTS, STT, rerank, documents,
and other specialist inference families. This upgrades HF reasoning, coding,
TTS, OCR, and avatar rows to conservative `partial` rather than `unknown`, but
does not upgrade any non-chat HF row to `working` without live provider proof.

Groq has local proof for dynamic catalog discovery, chat routing, streaming,
and Groq-native TTS/STT adapter paths. Groq image/video/media-generation rows
remain `unknown` because the current repo does not prove a canonical Groq-native
or routed generation contract for those families. Groq tool-calling remains
conservative and is not treated as proven provider truth here.

MiMo has local proof for dynamic catalog discovery, OpenAI-compatible chat text
routing, and a MiMo-native TTS adapter path. MiMo STT, vision, voice clone,
image/video/media generation, and async polling remain unproven in canonical
runtime truth and stay conservative here.

Canonical Brain local async media polling currently exists for GenX, Qwen, and
Together. Hugging Face async generation remains incomplete in canonical Brain
polling truth.

Phase 1 files:

- `src/lib/providers/provider-types.ts`
- `src/lib/providers/provider-truth.ts`
- `src/lib/providers/registry.ts`
- `src/lib/providers/capability-registry.ts`
- `src/lib/providers/provider-discovery.ts`
- `src/lib/providers/model-discovery.ts`
- `src/lib/providers/provider-cache.ts`
- `src/lib/providers/provider-scoring.ts`
- `src/lib/providers/routing-profiles.ts`
- `src/lib/providers/health.ts`
