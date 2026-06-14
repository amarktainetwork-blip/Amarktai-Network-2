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
