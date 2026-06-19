import { getGenXJobStatus } from '@/lib/genx-client'
import { pollQwenWanxTask } from '@/lib/qwen-wanx-polling'
import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import {
  getProviderCapabilityAdapter,
  providerHasCanonicalPollingContract,
} from '@/lib/ai-capability-adapters'
import {
  appendRecord,
  findRecord,
  generateId,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'

export type LocalMediaJobStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type LocalMediaType = 'image' | 'audio' | 'music' | 'video'

export interface LocalMediaJob {
  id: string
  capability: string
  appSlug: string
  type: LocalMediaType
  subType: string
  title: string
  description: string
  prompt: string
  provider: string
  model: string
  providerJobId: string
  status: LocalMediaJobStatus
  artifactId: string | null
  storageUrl: string | null
  mediaUrl: string | null
  error: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface CreateLocalMediaJobInput {
  capability: string
  appSlug: string
  type: LocalMediaType
  subType: string
  title: string
  description?: string
  prompt: string
  provider: string
  model: string
  providerJobId: string
  metadata?: Record<string, unknown>
}

const MAX_PROCESSING_MS = 15 * 60 * 1000

export function createLocalMediaJob(input: CreateLocalMediaJobInput): LocalMediaJob {
  const now = new Date().toISOString()
  const job = appendRecord<LocalMediaJob>(LOCAL_STORE_FILES.mediaJobs, {
    id: generateId(),
    ...input,
    description: input.description ?? input.prompt,
    status: 'processing',
    artifactId: null,
    storageUrl: null,
    mediaUrl: null,
    error: null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  })
  if (!getLocalMediaJob(job.id)) throw new Error('Local media job storage is unavailable.')
  return job
}

export function getLocalMediaJob(jobId: string): LocalMediaJob | null {
  return findRecord<LocalMediaJob>(LOCAL_STORE_FILES.mediaJobs, jobId)
}

function saveJob(job: LocalMediaJob, updates: Partial<Omit<LocalMediaJob, 'id'>>) {
  return updateRecord<LocalMediaJob>(LOCAL_STORE_FILES.mediaJobs, job.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function pollLocalMediaJob(jobId: string): Promise<LocalMediaJob | null> {
  const job = getLocalMediaJob(jobId)
  if (!job || job.status === 'completed' || job.status === 'failed') return job

  if (Date.now() - new Date(job.createdAt).getTime() > MAX_PROCESSING_MS) {
    const failed = saveJob(job, {
      status: 'failed',
      error: `Media provider did not complete within ${Math.round(MAX_PROCESSING_MS / 60_000)} minutes.`,
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(failed)
    return failed
  }

  if (!providerHasCanonicalPollingContract(job.provider as 'genx' | 'qwen' | 'together')) {
    const failed = saveJob(job, {
      status: 'failed',
      error: `Provider "${job.provider}" does not have a local media polling contract.`,
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(failed)
    return failed
  }

  const providerResult = job.provider === 'qwen'
    ? await qwenJobStatus(job.providerJobId, job.model)
    : job.provider === 'genx'
      ? await getGenXJobStatus(job.providerJobId)
      : await togetherJobStatus(job)
  if (!providerResult) return job
  if (providerResult.status === 'failed') {
    const failed = saveJob(job, {
      status: 'failed',
      error: providerResult.error ?? 'Media provider job failed.',
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(failed)
    return failed
  }
  if (!['completed', 'succeeded'].includes(providerResult.status)) {
    return saveJob(job, { status: 'processing', error: null })
  }
  if (!providerResult.resultUrl) {
    const failed = saveJob(job, {
      status: 'failed',
      error: 'Media provider reported completion without a usable media URL.',
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(failed)
    return failed
  }

  try {
    const persisted = await persistCanonicalMediaResult({
      result: {
        resultUrl: providerResult.resultUrl,
        providerJobId: job.providerJobId,
        status: providerResult.status,
      },
      appSlug: job.appSlug,
      type: job.type,
      subType: job.subType,
      title: job.title,
      description: job.description,
      provider: job.provider,
      model: job.model,
      traceId: `media-job-${job.id}`,
      jobId: job.id,
      metadata: {
        ...job.metadata,
        capability: job.capability,
        localJobId: job.id,
      },
    })
    const completed = saveJob(job, {
      status: 'completed',
      artifactId: persisted.artifactId,
      storageUrl: persisted.storageUrl,
      mediaUrl: persisted.mediaUrl,
      error: null,
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(completed)
    return completed
  } catch (error) {
    const failed = saveJob(job, {
      status: 'failed',
      error: `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      completedAt: new Date().toISOString(),
    })
    void reconcileExecution(failed)
    return failed
  }
}

async function qwenJobStatus(providerJobId: string, model: string) {
  const taskId = providerJobId.replace(/^qwen-wan:/, '')
  const result = await pollQwenWanxTask({ taskId, model })
  if (!result.ok) {
    return { status: 'failed', resultUrl: null, error: result.error ?? 'Qwen task polling failed.' }
  }
  const payload = result.json as Record<string, unknown> | undefined
  const output = record(payload?.output)
  const status = String(output?.task_status ?? output?.status ?? 'processing').toLowerCase()
  const resultUrl = nestedUrl(output)
  return {
    status: ['succeeded', 'completed', 'success'].includes(status) ? 'completed'
      : ['failed', 'canceled', 'cancelled'].includes(status) ? 'failed'
        : 'processing',
    resultUrl,
    error: status === 'failed' ? String(output?.message ?? 'Qwen task failed.') : null,
  }
}

async function togetherJobStatus(job: LocalMediaJob) {
  const adapter = getProviderCapabilityAdapter('together')
  const capability = getCapabilityDefinition('text_to_video')
  const route = capability?.providerRoutes.find((entry) => entry.provider === 'together')
  if (!adapter?.poll || !capability || !route) {
    return { status: 'failed', resultUrl: null, error: 'Together local media polling is not available.' }
  }

  const result = await adapter.poll(job.providerJobId, {
    capability,
    route,
    prompt: job.prompt,
    text: job.prompt,
    inputs: job.metadata,
    references: [],
    context: {
      appId: job.appSlug,
    },
    model: job.model,
  })
  return {
    status: result.status === 'completed'
      ? 'completed'
      : result.status === 'failed'
        ? 'failed'
        : 'processing',
    resultUrl: result.mediaUrl,
    error: result.error,
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nestedUrl(output: Record<string, unknown> | null): string | null {
  if (!output) return null
  for (const value of [output.video_url, output.url]) {
    if (typeof value === 'string' && value) return value
  }
  const results = Array.isArray(output.results) ? output.results : []
  for (const item of results) {
    const row = record(item)
    for (const value of [row?.url, row?.video_url]) {
      if (typeof value === 'string' && value) return value
    }
  }
  return null
}

async function reconcileExecution(job: LocalMediaJob | null) {
  const executionId = typeof job?.metadata.executionId === 'string'
    ? job.metadata.executionId
    : null
  if (!job || !executionId || !['completed', 'failed'].includes(job.status)) return
  const { recordExecutionResponse } = await import('@/lib/execution')
  recordExecutionResponse(executionId, localMediaJobResponse(job))
}

export function localMediaJobResponse(job: LocalMediaJob) {
  const completed = job.status === 'completed'
    && Boolean(job.artifactId && job.storageUrl?.startsWith('/api/artifacts/file/'))
  const trackable = job.status === 'queued' || job.status === 'processing'
  const pollUrl = `/api/brain/media-jobs/${job.id}`
  const artifactUrl = job.artifactId ? `/api/admin/artifacts/${encodeURIComponent(job.artifactId)}/download` : null
  const previewUrl = completed ? artifactUrl : null
  const downloadUrl = completed ? artifactUrl : null
  const playableUrl = completed ? artifactUrl : null
  return {
    success: completed || trackable,
    executed: completed || trackable,
    capability: job.capability,
    provider: job.provider,
    model: job.model,
    jobStatus: job.status,
    status: job.status,
    jobId: job.id,
    providerJobId: job.providerJobId,
    pollUrl,
    artifactId: job.artifactId,
    artifactUrl,
    previewUrl,
    downloadUrl,
    storageUrl: job.storageUrl,
    mediaUrl: playableUrl,
    imageUrl: job.type === 'image' ? playableUrl : null,
    audioUrl: job.type === 'audio' || job.type === 'music' ? playableUrl : null,
    musicUrl: job.type === 'music' ? playableUrl : null,
    videoUrl: job.type === 'video' ? playableUrl : null,
    error: job.error,
    blocker: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    job,
  }
}
