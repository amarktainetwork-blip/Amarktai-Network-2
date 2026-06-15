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
| image_to_video | unknown | unknown | unknown | partial | partial | unknown |
| avatar | unknown | unknown | unknown | partial | unknown | unknown |
| music | partial | unknown | unknown | partial | unknown | unknown |
| tts | unknown | working | working | unknown | unknown | working |
| stt | partial | unknown | partial | unknown | unknown | unknown |
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
