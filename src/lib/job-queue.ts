/**
 * Job Queue — AmarktAI Network
 *
 * BullMQ-backed background job processing for async tasks like
 * video generation, batch processing, and scheduled operations.
 *
 * When REDIS_URL is not configured, queue operations degrade gracefully
 * (jobs run inline or are skipped) so the platform keeps working.
 *
 * Server-side only.
 */

import type { Queue, Worker, Job } from 'bullmq'
import { getRedisClient } from '@/lib/redis'

// ── Connection config ────────────────────────────────────────────────────────

export function getQueueConnection() {
  const url = process.env.REDIS_URL
  if (!url) return null
  // Parse the Redis URL for BullMQ connection options
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    }
  } catch {
    return null
  }
}

// ── Queue registry ──────────────────────────────────────────────────────────

const _queues = new Map<string, Queue>()

const JOB_QUEUE_NAME = 'amarktai-jobs'

/**
 * Get or create a named queue. Returns `null` if Redis is unavailable.
 */
export function getQueue(name: string = JOB_QUEUE_NAME): Queue | null {
  if (_queues.has(name)) return _queues.get(name)!
  const connection = getQueueConnection()
  if (!connection) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Queue } = require('bullmq') as typeof import('bullmq')
  const queue = new Queue(name, { connection })
  _queues.set(name, queue)
  return queue
}

// ── Job types ───────────────────────────────────────────────────────────────

export type JobType =
  | 'video_generation'
  | 'long_form_video'
  | 'avatar_video'
  | 'adult_media'
  | 'image_batch'
  | 'external_provider_poll'
  | 'batch_inference'
  | 'memory_summarization'
  | 'health_sync'
  | 'budget_reconciliation'
  | 'agent_task'
  | 'daily_learning'
  | 'webhook_delivery'
  | 'music_generation'
  | 'artifact_processing'
  | 'manager_check'

export interface JobPayload {
  type: JobType
  appSlug?: string
  data: Record<string, unknown>
}

/**
 * Enqueue a background job. Returns the job ID or `null` if queuing is unavailable.
 */
export async function enqueueJob(
  payload: JobPayload,
  opts?: {
    delay?: number
    priority?: number
    idempotencyKey?: string
    attempts?: number
    backoffMs?: number
  },
): Promise<string | null> {
  const queue = getQueue(JOB_QUEUE_NAME)
  if (!queue) return null
  try {
    const job = await queue.add(payload.type, payload, {
      delay: opts?.delay,
      priority: opts?.priority,
      jobId: opts?.idempotencyKey?.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120),
      attempts: opts?.attempts ?? 4,
      backoff: { type: 'exponential', delay: opts?.backoffMs ?? 5000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    })
    return job.id ?? null
  } catch (error) {
    console.error('[JobQueue] Enqueue failed:', error)
    return null
  }
}

/**
 * Create a worker that processes jobs from the queue.
 * Returns `null` if Redis is unavailable.
 */
export function createWorker(
  processor: (job: Job<JobPayload>) => Promise<void>,
): Worker | null {
  const connection = getQueueConnection()
  if (!connection) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Worker } = require('bullmq') as typeof import('bullmq')
  const worker = new Worker<JobPayload>(JOB_QUEUE_NAME, processor, {
    connection,
    concurrency: Number(process.env.AMARKTAI_QUEUE_CONCURRENCY || 5),
    limiter: {
      max: Number(process.env.AMARKTAI_QUEUE_RATE_MAX || 20),
      duration: Number(process.env.AMARKTAI_QUEUE_RATE_WINDOW_MS || 1_000),
    },
  })
  worker.on('failed', (job, err) => {
    console.error(`[JobQueue] Job ${job?.id} failed:`, err.message)
  })
  return worker
}

export async function cancelQueuedJob(jobId: string): Promise<boolean> {
  const queue = getQueue(JOB_QUEUE_NAME)
  if (!queue) return false
  const job = await queue.getJob(jobId).catch((error) => {
    console.error('[JobQueue] Failed to load job for cancellation:', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  })
  if (!job) return false
  await job.remove()
  return true
}

export async function withConcurrencyLease<T>(
  input: {
    provider?: string
    appSlug?: string
    capability: string
    limit?: number
    ttlSeconds?: number
  },
  run: () => Promise<T>,
): Promise<T> {
  const redis = getRedisClient()
  if (!redis) return run()
  const key = [
    'amarktai',
    'concurrency',
    input.provider || 'platform',
    input.appSlug || 'platform',
    input.capability,
  ].join(':').replace(/[^a-zA-Z0-9:_-]/g, '-')
  const limit = input.limit ?? Number(process.env.AMARKTAI_PROVIDER_CONCURRENCY || 2)
  const ttl = input.ttlSeconds ?? 1_800
  const current = await redis.incr(key)
  if (current === 1) await redis.expire(key, ttl)
  if (current > limit) {
    await redis.decr(key)
    throw new Error(`Concurrency limit reached for ${input.provider ?? 'provider'}/${input.capability}.`)
  }
  try {
    return await run()
  } finally {
    const remaining = await redis.decr(key).catch(() => 0)
    if (remaining <= 0) await redis.del(key).catch(() => undefined)
  }
}

/**
 * Returns true when the job queue backend is available.
 */
export async function isJobQueueHealthy(): Promise<boolean> {
  const queue = getQueue(JOB_QUEUE_NAME)
  if (!queue) return false
  try {
    await queue.getJobCounts()
    return true
  } catch {
    return false
  }
}

/**
 * Schedule a daily learning job for a specific app agent.
 * Uses BullMQ repeatable jobs. Returns the job ID or null if Redis unavailable.
 */
export async function scheduleDailyLearning(appSlug: string): Promise<string | null> {
  const queue = getQueue(JOB_QUEUE_NAME)
  if (!queue) return null
  try {
    const job = await queue.add(
      'daily_learning',
      { type: 'daily_learning' as JobType, appSlug, data: { triggeredBy: 'scheduler' } },
      {
        repeat: { pattern: '0 3 * * *' }, // 3 AM daily
        jobId: `daily_learning_${appSlug}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    )
    return job.id ?? null
  } catch {
    return null
  }
}

/**
 * Returns detailed queue status for operator visibility.
 */
export async function getQueueStatus(): Promise<{
  healthy: boolean
  backendAvailable: boolean
  counts: Record<string, number>
}> {
  const queue = getQueue(JOB_QUEUE_NAME)
  if (!queue) {
    return { healthy: false, backendAvailable: false, counts: {} }
  }
  try {
    const counts = await queue.getJobCounts() as Record<string, number>
    return { healthy: true, backendAvailable: true, counts }
  } catch {
    return { healthy: false, backendAvailable: true, counts: {} }
  }
}
