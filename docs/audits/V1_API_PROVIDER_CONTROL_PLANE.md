# V1 API Provider Control Plane

## Operating boundary

The VPS is the AmarktAI control plane. It hosts routing, provider credentials, durable jobs, polling, app policy, traces, artifacts, the dashboard, local storage, and FFmpeg stitching. It does not self-host heavy AI models.

The canonical product truth remains `src/lib/brain/v1-capability-matrix.ts`. The provider gateway, BullMQ queue, approved model registry, and Hugging Face sync are execution utilities, not capability registries.

## Deployment requirements

- Apply the Prisma schema with `npx prisma db push` using the deployment `DATABASE_URL`.
- Configure `REDIS_URL`; long-running jobs return an explicit queue blocker without it.
- Run the BullMQ worker integration for long-form video, external polling, adult media, avatar video, music/audio, and image batches.
- Configure `OTEL_EXPORTER_OTLP_ENDPOINT` to export traces. Database traces remain canonical when OTLP is not configured.
- Configure provider keys through the existing Settings/vault flow.
- Configure HF specialist endpoints with `HF_ENDPOINT_<CAPABILITY>` or `HF_SPECIALIST_ENDPOINTS_JSON`.
- Explicitly allow models with `HUGGINGFACE_APPROVED_MODELS`; discovery alone never enables execution.

## Operational paths

- Text providers use the normalized provider gateway aliases with health checks, timeouts, retries, and fallback attempts.
- Long-running work receives a `ControlPlaneJob`, BullMQ identifier, attempts, provider job IDs, polling URLs, charge marker, artifact ID, and cancellation state.
- Video model contracts declare T2V/I2V mode, source requirements, duration support, aspect ratios, maximum clip duration, and polling method.
- Requests longer than ten seconds or requesting Reels, TikTok, Shorts, ads, or multi-scene output use the long-form scene pipeline.
- Qwen Wan receives no duration field when its model contract does not support duration customization.
- Adult capabilities require global availability, app opt-in, per-capability enablement, approved provider/model lists, explicit fictional consenting adults aged 18+, and audit logging.
- Unconfigured adult model routes return setup/test guidance instead of pretending to execute.

## Proof

Run:

```powershell
npm.cmd run proof:v1-control-plane
```

For real post-deployment workflow execution:

```powershell
$env:AMARKTAI_BASE_URL='https://amarktai.co.za'
$env:AMARKTAI_ADMIN_COOKIE='amarktai_admin=...'
$env:AMARKTAI_PROOF_APP_SLUG='configured-app'
$env:AMARKTAI_RUN_LIVE_PROOF='true'
npm.cmd run proof:v1-control-plane
```

The output includes health, route matrices, adult policy, creative smoke, TTS, short video, 30-second long-form handoff, jobs truth, and artifacts truth. A provider-blocked result is truthful proof only when it includes the exact setup blocker and no fake artifact.
