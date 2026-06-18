import fs from 'node:fs'
import path from 'node:path'
import type { AiCapabilityDefinition } from '@/lib/brain/v1-capability-matrix'
import type { V1BrainCapabilityRoute } from '@/lib/brain/v1-route-matrix'

export type RuntimeProofStatus =
  | 'LIVE_PROVEN'
  | 'SOURCE_WIRED'
  | 'PROVIDER_AVAILABLE'
  | 'BLOCKED'
  | 'NOT_WIRED'

export interface CapabilityProofRecord {
  capabilityId: string
  status: RuntimeProofStatus | 'BLOCKED_WITH_EXACT_PROVIDER_ERROR' | 'NOT_WIRED_WITH_EXACT_FILE_AND_FIX'
  providerSelected?: string | null
  modelSelected?: string | null
  routeOrAdapter?: string
  exactError?: string | null
  routeFile?: string | null
  sourceFileResponsible?: string | null
}

export interface CapabilityProofReport {
  generatedAt?: string
  capabilities?: CapabilityProofRecord[]
  summary?: Partial<Record<'liveProven' | 'sourceWired' | 'providerAvailable' | 'blocked' | 'notWired', number>>
}

export const PROOF_TO_TAXONOMY: Record<string, string> = {
  chat_text_generation: 'chat',
  reasoning: 'reasoning',
  coding_assistant: 'text_generation',
  web_research: 'research',
  summarization: 'summarization',
  translation: 'translation',
  embeddings: 'embeddings',
  rerank_search_relevance: 'rerank',
  text_to_image: 'text_to_image',
  image_editing_source_transform: 'image_text_to_image',
  text_to_video_short_clip: 'text_to_video',
  text_to_speech: 'text_to_speech',
  speech_to_text: 'automatic_speech_recognition',
  image_to_video: 'image_to_video',
  long_form_multi_scene_video_assembly: 'text_to_video',
  avatar_library_avatar_image_generation: 'avatar_generation',
  talking_avatar_video: 'avatar_video',
  adult_media_policy_gated_generation: 'text_to_image',
  agent_request_execution: 'chat',
  connected_app_capability_execution: 'chat',
  provider_auto_selection: 'chat',
  provider_fallback: 'chat',
  strict_provider_proof_mode: 'chat',
  route_outcome_logging: 'chat',
  worker_job_retry_and_polling_completion: 'text_to_video',
}

const STATUS_PRIORITY: Record<RuntimeProofStatus, number> = {
  LIVE_PROVEN: 5,
  SOURCE_WIRED: 4,
  PROVIDER_AVAILABLE: 3,
  BLOCKED: 2,
  NOT_WIRED: 1,
}

export function normalizeRuntimeProofStatus(status: CapabilityProofRecord['status']): RuntimeProofStatus {
  if (status === 'BLOCKED_WITH_EXACT_PROVIDER_ERROR') return 'BLOCKED'
  if (status === 'NOT_WIRED_WITH_EXACT_FILE_AND_FIX') return 'NOT_WIRED'
  return status
}

export function loadCapabilityProofReport(cwd = process.cwd()): CapabilityProofReport | null {
  const proofPath = path.join(cwd, 'V1_25_CAPABILITY_PROOF.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(proofPath, 'utf8')) as CapabilityProofReport
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function buildCapabilityProofIndex(report: CapabilityProofReport | null) {
  const index = new Map<string, CapabilityProofRecord>()
  for (const proof of report?.capabilities ?? []) {
    const taxonomyId = PROOF_TO_TAXONOMY[proof.capabilityId] ?? proof.capabilityId
    const normalized = normalizeRuntimeProofStatus(proof.status)
    const current = index.get(taxonomyId)
    if (!current || STATUS_PRIORITY[normalized] > STATUS_PRIORITY[normalizeRuntimeProofStatus(current.status)]) {
      index.set(taxonomyId, { ...proof, status: normalized })
    }
  }
  return index
}

export function deriveRuntimeProofStatus(
  capability: AiCapabilityDefinition,
  route: V1BrainCapabilityRoute | undefined,
  proof: CapabilityProofRecord | undefined,
): RuntimeProofStatus {
  if (proof) return normalizeRuntimeProofStatus(proof.status)
  if (route?.readiness === 'blocked' || capability.readiness === 'blocked') return 'BLOCKED'
  if (!capability.adapterImplemented && capability.providerRoutes.length === 0) return 'NOT_WIRED'
  if (!capability.adapterImplemented || !capability.executableEndpoint) return 'PROVIDER_AVAILABLE'
  return 'SOURCE_WIRED'
}

export function summarizeRuntimeProofStatuses(statuses: RuntimeProofStatus[]) {
  return {
    liveProven: statuses.filter((status) => status === 'LIVE_PROVEN').length,
    sourceWired: statuses.filter((status) => status === 'SOURCE_WIRED').length,
    providerAvailable: statuses.filter((status) => status === 'PROVIDER_AVAILABLE').length,
    blocked: statuses.filter((status) => status === 'BLOCKED').length,
    notWired: statuses.filter((status) => status === 'NOT_WIRED').length,
  }
}
