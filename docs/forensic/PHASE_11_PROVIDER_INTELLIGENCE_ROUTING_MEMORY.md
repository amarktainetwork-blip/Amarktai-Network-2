# Phase 11 — Provider Intelligence + Routing Memory

Generated: 2026-05-02  
Branch: `phase-11-provider-intelligence-routing-memory`

## Goal

Make provider routing smarter by using real evidence from provider result logs and generated artifacts.

The system should not blindly keep using a provider that repeatedly fails, times out, or performs slowly. This phase adds the first safe routing-memory layer without replacing the main router yet.

## Added

### 1. Provider intelligence summaries

New file:

```text
src/lib/provider-intelligence.ts
```

It reads JSONL provider result logs from:

```text
PROVIDER_RESULT_LOG_ROOT=/var/www/amarktai/repo/storage/provider-results
```

It computes per app/provider/model/capability:

- total attempts
- successes
- failures
- success rate
- average latency
- p95 latency
- last success time
- last failure time
- last artifact path
- score
- status
- recommendation

Statuses:

```text
excellent
good
degraded
failing
unknown
```

### 2. Provider score endpoint

New endpoint:

```text
GET /api/admin/provider-scores
```

Optional query params:

```text
?appSlug=amarktai-network
?provider=qwen
?days=14
?includeRaw=true
```

This is the first backend for a future Provider Intelligence dashboard.

### 3. Media artifact gallery endpoint

New file:

```text
src/lib/artifact-gallery.ts
```

New endpoint:

```text
GET /api/admin/artifacts/media
```

Optional query params:

```text
?appSlug=amarktai-network
?provider=minimax
?capability=text-to-speech
?limit=50
```

It lists media/task artifacts from:

```text
MEDIA_ARTIFACT_ROOT=/var/www/amarktai/repo/public/generated-artifacts
```

### 4. Qwen Wanx task polling

New file:

```text
src/lib/qwen-wanx-polling.ts
```

New endpoint:

```text
POST /api/admin/specialist/qwen-wanx-task
```

It polls a DashScope/Qwen task ID, saves task JSON as an artifact, and logs the provider result.

This moves Qwen Wanx from only task creation toward task result retrieval.

### 5. Smart routing endpoint

New endpoint:

```text
POST /api/admin/ai-routing/smart
```

It wraps the existing route planner, then uses provider intelligence to block providers with repeated bad history.

Important: this does not replace the existing router yet. It is a safe proving layer.

## Manual verification after merge/deploy

### Provider scores

```bash
curl -sS 'https://amarktai.com/api/admin/provider-scores?appSlug=amarktai-network&days=14' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

With raw logs:

```bash
curl -sS 'https://amarktai.com/api/admin/provider-scores?appSlug=amarktai-network&provider=qwen&days=14&includeRaw=true' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Artifact gallery

```bash
curl -sS 'https://amarktai.com/api/admin/artifacts/media?appSlug=amarktai-network&limit=50' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

### Qwen Wanx task polling

```bash
curl -sS -X POST https://amarktai.com/api/admin/specialist/qwen-wanx-task \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "taskId":"YOUR_QWEN_TASK_ID",
    "model":"wanx2.1-t2i-turbo",
    "appSlug":"amarktai-network",
    "saveArtifact":true
  }' | jq
```

### Smart routing

```bash
curl -sS -X POST https://amarktai.com/api/admin/ai-routing/smart \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{
    "capability":"chat",
    "costPreference":"cheap",
    "avoidBadProviders":true,
    "appProfile":{"appSlug":"amarktai-network","safetyProfile":"standard"}
  }' | jq
```

Expected:

- `smartRoutingApplied: true`
- `avoidance` decisions
- selected provider excludes providers with repeated bad score history

## Routing score rule

Smart routing avoids a provider when:

- provider has at least 2 matching samples, and
- score is below 45.

This is deliberately conservative so one accidental failure does not permanently block a provider.

## Still pending

This phase does not yet add:

- database-backed provider scores,
- automatic replacement of the main router,
- frontend dashboard for provider scores/artifacts,
- Qwen result file download from returned image URLs,
- artifact cleanup/retention policy,
- app-level provider fallback editor,
- Aiva tool permission registry.

## Next recommended phase

Phase 12 should be UI/product integration:

1. Provider Intelligence dashboard.
2. Artifact Gallery UI.
3. App AI Setup UI.
4. Simple Repo Workbench UI.
5. Switch Aiva route planning to smart routing after endpoint proves stable.

## Verdict

The system now has routing memory. Provider and artifact logs are no longer just stored; they can be summarized, scored, browsed, and used to avoid repeated failures.