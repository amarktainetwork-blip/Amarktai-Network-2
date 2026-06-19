import { getArtifact, type ArtifactRecord } from '@/lib/artifact-store'
import {
  getExecution,
  listExecutions,
  type ExecutionRecord,
} from '@/lib/execution'

export type MediaStudioCapability =
  | 'chat'
  | 'code'
  | 'file_analysis'
  | 'image_generation'
  | 'image_edit'
  | 'suggestive_image'
  | 'music_generation'
  | 'lyrics_generation'
  | 'tts'
  | 'stt'
  | 'video_generation'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'adult_avatar'
  | 'avatar_generation'
  | 'avatar_video'

export interface MediaStudioRunResponse {
  executionId: string
  status: ExecutionRecord['status']
  readiness: string | null
  capability: string
  providerPlan: ExecutionRecord['providerPlan']
  modelPlan: ExecutionRecord['modelPlan']
  approval: ExecutionRecord['approval']
  job: ExecutionRecord['jobs'][number] | null
  jobs: ExecutionRecord['jobs']
  artifacts: ArtifactRecord[]
  result: unknown | null
  evidence: {
    providerCatalogReachable: boolean
    providerSmokePassed: boolean
    modelExecutionPassed: boolean
    capabilityRoutePassed: boolean
    artifactPersisted: boolean
    previewDownloadAvailable: boolean
    requestedDurationSeconds: number | null
    actualDurationSeconds: number | null
    selectedProvider: string | null
    selectedModel: string | null
    providerAttempts: Array<Record<string, unknown>>
    rejectionReasons: Array<{ provider: string; model: string; reason: string }>
    providerDurationCapSeconds: number | null
    artifactId: string | null
    finalLocalUrl: string | null
    toolReadiness: Record<string, unknown> | null
  }
  error: string | null
  execution: ExecutionRecord
}

export async function mediaStudioResponse(
  executionOrId: ExecutionRecord | string,
): Promise<MediaStudioRunResponse | null> {
  const execution = typeof executionOrId === 'string'
    ? getExecution(executionOrId)
    : executionOrId
  if (!execution) return null
  const artifacts = (
    await Promise.all(
      execution.artifacts.map((link) => getArtifact(link.artifactId).catch(() => null)),
    )
  ).filter((artifact): artifact is ArtifactRecord => artifact !== null)
  return {
    executionId: execution.executionId,
    status: execution.status,
    readiness: executionReadiness(execution),
    capability: execution.detectedCapability,
    providerPlan: execution.providerPlan,
    modelPlan: execution.modelPlan,
    approval: execution.approval,
    job: execution.jobs.at(-1) ?? null,
    jobs: execution.jobs,
    artifacts,
    result: execution.result,
    evidence: studioEvidence(execution, artifacts),
    error: execution.error,
    execution,
  }
}

export async function listMediaStudioHistory(limit = 30) {
  const records = listExecutions({ limit: Math.min(Math.max(limit, 1), 100) })
    .filter((execution) =>
      execution.actor.label === 'Media Studio' ||
      execution.input.metadata.source === 'media_studio',
    )
  return (await Promise.all(records.map(mediaStudioResponse))).filter(
    (run): run is MediaStudioRunResponse => run !== null,
  )
}

export function mediaStudioErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/DATABASE_URL|prisma\.(artifact|videoGenerationJob)/i.test(message)) {
    return 'Media metadata storage is not configured.'
  }
  if (/artifact storage is not ready/i.test(message)) {
    return 'Artifact storage is not configured.'
  }
  return message || 'Media Studio execution failed.'
}

function executionReadiness(execution: ExecutionRecord) {
  if (execution.result && typeof execution.result === 'object') {
    const result = execution.result as Record<string, unknown>
    if (typeof result.readiness === 'string') return result.readiness
    const status = String(result.jobStatus ?? result.status ?? '')
    if (status === 'needs_setup') return 'NEEDS_CONFIGURATION'
    if (status === 'blocked') return 'BLOCKED'
    if (status === 'unavailable') return 'UNAVAILABLE'
    if (result.success === true || result.executed === true) return 'READY'
  }
  return execution.status === 'blocked' ? 'BLOCKED' : null
}

function studioEvidence(execution: ExecutionRecord, artifacts: ArtifactRecord[]) {
  const result = execution.result && typeof execution.result === 'object'
    ? execution.result as Record<string, unknown>
    : {}
  const attempts = Array.isArray(result.providerAttempts)
    ? result.providerAttempts.filter((attempt): attempt is Record<string, unknown> =>
      Boolean(attempt) && typeof attempt === 'object',
    )
    : []
  const inputParameters = isRecord(execution.input.metadata.parameters)
    ? execution.input.metadata.parameters
    : {}
  const resultPreviewAvailable = hasString(result.previewUrl)
    || hasString(result.downloadUrl)
    || hasString(result.artifactUrl)
    || hasString(result.mediaUrl)
    || hasString(result.videoUrl)
    || hasString(result.audioUrl)
    || hasString(result.imageUrl)
    || hasString(result.musicUrl)
  return {
    providerCatalogReachable: Boolean(execution.providerPlan.provider || attempts.length),
    providerSmokePassed: attempts.some((attempt) => attempt.status === 'completed') || result.success === true,
    modelExecutionPassed: Boolean(result.success === true && (result.model || execution.modelPlan.model)),
    capabilityRoutePassed: result.success === true || result.executed === true,
    artifactPersisted: artifacts.some((artifact) => artifact.status === 'completed') || hasString(result.artifactId),
    previewDownloadAvailable: artifacts.some((artifact) =>
      artifact.status === 'completed' && Boolean(artifact.previewUrl || artifact.downloadUrl || artifact.storageUrl),
    ) || resultPreviewAvailable,
    requestedDurationSeconds: numberValue(
      result.requestedDurationSeconds
      ?? inputParameters.duration
      ?? execution.input.metadata.duration
      ?? attempts.find((attempt) => numberValue(attempt.requestedDurationSeconds) !== null)?.requestedDurationSeconds,
    ),
    actualDurationSeconds: numberValue(
      result.actualDurationSeconds
      ?? attempts.find((attempt) => numberValue(attempt.actualDurationSeconds) !== null)?.actualDurationSeconds,
    ),
    selectedProvider: stringValue(result.provider) ?? execution.providerPlan.provider,
    selectedModel: stringValue(result.model) ?? execution.modelPlan.model,
    providerAttempts: attempts,
    rejectionReasons: attempts
      .filter((attempt) => hasString(attempt.error))
      .map((attempt) => ({
        provider: stringValue(attempt.provider) ?? 'unknown',
        model: stringValue(attempt.model) ?? 'unknown',
        reason: stringValue(attempt.error) ?? 'unknown',
      })),
    providerDurationCapSeconds: numberValue(
      result.providerLimitSeconds
      ?? attempts.find((attempt) => numberValue(attempt.providerLimitSeconds) !== null)?.providerLimitSeconds,
    ),
    artifactId: stringValue(result.artifactId) ?? artifacts.at(-1)?.id ?? null,
    finalLocalUrl: stringValue(result.storageUrl)
      ?? stringValue(result.artifactUrl)
      ?? artifacts.at(-1)?.storageUrl
      ?? artifacts.at(-1)?.downloadUrl
      ?? null,
    toolReadiness: isRecord(result.toolReadiness) ? result.toolReadiness : null,
  }
}

function hasString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function stringValue(value: unknown): string | null {
  return hasString(value) ? String(value) : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
