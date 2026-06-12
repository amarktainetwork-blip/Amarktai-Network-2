# V1 AI Capability Truth Matrix

Generated from `src/lib/ai-capability-taxonomy.ts`.

## Summary

| Status | Count |
| --- | ---: |
| Working now | 13 |
| Partially wired | 11 |
| Provider available, not wired | 36 |
| Unavailable | 2 |
| **Total** | **62** |

The matrix only references the approved provider universe in `provider-mesh.ts` and model IDs derived from `universal-model-catalog.ts`. A provider advertisement is not treated as an executable route.

## Working Now

- `chat`, `reasoning`, `research`, `text_generation`
- `text_ranking`, `embeddings`, `rerank`
- `text_to_image`, `text_to_video`
- `text_to_speech`, `automatic_speech_recognition`
- `music_generation`, `lyrics_generation`

These capabilities have a real endpoint and at least one approved executable provider route. Runtime configuration can still truthfully produce a needs-configuration or provider error response.

## Partially Wired

- `text_classification`, `zero_shot_classification`, `translation`
- `summarization`, `question_answering`, `table_question_answering`
- `image_text_to_image`, `image_to_image`
- `avatar_video`
- `campaign_generation`, `brand_aware_content_generation`

Partial means an honest endpoint or generic execution path exists, but the dedicated connected-app schema, binary-input adapter, artifact bundle, or provider contract is incomplete.

## Provider Available But Not Wired

- Text: `token_classification`, `sentence_similarity`, `feature_extraction`, `fill_mask`
- Multimodal: `document_question_answering`, `visual_question_answering`, `image_text_to_text`, `image_to_text`, `video_text_to_text`, `visual_document_retrieval`, `multimodal_generation`
- Vision: `image_classification`, `zero_shot_image_classification`, `object_detection`, `zero_shot_object_detection`, `image_segmentation`, `mask_generation`, `depth_estimation`, `keypoint_detection`, `image_feature_extraction`
- Video: `image_to_video`, `image_text_to_video`, `video_to_video`, `video_classification`
- Audio: `text_to_audio`, `audio_to_audio`, `audio_classification`, `voice_activity_detection`
- Avatar and voice: `avatar_generation`, `voice_clone_or_voice_design`
- Data: `tabular_classification`, `tabular_regression`, `time_series_forecasting`
- Experimental: `text_to_3d`, `image_to_3d`, `any_to_any`

These entries identify approved providers that advertise the broad modality or task family. They remain non-executable until an AmarktAI adapter and normalized result contract are proven.

## Unavailable

- `reinforcement_learning`: no training environment, compute scheduler, safety contract, or approved execution route.
- `robotics`: no hardware-specific safety, approval, or physical-control execution system; excluded from connected-app V1.

## Highest-Priority Missing Execution Routes

1. Binary/reference input contract shared by image, document, audio, and video tasks.
2. Hugging Face task adapter with typed request and normalized result schemas.
3. Source-image adapter for image editing and image-to-image.
4. Source-image adapter for image-to-video and image-text-to-video.
5. Multimodal vision analysis for image-to-text, VQA, and document Q&A.
6. Computer-vision result schemas for boxes, masks, depth maps, labels, and keypoints.
7. Audio task adapter for classification, VAD, and audio-to-audio.
8. Dedicated connected-app contracts for classification, translation, summarization, and Q&A.
9. Campaign and brand-context artifact bundle plus approval contract.
10. Consent-backed voice profile and avatar/lip-sync execution contract.

## Recommended Next PRs

1. `codex/v1-connected-app-capability-contracts`: add scoped request authentication, capability lookup, normalized truth responses, and audit records without executing new capability jobs.
2. `codex/v1-huggingface-task-adapters`: wire typed text, vision, audio, and tabular task adapters against the canonical truth matrix.
3. `codex/v1-multimodal-input-contract`: add canonical file/reference inputs and source-media adapters with artifact reuse.
4. `codex/v1-campaign-and-avatar-contracts`: add campaign artifact bundles and consent-gated avatar/voice profile contracts.

The exact next recommended PR is `codex/v1-connected-app-capability-contracts`. It should enforce the new scopes and return truthful capability readiness before any connected-app execution expansion.
