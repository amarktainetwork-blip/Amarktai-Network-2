# Live Media Terminal Proof Fix

## Contract

Every media response now follows one terminally honest rule:

- `success: true` with `artifactId` and a playable `storageUrl`/media URL means completed media was persisted.
- `success: true` with a local `jobId` and `pollUrl` means provider work is still processing and can be tracked locally.
- Any response without completed media or a local pollable job returns `success: false` with an explicit blocker.

Provider job IDs are retained as `providerJobId`; clients receive a separate local job ID.

## Fixed Paths

| Capability | Start route | Poll route | Artifact behavior |
| --- | --- | --- | --- |
| Image | `/api/admin/studio/execute` | `/api/brain/media-jobs/:jobId` | GenX provider jobs become local jobs; completion creates an image artifact. |
| Music | `/api/admin/music-studio` | `/api/brain/media-jobs/:jobId` | Immediate audio creates a music artifact; async GenX audio creates a local job. |
| Video | `/api/brain/video-generate` | `/api/brain/video-generate/:jobId` | Studio sends `video_generation`; completed video jobs create video artifacts. |
| TTS | `/api/brain/tts` | `/api/brain/media-jobs/:jobId` when async | GenX/Hugging Face must return real audio; Groq TTS is blocked rather than selected. |
| Avatar | `/api/brain/avatar-video` | Not available | Capability is recognized and returns `avatar video provider unavailable` until a real provider contract exists. |

Local generic media jobs are stored at `jobs/media-jobs.json` under the unified AmarktAI storage root. Jobs use `queued`, `processing`, `completed`, and `failed`, and fail after 15 minutes without terminal provider output.

## Studio and Outputs Proof

- Studio reads top-level and nested `pollUrl` values.
- Studio replaces the pending payload with the terminal poll payload so image, audio, music, and video previews receive the final URL.
- Outputs renders persisted image, audio/music, and video artifacts, including canonical media URLs retained in metadata.
- Planning-only music remains a report and is never labeled as a completed song.

## Verification

Run from the repository root:

```powershell
npm ci
npm.cmd exec prisma generate
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd test -- --run src/lib/__tests__/live-media-execution-contract.test.ts src/lib/__tests__/video-job-artifact-link.test.ts src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts
npm.cmd run build
```

Focused tests prove:

1. Provider async work receives a distinct local job ID and poll URL.
2. Completed provider jobs persist canonical artifacts.
3. Stale jobs fail after the terminal timeout.
4. Avatar capability normalization no longer reports `Unknown capability`.
5. Groq is not advertised as a working TTS provider.
6. Studio uses `video_generation` and valid instrumental music input.

## Live Request Shape

Processing:

```json
{
  "success": true,
  "jobStatus": "processing",
  "jobId": "local-job-id",
  "providerJobId": "provider-job-id",
  "pollUrl": "/api/brain/media-jobs/local-job-id",
  "artifactId": null,
  "storageUrl": null
}
```

Completed:

```json
{
  "success": true,
  "jobStatus": "completed",
  "jobId": "local-job-id",
  "artifactId": "artifact-id",
  "storageUrl": "/api/admin/artifacts/artifact-id/content",
  "error": null
}
```

Blocked:

```json
{
  "success": false,
  "jobStatus": "needs_setup",
  "artifactId": null,
  "storageUrl": null,
  "blocker": "avatar video provider unavailable"
}
```
