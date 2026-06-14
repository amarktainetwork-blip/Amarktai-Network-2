import { prisma } from '@/lib/prisma'
import { getQueue, type JobPayload, type JobType } from '@/lib/job-queue'

export type ControlPlaneJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled'

export interface CreateControlPlaneJobInput {
  idempotencyKey?: string
  appSlug: string
  requestedCapability: string
  canonicalCapability: string
  jobType: JobType
  selectedRoute?: Record<string, unknown>
  metadata?: Record<string, unknown>
  estimatedCostCents?: number
  queueData?: Record<string, unknown>
  queue?: boolean
}

export async function createControlPlaneJob(input: CreateControlPlaneJobInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.controlPlaneJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { attempts: { orderBy: { sequence: 'asc' } } },
    })
    if (existing) return existing
  }

  const job = await prisma.controlPlaneJob.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      appSlug: input.appSlug,
      requestedCapability: input.requestedCapability,
      canonicalCapability: input.canonicalCapability,
      jobType: input.jobType,
      selectedRoute: JSON.stringify(input.selectedRoute ?? {}),
      metadata: JSON.stringify(input.metadata ?? {}),
      estimatedCostCents: input.estimatedCostCents ?? 0,
      status: input.queue === false ? 'processing' : 'queued',
      startedAt: input.queue === false ? new Date() : null,
    },
    include: { attempts: true },
  })
  if (input.queue === false) return job

  const queue = getQueue()
  if (!queue) {
    return prisma.controlPlaneJob.update({
      where: { id: job.id },
      data: {
        status: 'blocked',
        errorCategory: 'queue_unavailable',
        errorMessage: 'Redis/BullMQ is not configured. Configure REDIS_URL, then retry this durable job.',
      },
      include: { attempts: true },
    })
  }

  const payload: JobPayload = {
    type: input.jobType,
    appSlug: input.appSlug,
    data: { ...(input.queueData ?? {}), controlPlaneJobId: job.id },
  }
  try {
    const queued = await queue.add(input.jobType, payload, {
      jobId: input.idempotencyKey
        ? stableQueueId(input.idempotencyKey)
        : job.id,
      attempts: 4,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    })
    return prisma.controlPlaneJob.update({
      where: { id: job.id },
      data: { queueJobId: queued.id ?? null },
      include: { attempts: { orderBy: { sequence: 'asc' } } },
    })
  } catch (error) {
    return prisma.controlPlaneJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorCategory: 'queue_enqueue_failed',
        errorMessage: error instanceof Error ? error.message : 'BullMQ enqueue failed.',
        completedAt: new Date(),
      },
      include: { attempts: true },
    })
  }
}

export async function startControlPlaneAttempt(input: {
  jobId: string
  provider: string
  model: string
  adapter: string
  outputType: string
  requestMetadata?: Record<string, unknown>
  estimatedCostCents?: number
}) {
  const sequence = await prisma.controlPlaneAttempt.count({ where: { jobId: input.jobId } }) + 1
  const attempt = await prisma.controlPlaneAttempt.create({
    data: {
      jobId: input.jobId,
      sequence,
      provider: input.provider,
      model: input.model,
      adapter: input.adapter,
      outputType: input.outputType,
      status: 'processing',
      requestMetadata: JSON.stringify(input.requestMetadata ?? {}),
      estimatedCostCents: input.estimatedCostCents ?? 0,
      startedAt: new Date(),
    },
  })
  await prisma.controlPlaneJob.update({
    where: { id: input.jobId },
    data: {
      status: 'processing',
      activeAttemptId: attempt.id,
      startedAt: new Date(),
    },
  })
  return attempt
}

export async function finishControlPlaneAttempt(input: {
  attemptId: string
  status: 'processing' | 'completed' | 'failed' | 'blocked'
  providerJobId?: string | null
  pollUrl?: string | null
  latencyMs?: number
  charged?: boolean
  errorCategory?: string | null
  errorMessage?: string | null
  responseMetadata?: Record<string, unknown>
  artifactId?: string | null
}) {
  const attempt = await prisma.controlPlaneAttempt.update({
    where: { id: input.attemptId },
    data: {
      status: input.status,
      providerJobId: input.providerJobId,
      pollUrl: input.pollUrl,
      latencyMs: input.latencyMs,
      charged: input.charged ?? false,
      errorCategory: input.errorCategory,
      errorMessage: input.errorMessage,
      responseMetadata: JSON.stringify(input.responseMetadata ?? {}),
      completedAt: input.status === 'processing' ? null : new Date(),
    },
  })
  const attempts = await prisma.controlPlaneAttempt.findMany({
    where: { jobId: attempt.jobId },
    orderBy: { sequence: 'asc' },
  })
  const providerJobIds = attempts.flatMap((entry) => entry.providerJobId ? [entry.providerJobId] : [])
  const pollUrls = attempts.flatMap((entry) => entry.pollUrl ? [entry.pollUrl] : [])
  const anyAlive = attempts.some((entry) => ['queued', 'processing'].includes(entry.status))
  const winner = attempts.findLast((entry) => entry.status === 'completed')
  const allTerminal = attempts.length > 0 && attempts.every((entry) =>
    ['completed', 'failed', 'blocked'].includes(entry.status),
  )
  const status: ControlPlaneJobStatus = winner
    ? 'completed'
    : anyAlive
      ? 'processing'
      : allTerminal
        ? 'failed'
        : 'processing'
  return prisma.controlPlaneJob.update({
    where: { id: attempt.jobId },
    data: {
      status,
      activeAttemptId: anyAlive ? attempt.id : null,
      finalAttemptId: winner?.id ?? null,
      providerJobIds: JSON.stringify(providerJobIds),
      pollUrls: JSON.stringify(pollUrls),
      artifactId: input.artifactId ?? undefined,
      charged: attempts.some((entry) => entry.charged),
      errorCategory: status === 'failed' ? input.errorCategory : null,
      errorMessage: status === 'failed' ? input.errorMessage : null,
      progress: status === 'completed' ? 100 : status === 'processing' ? 25 : 0,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
    },
    include: { attempts: { orderBy: { sequence: 'asc' } } },
  })
}

export async function requestControlPlaneJobCancellation(id: string) {
  const job = await prisma.controlPlaneJob.findUnique({ where: { id } })
  if (!job) return null
  if (job.queueJobId) {
    const queue = getQueue()
    const queued = queue ? await queue.getJob(job.queueJobId).catch((error) => {
      console.error('[control-plane-jobs] Failed to load BullMQ job for cancellation:', {
        controlPlaneJobId: id,
        queueJobId: job.queueJobId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }) : null
    if (queued) {
      await queued.remove().catch((error) => {
        console.error('[control-plane-jobs] Failed to remove BullMQ job:', {
          controlPlaneJobId: id,
          queueJobId: job.queueJobId,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      })
    }
  }
  return prisma.controlPlaneJob.update({
    where: { id },
    data: {
      cancelRequested: true,
      status: 'cancelled',
      completedAt: new Date(),
      errorCategory: 'cancelled_by_operator',
      errorMessage: 'Cancelled by an administrator.',
    },
    include: { attempts: { orderBy: { sequence: 'asc' } } },
  })
}

export async function listControlPlaneJobs(limit = 100) {
  return prisma.controlPlaneJob.findMany({
    take: Math.min(Math.max(limit, 1), 500),
    orderBy: { createdAt: 'desc' },
    include: { attempts: { orderBy: { sequence: 'asc' } } },
  })
}

function stableQueueId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120)
}
