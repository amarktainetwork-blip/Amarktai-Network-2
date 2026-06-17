# AmarktAI Network V1 Capability Matrix

Status legend:

- `WORKING_LOCAL_CONTRACT_ONLY`
- `KEY_ONLY_NOT_CAPABILITY_PROOF`
- `ROUTE_EXISTS_ADAPTER_MISSING`
- `NOT_WIRED_THROUGH_BRAIN_ROUTE`
- `PROVIDER_UNSUPPORTED`
- `BROKEN`

This matrix reflects current code truth, not dashboard labels, provider marketing, or key checks.

## Core Product/Capability Matrix

| Capability | Canonical route | GenX | Qwen | Hugging Face | Together | Groq | MiMo | Notes / blocker |
|---|---|---|---|---|---|---|---|---|
| chat | `/api/brain/request` | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | Canonical text path exists; no live proof yet |
| reasoning | `/api/brain/request` | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | Same canonical text stack |
| coding | `/api/brain/request` | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | LOCAL | Same canonical text stack |
| research | `/api/brain/research` | LOCAL | LOCAL | PROVIDER_UNSUPPORTED | LOCAL | LOCAL | LOCAL | HF provider truth excludes research |
| summarization | admin/provider capability test only | NOT_WIRED | NOT_WIRED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Task family exists but no public Brain route |
| translation | no canonical Brain route | PROVIDER_UNSUPPORTED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Qwen/HF only task/admin path |
| question answering | admin/provider capability test only | NOT_WIRED | NOT_WIRED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Admin-only proof surface |
| document question answering | admin/provider capability test only | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-based, not Brain-normalized |
| table question answering | admin/provider capability test only | PROVIDER_UNSUPPORTED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Admin-only text/specialist proof |
| text classification | admin/provider capability test only | NOT_WIRED | NOT_WIRED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No public Brain route |
| zero-shot classification | admin/provider capability test only | PROVIDER_UNSUPPORTED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No public Brain route |
| token classification | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task family not normalized |
| fill-mask | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task family not normalized |
| sentence similarity | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task family not normalized |
| text ranking / rerank | `/api/brain/rerank` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | LOCAL | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF canonical, Together adapter exists but not live-proven |
| feature extraction / embeddings | `/api/brain/embeddings` | PROVIDER_UNSUPPORTED | LOCAL | NOT_WIRED | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Qwen canonical; HF/Together broader than current Brain truth |
| text-to-image | `/api/brain/image` | LOCAL | LOCAL | LOCAL | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Canonical image path exists |
| image-to-text | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | Vision tasks are mostly task-based/admin-only |
| image-to-image / image-edit | `/api/brain/image-edit` | ROUTE_EXISTS_ADAPTER_MISSING | ROUTE_EXISTS_ADAPTER_MISSING | ROUTE_EXISTS_ADAPTER_MISSING | ROUTE_EXISTS_ADAPTER_MISSING | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Honest route exists; source-image adapter not wired |
| image-to-video | `/api/brain/video-generate` | NOT_WIRED | LOCAL | PROVIDER_UNSUPPORTED | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | GenX truth excludes i2v; Qwen/Together locally wired |
| image classification | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| object detection | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| image segmentation | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| zero-shot image classification | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| zero-shot object detection | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| depth estimation | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| mask generation | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| keypoint detection | no canonical Brain route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| visual question answering | admin/provider capability test only | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-based specialist/admin proof |
| visual document retrieval | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-based only |
| image feature extraction | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-based only |
| unconditional image generation | no canonical separate route | BROKEN | BROKEN | BROKEN | BROKEN | BROKEN | BROKEN | No dedicated product contract; use text-to-image route only |
| text-to-video | `/api/brain/video-generate` | LOCAL | LOCAL | NOT_WIRED | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Together lacks safe contract subset; still local-contract-only |
| video-to-video | no canonical route | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No source-video route wired |
| video classification | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| video-text-to-text | no canonical route | NOT_WIRED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No normalized Brain contract |
| short-form video | `/api/brain/video-generate` | LOCAL | LOCAL | NOT_WIRED | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Canonical media-job path exists |
| long-form video | `/api/admin/video-projects` / `adult-video` long-form path | LOCAL | LOCAL | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Project pipeline exists, not universal provider parity |
| multi-scene video | `/api/admin/video-projects` | LOCAL | LOCAL | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Long-form video project pipeline |
| avatar | `/api/brain/avatar` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Route exists but provider-specific truth is conservative |
| avatar video / talking-head video | `/api/brain/avatar-video` | ROUTE_EXISTS_ADAPTER_MISSING | PROVIDER_UNSUPPORTED | ROUTE_EXISTS_ADAPTER_MISSING | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Orchestrator hard-stops with NEEDS_CONFIGURATION |
| text-to-speech | `/api/brain/tts` | LOCAL | PROVIDER_UNSUPPORTED | LOCAL | LOCAL | LOCAL | LOCAL | Canonical route exists for supported providers |
| speech-to-text | `/api/brain/stt` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | LOCAL | LOCAL | LOCAL | PROVIDER_UNSUPPORTED | Canonical route exists for supported providers |
| text-to-audio | no canonical route | NOT_WIRED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Taxonomy says not normalized into product runtime |
| audio-to-audio | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No transformation route wired |
| audio classification | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| voice activity detection | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| music generation | `/api/admin/music-studio` | LOCAL | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | GenX canonical; HF truth exists but not canonical Brain route |
| adult text | `/api/brain/adult-text` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No canonical provider truth claims adult_text |
| adult image | `/api/brain/adult-image` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Policy allows HF/Together, but no live/runtime proof to call ready |
| adult video | `/api/brain/adult-video` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Route exists, provider truth excludes all current canonical providers |
| adult voice | `/api/brain/tts` with `capability=adult_voice` | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | No canonical provider truth claims adult_voice |
| suggestive image | `/api/brain/suggestive-image` | LOCAL | LOCAL | LOCAL | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Policy-gated wrapper over canonical image generation |
| suggestive video | `/api/brain/suggestive-video` | LOCAL | LOCAL | NOT_WIRED | LOCAL | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Policy-gated wrapper over canonical video generation |
| tabular classification | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| tabular regression | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| time-series forecasting | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | NOT_WIRED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | HF task-only |
| graph machine learning | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Not implemented in current canonical truth |
| robotics | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Explicitly blocked in taxonomy |
| any-to-any | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Not bounded into executable runtime contract |
| multimodal | no canonical route | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | PROVIDER_UNSUPPORTED | Individual routes exist; no atomic multimodal product contract |

