# Phase 10 — Media Artifacts + Provider Result Logs

Generated: 2026-05-02  
Branch: `phase-10-media-artifacts-provider-results`

## Goal

Move specialist provider routes from "executed once" toward real production behaviour:

1. Save generated media/task outputs as artifacts.
2. Log provider success/failure/latency so routing can learn what actually works.
3. Keep this phase safe by avoiding a risky database migration until the artifact model/UI is designed.

## Added

### 1. File-based media artifact storage

New file:

```text
src/lib/media-artifacts.ts
```

Default storage paths:

```text
MEDIA_ARTIFACT_ROOT=/var/www/amarktai/repo/public/generated-artifacts
MEDIA_ARTIFACT_PUBLIC_PREFIX=/generated-artifacts
```

It writes:

- binary/audio/image/video artifacts,
- JSON task artifacts,
- sidecar metadata JSON,
- public paths under `/generated-artifacts/...`.

### 2. Provider result JSONL logging

New file:

```text
src/lib/provider-result-log.ts
```

Default storage path:

```text
PROVIDER_RESULT_LOG_ROOT=/var/www/amarktai/repo/storage/provider-results
```

Each line records:

- timestamp,
- app slug,
- provider,
- model,
- capability,
- success,
- executed,
- latency,
- content type,
- artifact ID/path,
- error,
- metadata.

This is the safe first step before persistent DB-backed routing intelligence.

### 3. Hugging Face specialist artifacts/results

Updated:

```text
POST /api/admin/specialist/huggingface
```

Now supports:

- `appSlug`,
- `saveArtifact`,
- artifact persistence for binary or JSON results,
- `X-Artifact-Id` and `X-Artifact-Path` headers for binary results,
- provider result log entry.

### 4. Qwen Wanx image task artifacts/results

Updated:

```text
POST /api/admin/specialist/qwen-wanx-image
```

Now saves provider task JSON as an artifact and logs provider result metadata.

Important: Qwen Wanx remains async. This saves task creation output. Polling/result retrieval still needs a later route.

### 5. MiniMax/Mimo TTS artifacts/results

Updated:

```text
POST /api/admin/specialist/minimax-tts
```

Now saves generated audio as an artifact, emits artifact headers, and logs provider result metadata.

## Manual tests after merge/deploy

### MiniMax/Mimo TTS artifact

```bash
curl -i -sS -X POST https://amarktai.com/api/admin/specialist/minimax-tts \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "text":"Hello, this is Aiva using MiniMax voice with artifact storage.",
    "model":"speech-2.6-turbo",
    "appSlug":"amarktai-network",
    "saveArtifact":true
  }' --output /tmp/minimax-aiva.mp3
```

Expected headers on success:

```text
X-Artifact-Id: ...
X-Artifact-Path: /generated-artifacts/...
```

### Qwen Wanx task artifact

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/qwen-wanx-image \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "prompt":"A premium dark glassmorphism AI command center dashboard",
    "model":"wanx2.1-t2i-turbo",
    "size":"1024*1024",
    "appSlug":"amarktai-network",
    "saveArtifact":true
  }' | jq
```

Expected:

- provider JSON,
- `artifact.id`,
- `artifact.publicPath`.

### Hugging Face artifact

```bash
curl -i -sS -X POST https://amarktai.com/api/admin/specialist/huggingface \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "modelId":"hexgrad/Kokoro-82M",
    "capability":"text_to_speech",
    "inputs":"Hello from Hugging Face artifact storage.",
    "appSlug":"amarktai-network",
    "saveArtifact":true
  }' --output /tmp/hf-specialist.bin
```

### Verify files on VPS

```bash
sudo find /var/www/amarktai/repo/public/generated-artifacts -type f | tail -30
sudo find /var/www/amarktai/repo/storage/provider-results -type f | tail -20
sudo tail -n 20 /var/www/amarktai/repo/storage/provider-results/amarktai-network/qwen/*.jsonl 2>/dev/null || true
sudo tail -n 20 /var/www/amarktai/repo/storage/provider-results/amarktai-network/minimax/*.jsonl 2>/dev/null || true
sudo tail -n 20 /var/www/amarktai/repo/storage/provider-results/amarktai-network/huggingface/*.jsonl 2>/dev/null || true
```

## Not included

This phase does not yet add:

- database-backed artifact model,
- artifact gallery UI,
- Qwen Wanx polling/result retrieval,
- persistent provider scoring in DB,
- automatic routing avoidance of failed providers,
- media cleanup/retention policy,
- signed/private artifact access.

## Next recommended phase

Phase 11 should add provider intelligence and routing memory:

1. Persistent provider performance summary from JSONL logs.
2. Provider score endpoint.
3. Routing policy avoids providers with repeated failures/timeouts.
4. Qwen Wanx polling/result retrieval.
5. Artifact gallery/list endpoint.

## Verdict

Specialist routes now leave evidence: artifacts and provider result logs. This makes the system auditable and prepares the routing layer to learn from real provider performance instead of static assumptions.
