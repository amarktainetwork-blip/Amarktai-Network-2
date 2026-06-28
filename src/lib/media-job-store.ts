import { getGenXJobStatus } from '@/lib/genx-client'
import {
  appendRecord,
  findRecord,
  generateId,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { recordProviderResult } from '@/lib/provider-result-log'

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
    return saveJob(job, {
      status: 'failed',
      error: `Media provider did not complete within ${Math.round(MAX_PROCESSING_MS / 60_000)} minutes.`,
      completedAt: new Date().toISOString(),
    })
  }

  if (job.provider !== 'genx') {
    return saveJob(job, {
      status: 'failed',
      error: `Provider "${job.provider}" does not have a local media polling contract.`,
      completedAt: new Date().toISOString(),
    })
  }

  const providerResult = await getGenXJobStatus(job.providerJobId)
  if (!providerResult) return job
  if (providerResult.status === 'failed') {
    return saveJob(job, {
      status: 'failed',
      error: providerResult.error ?? 'Media provider job failed.',
      completedAt: new Date().toISOString(),
    })
  }
  if (!['completed', 'succeeded'].includes(providerResult.status)) {
    return saveJob(job, { status: 'processing', error: null })
  }
  if (!providerResult.resultUrl) {
    return saveJob(job, {
      status: 'failed',
      error: 'Media provider reported completion without a usable media URL.',
      completedAt: new Date().toISOString(),
    })
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
      metadata: {
        ...job.metadata,
        capability: job.capability,
        localJobId: job.id,
      },
    })
    await recordProviderResult({
      appSlug: job.appSlug,
      provider: job.provider,
      model: job.model,
      capability: job.capability,
      success: Boolean(persisted.artifactId),
      executed: Boolean(persisted.artifactId),
      latencyMs: 0,
      contentType: job.type,
      artifactId: persisted.artifactId ?? undefined,
      artifactPath: persisted.storageUrl ?? undefined,
      metadata: {
        source: 'media_job_poll',
        localJobId: job.id,
        providerJobId: job.providerJobId,
        proofStatus: persisted.artifactId ? 'passed' : 'failed',
      },
    }).catch(() => null)
    return saveJob(job, {
      status: 'completed',
      artifactId: persisted.artifactId,
      storageUrl: persisted.storageUrl,
      mediaUrl: persisted.mediaUrl,
      error: null,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    return saveJob(job, {
      status: 'failed',
      error: `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      completedAt: new Date().toISOString(),
    })
  }
}

export function localMediaJobResponse(job: LocalMediaJob) {
  const completed = job.status === 'completed' && Boolean(job.artifactId && (job.storageUrl || job.mediaUrl))
  const trackable = job.status === 'queued' || job.status === 'processing'
  const pollUrl = `/api/brain/media-jobs/${job.id}`
  const proofStatus = completed ? 'passed' : trackable ? 'processing' : 'failed'
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
    storageUrl: job.storageUrl,
    mediaUrl: job.mediaUrl,
    imageUrl: job.type === 'image' ? job.mediaUrl : null,
    audioUrl: job.type === 'audio' || job.type === 'music' ? job.mediaUrl : null,
    musicUrl: job.type === 'music' ? job.mediaUrl : null,
    videoUrl: job.type === 'video' ? job.mediaUrl : null,
    error: job.error,
    blocker: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    proof: {
      capability: job.capability,
      provider: job.provider,
      model: job.model,
      route: pollUrl,
      artifactId: job.artifactId,
      jobId: job.id,
      providerJobId: job.providerJobId,
      timestamp: job.updatedAt,
      proofStatus,
      error: job.error,
    },
    job,
  }
}