## Already Coded But Not Properly Wired

- HF rerank / ranking task path exists but is broad-catalog and not tightly constrained
- HF image/image-edit task-specific pieces exist but image-edit remains source-input adapter missing
- Qwen translation support exists in provider truth but no canonical Brain route
- MiMo text stack exists, but image support leakage in older static model hints was removed
- Avatar generation exists as route, but per-provider truth is more conservative than the route suggests
- Long-form video exists through project pipeline, but not unified across providers through one canonical Brain route

## Missing Adapters / Missing Wiring

- image_edit across providers: route exists, source-image adapter normalization missing
- avatar_video: route exists, adapter missing
- source-video transforms: no canonical route
- many HF task families: specialist/admin-only, not Brain-normalized
- translation: not canonical Brain-normalized

## Blocked Mostly By Config / Discovery / Runtime Proof

- GenX image/video/music/TTS need post-redeploy live proof
- Qwen image/video/image-to-video/embeddings need live proof
- HF image/TTS/STT/rerank need live proof
- Together image/video/TTS/STT need live proof
- Groq TTS/STT/chat/vision need live proof
- MiMo chat/reasoning/coding/TTS need live proof

## Capabilities Requiring External Worker / Open-Source Execution

- local media polling completion: Redis/BullMQ worker path and media-job store path must be healthy
- long-form video project execution
- webhook retries
- scheduled learning / manager checks
- durable workflow execution if moved off inline request path
