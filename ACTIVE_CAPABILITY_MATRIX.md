# Active Capability Matrix

## Canonical declared capability truth

- `src/lib/brain/v1-capability-matrix.ts`

## Canonical runtime execution owner

- `src/lib/orchestrator.ts`

## Runtime/dashboard projection readers

- `src/lib/runtime-capability-truth.ts`
- `src/lib/brain/v1-route-matrix.ts`

## Active route groups in this cleanup pass

### Canonical app/public capability execution routes

- `/api/brain/request`
- `/api/brain/agent-request`
- `/api/brain/image`
- `/api/brain/image-edit`
- `/api/brain/video`
- `/api/brain/video-generate`
- `/api/brain/tts`
- `/api/brain/stt`
- `/api/brain/rerank`
- `/api/brain/embeddings`
- `/api/brain/research`
- `/api/brain/avatar`
- `/api/brain/avatar-video`
- `/api/brain/adult-text`
- `/api/brain/adult-image`
- `/api/brain/adult-video`
- `/api/brain/suggestive-image`
- `/api/brain/suggestive-video`
- `/api/connected-apps/capabilities/execute`
- `/api/admin/studio/execute`

### Admin/settings/proof routes

- `/api/admin/provider-capability-test`
- `/api/admin/settings/test-provider`
- `/api/admin/settings/test-genx`
- `/api/admin/settings/test-qwen`
- `/api/admin/settings/test-huggingface`
- `/api/admin/settings/test-together`
- `/api/admin/settings/test-groq`

## Honesty rules applied

- Settings test routes are treated as either credential checks, key/catalog discovery probes, or explicit live capability proof.
- Catalog discovery is not capability proof.
- Public/app-facing routes no longer pretend to support provider/model forcing.
