# Incomplete And Blocked

Last audited: 2026-06-18

This document is a human-readable projection of `V1_25_CAPABILITY_PROOF.json`. Do not update its counts independently of the proof harness.

## Current Local Proof Summary

The latest local Codex run has no `.env`, no `DATABASE_URL`, and no local provider credentials. That is expected for this workstation; the VPS must rerun `npx tsx scripts/v1-25-capability-proof.ts` after the env loader fix.

| Status | Count | Meaning |
|---|---:|---|
| `LIVE_PROVEN` | 0 | No local live provider/capability execution proof because env/DB/provider keys are absent locally. |
| `SOURCE_WIRED` | 6 | Source route/contract exists, but live proof requires DB, controlled failure, signed app, or worker/job runtime. |
| `PROVIDER_AVAILABLE` | 0 | No capability is counted as provider-available without route proof in this local run. |
| `BLOCKED` | 19 | Runtime requires provider credentials, DB, signing, adult policy, research provider route, lip-sync adapter, or video project/job state. |
| `NOT_WIRED` | 0 | The current local proof found source paths for V1 capabilities but blocked execution honestly where environment/runtime prerequisites were absent. |

## Source-Wired

| Capability | Exact blocker |
|---|---|
| `summarization` | Dedicated connected-app request schema and normalized result contract are not wired. |
| `translation` | Dedicated connected-app request schema and normalized result contract are not wired. |
| `provider_fallback` | Needs a controlled first-provider failure and second-provider success in the target runtime. |
| `strict_provider_proof_mode` | Needs authenticated server-side invocation in the target environment. |
| `route_outcome_logging` | Needs a DB-backed runtime request and persisted trace/log row. |
| `worker_job_retry_and_polling_completion` | Needs Redis/BullMQ, worker process, actual queued async provider job, and media job persistence. |

## Blocked

| Capability | Exact blocker | Next action |
|---|---|---|
| Provider/model execution family | No configured provider/model route locally for chat, reasoning, coding, embeddings, rerank, image, image edit, video, TTS, STT, image-to-video, avatar image, provider auto-selection, and research. | Rerun on VPS with DB-backed provider keys; inspect model smoke errors for endpoint/body/parser/gated/catalog-only/artifact failures. |
| `agent_request_execution` | Connected-app secret env is missing locally. | Configure `AMARKTAI_CONNECTED_APP_SECRET` or app-specific secret and run signed proof. |
| `connected_app_capability_execution` | Requires active signed app registry entry and signing secret. | Use real registered app/HMAC request; do not fabricate proof. |
| `long_form_multi_scene_video_assembly` | `DATABASE_URL` is required to inspect/create video project jobs. | Rerun on VPS with DB and completed clip/job state. |
| `talking_avatar_video` | No approved Rhubarb/lip-sync binary/service adapter is configured. | Install/configure lip-sync boundary, then prove avatar-video output artifact. |
| `adult_media_policy_gated_generation` | `DATABASE_URL` is required to load adult policy gates; provider approval also required. | Configure explicit adult app policy and approved provider/model before proof. |

## Environment-Blocked In Local No-Credential Proof

The following are blocked locally because no configured provider/model candidate was visible to runtime. On VPS, these must move to `LIVE_PROVEN`, `SOURCE_WIRED`, or a more precise `BLOCKED` reason based on real DB-backed keys and model execution results:

- `chat_text_generation`
- `reasoning`
- `coding_assistant`
- `embeddings`
- `rerank_search_relevance`
- `text_to_image`
- `image_editing_source_transform`
- `text_to_video_short_clip`
- `text_to_speech`
- `speech_to_text`
- `image_to_video`
- `avatar_library_avatar_image_generation`
- `provider_auto_selection`

## Required Truth Rules

- Key present is not provider smoke.
- Provider catalog reachable is not model execution.
- Model execution is not capability route proof.
- Capability route proof is not durable output proof unless required artifacts/preview/download are present.
- Normal chat must not create an artifact by default.
- Dashboard labels must use `LIVE_PROVEN`, `SOURCE_WIRED`, `PROVIDER_AVAILABLE`, `BLOCKED`, and `NOT_WIRED`; no generic green "ready" for source-wired/catalog-only states.
