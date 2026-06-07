# Standalone Core Media Dashboard Fix

## Findings

Provider status was derived from multiple stores. Settings test notes lived in `IntegrationConfig`, provider health also lived in `AiProvider`, and some dashboard surfaces translated the raw runtime status independently. A provider could therefore pass a live test and still appear as needing setup elsewhere.

Media routes also used different output shapes. Image providers could return URLs, base64, or jobs, while Studio only handled a narrow subset. Music blueprints were stored as completed music artifacts, and video polling had no terminal age limit.

## Fixes

- Provider credentials and live-test evidence now merge `IntegrationConfig`, `AiProvider`, and environment truth.
- Settings, runtime truth, dashboard status, Studio readiness, and Advanced Admin use the same normalized connection state.
- Internal statuses remain in raw diagnostics; normal UI shows `Connected` or an exact blocker.
- Adult readiness uses a connected provider plus a compatible adult capability route. The obsolete separate adult live-test flag is diagnostic only.
- Legal consenting-adult modes remain visible. Existing safety scanning still blocks minors, age ambiguity, non-consensual content, real-person sexual deepfakes, and illegal content.
- The canonical media helper normalizes media URLs, base64 payloads, nested provider shapes, and async job IDs.
- Completed media artifacts require real bytes or a real media URL. Provider response metadata is sanitized before persistence.
- Image Studio runs persist real image output and return preview/storage URLs.
- Music blueprints are saved as planning reports, never completed songs. Real song requests fail clearly when no playable audio is returned.
- Video jobs record provider/model, poll provider state, persist completed video artifacts, and fail after a bounded processing window.
- Avatar video returns an honest provider-unavailable/setup blocker until an approved lip-sync contract exists.
- TTS persists playable audio through the existing artifact route. Studio STT persists transcripts and rejects missing uploads.
- Outputs renders real image previews, audio/music players, video players, text/report cards, metadata, and download links.
- The primary dashboard is App Builder, Repo Workbench, Media Studio / Playground, Outputs, Settings, and Advanced Admin.

## Remaining Limitations

- Avatar generation remains unavailable until a real approved avatar/lip-sync provider is connected and implemented.
- Remote provider URLs are downloaded to VPS storage when possible. A verified remote reference is retained when a temporary download failure prevents local copying.
- Async image jobs are surfaced as processing, but a provider-specific image polling endpoint is still required for providers that do not return a final URL in the initial request.
- Live provider behavior depends on the models and account permissions configured on the VPS.

## Test Matrix

### Image

1. Open Media Studio / Playground and select Image.
2. Run a prompt with GenX, Qwen, Together AI, or another available image provider.
3. Confirm provider/model/status are shown.
4. Confirm a preview and artifact link appear.
5. Confirm Outputs renders the same image.
6. Simulate a provider response with no URL, base64, or job and confirm the exact no-usable-media blocker.

### Music and Song

1. Run a song request with a connected GenX audio model.
2. Confirm the job identifies provider/model and produces a playable music artifact.
3. Confirm Outputs renders an audio player and download link.
4. Disable the real audio route and confirm the request does not claim song success.
5. Confirm any lyrics/blueprint result is labeled as a planning artifact.

### Video and Adult Video

1. Start a GenX or Qwen video job.
2. Confirm the job row has provider and model.
3. Poll the returned URL until success or failure.
4. Confirm success creates a playable video artifact.
5. Confirm old or repeatedly failing jobs become failed instead of remaining processing.

### Avatar

1. Run Avatar / Talking Video without an approved provider.
2. Confirm `avatar video provider unavailable` and the setup requirement.
3. Confirm no static image or placeholder video artifact is created.

### TTS and Adult Voice

1. Run Voice / TTS with a connected GenX, Groq, or Hugging Face route.
2. Confirm playable audio and an artifact ID/storage URL.
3. Enable the app adult policy and run Adult Voice.
4. Confirm legal content follows the same audio persistence path.

### STT

1. Upload a valid audio file in STT / Transcription.
2. Confirm transcript text and a transcript artifact.
3. Confirm Outputs renders the transcript metadata.
4. Submit without a file and confirm the clear upload error.

### Adult Media Policy

1. Confirm Adult Text, Adult Image, Adult Video, and Adult Voice remain visible.
2. Enable `adultMode=true` and `safeMode=false` for the target app.
3. Confirm a legal consenting-adult request is evaluated using provider/model readiness without a separate adult live-test gate.
4. Confirm illegal or unsafe categories remain blocked with a policy error.

## Validation Commands

```bash
npm ci
npx prisma generate
npx tsc --noEmit
npm run build
npx vitest run src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts src/lib/__tests__/runtime-capability-truth.test.ts src/lib/__tests__/adult-media-routing.test.ts src/lib/__tests__/video-job-artifact-link.test.ts src/lib/__tests__/storage-persistence.test.ts src/lib/__tests__/final-dashboard-ux.test.ts
```
