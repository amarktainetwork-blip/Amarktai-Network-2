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
| reasoning | unknown | partial | partial | partial | partial | partial |
| coding | unknown | partial | partial | partial | partial | partial |
| research | unknown | unknown | unknown | unknown | unknown | unknown |
| image | partial | partial | unknown | partial | partial | unknown |
| image edit | unknown | unknown | unknown | unknown | unknown | unknown |
| video | partial | partial | unknown | partial | partial | unknown |
| image_to_video | unknown | partial | unknown | partial | partial | unknown |
| avatar | unknown | unknown | unknown | partial | unknown | unknown |
| music | partial | unknown | unknown | partial | unknown | unknown |
| tts | unknown | working | working | unknown | unknown | working |
| stt | partial | partial | partial | unknown | unknown | unknown |
| voice clone | unknown | unknown | unknown | unknown | unknown | unknown |
| ocr | unknown | unknown | partial | unknown | partial | unknown |
| vision | partial | partial | partial | partial | partial | partial |
| embeddings | partial | partial | unknown | partial | partial | unknown |
| rerank | partial | partial | unknown | unknown | unknown | unknown |
| translation | partial | unknown | unknown | unknown | partial | unknown |
| documents | partial | unknown | unknown | partial | unknown | unknown |
| agents | unknown | unknown | unknown | partial | unknown | unknown |
| adult_text | unknown | unknown | unknown | unknown | unknown | unknown |
| adult_image | unknown | unknown | unknown | unknown | unknown | unknown |
| adult_video | unknown | unknown | unknown | unknown | unknown | unknown |

## Evidence Notes

- PR #113 recorded successful smoke checks for all six providers. This matrix
  treats that as chat connectivity proof only.
- PR #113 recorded persisted playable TTS artifacts through Together, Groq, and
  MiMo.
- `partial` means a route, adapter, or provider declaration exists in canonical
  V1 code, but live proof is insufficient to call it working.
- Adult rows remain `unknown` at provider level because adult is a Brain policy
  gate, not a provider feature.
- Provider capability changes must update this file and `CHANGELOG_AI.md`.

## Phase 1 Discovery Coverage

| Provider | Dynamic model discovery | Task/capability evidence | Extra discovery |
| --- | --- | --- | --- |
| HF | Hub model metadata | pipeline task metadata | inference providers plus configured private/dedicated endpoints |
| Together | provider model catalog | model metadata when supplied | configured dedicated endpoints |
| Groq | provider model catalog | model metadata when supplied | tool-calling capability contract |
| GenX | async `/api/v1/models` family, then existing static runtime catalog if the live catalog fails | model metadata or explicit provider-contract runtime catalog fallback | streaming, async job, and webhook truth |
| Qwen | compatible-mode model catalog | model metadata when supplied | compatible/AIGC split, free-quota and paid guard |
| MiMo | token-plan model catalog | model metadata when supplied | token-plan endpoint truth |

Discovery support does not upgrade a capability row to `working`. The working,
partial, blocked, and unknown statuses above remain evidence-based execution
truth. A discovered model is preferred when its metadata identifies the
requested capability. PR #118 adds a lower-scored provider-contract fallback
only for dynamically discovered models whose catalogs omit task metadata.
Models identified as another modality are not relabeled.

The 2026-06-16 GenX follow-up adds a second GenX-specific provider-contract
fallback from the existing runtime catalog when configured live GenX model
discovery fails. This can recover routing candidates for image, image edit,
video, image-to-video, avatar, music, TTS, STT, adult image, and adult video,
but it does not prove provider execution or artifact completion.

PR #117 makes this discovery evidence the production routing dependency.
Provider-native adapters receive the discovered model and contain no fallback
model selection. If the catalog supplies no discovered model and no
provider-contract evidence, execution returns `NO_ROUTE_FOUND`. PR #118 also
adds task-filtered Hugging Face Hub discovery and Together-native video, STT,
embeddings, and rerank adapter paths. The matrix remains conservative because
repository wiring is not live provider proof.

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