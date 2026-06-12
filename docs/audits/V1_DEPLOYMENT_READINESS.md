# V1 Deployment Readiness

## Scope

This deployment-readiness layer checks configuration for the already-wired 62-capability AI system. It does not add capabilities, providers, apps, or another source of truth.

Admin-safe status:

```text
GET /api/admin/system/ai-deployment-readiness
```

The endpoint requires an authenticated admin session. It returns configured/missing/invalid state and setup instructions, never credential or signing-secret values.

## Provider Credential Checklist

Credentials may be saved in the existing provider vault or supplied through these environment variables:

| Provider | Accepted environment variables | Additional configuration |
| --- | --- | --- |
| GenX | `GENX_API_KEY` | `GENX_BASE_URL` or legacy `GENX_API_URL`; defaults to the approved GenX URL |
| Hugging Face | `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN` | Specialist model/endpoint overrides described below |
| Qwen / DashScope / Wan | `QWEN_API_KEY`, `DASHSCOPE_API_KEY` | Provider account must permit the requested Qwen/Wan model |
| Xiaomi MiMo | `MIMO_API_KEY`, `XIAOMI_API_KEY` | Provider account must permit the requested MiMo model |
| Groq | `GROQ_API_KEY` | Provider account must permit the requested text, STT, or TTS model |
| Together AI | `TOGETHER_API_KEY` | Provider account must permit the requested text, image, embedding, rerank, or video model |

Empty, short, example, placeholder, demo, and fake values are reported as missing.

## Hugging Face Specialist Configuration

Common serverless tasks have canonical default model IDs in `src/lib/hf-specialist-config.ts`. Override any model with:

```text
HF_MODEL_<CAPABILITY_ID_UPPERCASE>=organization/model
```

Override an endpoint with:

```text
HF_ENDPOINT_<CAPABILITY_ID_UPPERCASE>=https://...endpoints.huggingface.cloud
```

JSON maps are also supported:

```text
HF_SPECIALIST_MODELS_JSON={"text_classification":"organization/model"}
HF_SPECIALIST_ENDPOINTS_JSON={"robotics":"https://...endpoints.huggingface.cloud"}
```

Endpoint URLs must be public HTTPS URLs. Localhost, loopback, link-local, and private-network URLs are rejected.

Dedicated endpoint configuration is required for:

- `image_to_video`, `image_text_to_video`, `text_to_video`, `video_to_video`, `video_text_to_text`
- `visual_document_retrieval`, `text_to_3d`, `image_to_3d`
- `text_to_audio`, `audio_to_audio`, `music_generation`
- `avatar_generation`, `avatar_video`, `voice_clone_or_voice_design`
- `tabular_classification`, `tabular_regression`
- `reinforcement_learning`, `robotics`, `any_to_any`, `multimodal_generation`

These routes return `needs_configuration` until a real endpoint is supplied. No fake endpoint is embedded.

## Artifact Storage And Database

Required production configuration:

```text
DATABASE_URL=postgresql://...
STORAGE_DRIVER=local_vps
AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage
```

`STORAGE_ROOT` remains a legacy alias. The app process must be able to create, read, write, and delete files under:

```text
artifacts/
uploads/
repos/
workspaces/
logs/
```

The readiness check performs:

1. Directory creation/access checks.
2. Per-directory write and read-back probes.
3. A storage-driver put/get/delete round trip.
4. An atomic create/delete probe against the real `Artifact` table.

Artifact generation is ready only when storage and database checks all pass.

## Connected-App Signing Secrets

Every registered connected app must have:

- `status=active`
- canonical secret reference `AMARKTAI_APP_SECRET_<APP_SLUG>`
- a configured environment variable at that reference
- a valid stored SHA-256 secret hash
- a configured secret matching that hash
- only registered connected-app scopes
- at least one `ai:*:execute` scope

The readiness endpoint reports app IDs, slugs, secret-reference names, and blockers. It never returns secret or hash values.

## Remaining Manual Deployment Steps

1. Install all six approved provider credentials in the vault or production environment.
2. Add real Hugging Face Inference Endpoint URLs for specialist capabilities intended for launch.
3. Confirm each provider account has model access and quota.
4. Set `DATABASE_URL`, run Prisma migrations, and verify database connectivity.
5. Create and persist `/var/www/amarktai/storage` with ownership for the app service user.
6. Provision every connected-app signing secret in the server environment and assign least-privilege AI scopes.
7. Call the admin readiness endpoint after deployment and resolve every returned blocker.

## Proof

Final proof:

```text
npx.cmd tsc --noEmit
PASS

npm.cmd run build
PASS - 197 static pages generated; readiness endpoint included

npx.cmd vitest run src/lib/__tests__/v1-deployment-readiness.test.ts src/lib/__tests__/storage-persistence.test.ts
PASS - 2 files, 14 tests

npm.cmd test -- --testTimeout=15000
PASS - 36 files, 713 tests
```
