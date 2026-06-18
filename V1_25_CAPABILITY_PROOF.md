# V1 25 Capability Proof

Generated: 2026-06-18T07:36:51.201Z

Database available locally: no
Proof app slug: amarktai-network
Connected-app secret present locally: no

## Summary

- LIVE_PROVEN: 0
- BLOCKED_WITH_EXACT_PROVIDER_ERROR: 10
- NOT_WIRED_WITH_EXACT_FILE_AND_FIX: 15

## Provider Key Path

| Provider | Configured | Masked | Error |
|---|---:|---|---|
| genx | no |  | No credential resolved from integrationConfig/aiProvider/env path. |
| huggingface | no |  | No credential resolved from integrationConfig/aiProvider/env path. |
| qwen | no |  | No credential resolved from integrationConfig/aiProvider/env path. |
| mimo | no |  | No credential resolved from integrationConfig/aiProvider/env path. |
| groq | no |  | No credential resolved from integrationConfig/aiProvider/env path. |
| together | no |  | No credential resolved from integrationConfig/aiProvider/env path. |

## Provider Discovery

| Provider | Status | Models | Image | Video | I2V | TTS | STT | Embeddings | Rerank | Error |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| mimo | not_configured | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Provider credential is not configured. |
| genx | not_configured | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Provider credential is not configured. |
| huggingface | ready | 100 | 50 | 9 | 4 | 5 | 2 | 6 | 0 |  |
| qwen | not_configured | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Provider credential is not configured. |
| together | not_configured | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Provider credential is not configured. |
| groq | not_configured | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Provider credential is not configured. |

## Capabilities

| Capability | Status | Provider | Model | Route/Adapter | Artifact | Job | Poll | Error | Source File |
|---|---|---|---|---|---|---|---|---|---|
| chat_text_generation | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:chat |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| reasoning | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:reasoning |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| coding_assistant | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:code |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| web_research | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | researchRuntime.execute |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| summarization | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/admin/provider-capability-test |  |  |  | A dedicated connected-app request schema and normalized result contract are not wired. |  |
| translation | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/admin/provider-capability-test |  |  |  | A dedicated connected-app request schema and normalized result contract are not wired. |  |
| embeddings | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:embeddings |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| rerank_search_relevance | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:rerank |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| text_to_image | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:image_generation |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| image_editing_source_transform | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:image_edit |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| text_to_video_short_clip | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:video_generation |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| text_to_speech | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:tts |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| speech_to_text | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:stt |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| agent_request_execution | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/brain/agent-request |  |  |  | Execution failed. |  |
| connected_app_capability_execution | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | executeConnectedAppCapability |  |  |  | Connected-app live proof requires an active signed app registry entry and signing secret env for that app; this harness does not fabricate HMAC identity. |  |
| image_to_video | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:image_to_video |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| long_form_multi_scene_video_assembly | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/admin/video-projects |  |  |  | 
Invalid `prisma.controlPlaneJob.findMany()` invocation in
C:\Users\digit\Code\Amarktai-Network-2\src\lib\control-plane-jobs.ts:234:33

  231 }
  232 
  233 export async function listControlPlaneJobs(limit = 100) {
→ 234   return prisma.controlPlaneJob.findMany(
error: Environment variable not found: DATABASE_URL.
  -->  schema.prisma:7
   | 
 6 |   provider = "mysql"
 7 |   url      = env("DATABASE_URL")
   | 

Validation Error Count: 1 |  |
| avatar_library_avatar_image_generation | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:avatar_generation |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| talking_avatar_video | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | talking-avatar video |  |  |  | avatar_video hard-stops with NEEDS_CONFIGURATION; no approved lip-sync adapter is wired. | src/lib/orchestrator.ts |
| adult_media_policy_gated_generation | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | executeCapability:adult_image |  |  |  | 
Invalid `prisma.appAiProfile.findUnique()` invocation in
C:\Users\digit\Code\Amarktai-Network-2\src\lib\adult-app-capabilities.ts:46:41

  43 
  44 export async function getAdultAppCapabilityProfile(appSlug: string): Promise<AdultAppCapabilityProfile> {
  45   await loadGlobalAdultModeFromDB()
→ 46   const row = await prisma.appAiProfile.findUnique(
error: Environment variable not found: DATABASE_URL.
  -->  schema.prisma:7
   | 
 6 |   provider = "mysql"
 7 |   url      = env("DATABASE_URL")
   | 

Validation Error Count: 1 |  |
| provider_auto_selection | NOT_WIRED_WITH_EXACT_FILE_AND_FIX |  |  | executeCapability:chat |  |  |  | NO_ROUTE_FOUND: No configured provider returned a discovered model with model metadata or provider-contract evidence for this request. | src/lib/orchestrator.ts |
| provider_fallback | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | executeCapabilityOrchestration fallback loop |  |  |  | Fallback proof requires a controlled first-provider failure and second-provider success in the target runtime environment; this harness does not inject failures into live providers. |  |
| strict_provider_proof_mode | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/admin/provider-capability-test |  |  |  | Strict provider proof mode is represented by single-provider admin proof surfaces; live proof requires authenticated server-side invocation in the target environment. |  |
| route_outcome_logging | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | logRouteOutcome/capability-tracing |  |  |  | Outcome logging is wired in source, but live proof requires a DB-backed runtime request and persisted trace/log row inspection in the target environment. |  |
| worker_job_retry_and_polling_completion | BLOCKED_WITH_EXACT_PROVIDER_ERROR |  |  | /api/brain/media-jobs/[jobId] + control-plane-jobs |  |  |  | Polling and retry code is wired, but live proof requires an actual queued async provider job plus Redis/BullMQ and media job persistence in the target environment. |  |

## VPS Command

- 
	
	
	DATABASE_URL="<production mysql url>" npx tsx scripts/v1-25-capability-proof.ts