import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVaultApiKey } from '@/lib/brain'
import { getGenXJobStatus } from '@/lib/genx-client'
import { dispatchEvent } from '@/lib/webhook-manager'
import { createArtifact } from '@/lib/artifact-store'
import { recordExecutionResponse } from '@/lib/execution'
import { finishControlPlaneAttempt } from '@/lib/control-plane-jobs'
import { recordCapabilityTrace } from '@/lib/capability-tracing'

const MAX_PROCESSING_MS = 15 * 60 * 1000

// Legacy compatibility route. Apps should poll `/api/brain/media-jobs/:jobId`.

async function pollQwenWanJob(providerJobId: string, apiKey: string) {
  const taskId = providerJobId.replace(/^qwen-wan:/, '')
  if (!taskId) throw new Error('Invalid Qwen Wan provider job ID.')
  const response = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Qwen Wan poll returned HTTP ${response.status}.`)
  const data = await response.json() as {
    output?: {
      task_status?: string
      video_url?: string
      results?: Array<{ url?: string; video_url?: string }>
      message?: string
    }
  }
  if (data.output?.task_status === 'SUCCEEDED') {
    return {
      status: 'succeeded',
      resultUrl: data.output.video_url ?? data.output.results?.[0]?.video_url ?? data.output.results?.[0]?.url,
    }
  }
  if (data.output?.task_status === 'FAILED') {
    return { status: 'failed', error: data.output.message ?? 'Qwen Wan video generation failed.' }
  }
  return { status: 'processing' }
}

function capabilityFor(resultMeta: string | null) {
  try {
    const parsed = JSON.parse(resultMeta ?? '{}') as { capability?: string }
    return parsed.capability === 'adult_video' ? 'adult_video' : 'video_generation'
  } catch {
    return 'video_generation'
  }
}

function executionIdFor(resultMeta: string | null) {
  try {
    const parsed = JSON.parse(resultMeta ?? '{}') as { executionId?: string }
    return typeof parsed.executionId === 'string' ? parsed.executionId : undefined
  } catch {
    return undefined
  }
}

function controlPlaneFor(resultMeta: string | null) {
  try {
    const parsed = JSON.parse(resultMeta ?? '{}') as {
      controlPlaneJobId?: string
      controlPlaneAttemptId?: string
    }
    return {
      jobId: typeof parsed.controlPlaneJobId === 'string' ? parsed.controlPlaneJobId : undefined,
      attemptId: typeof parsed.controlPlaneAttemptId === 'string' ? parsed.controlPlaneAttemptId : undefined,
    }
  } catch {
    return {}
  }
}

async function ensureVideoArtifact(job: {
  id: string
  appSlug: string | null
  provider: string
  modelId: string
  prompt: string
  resultUrl: string | null
  resultMeta: string | null
}) {
  if (!job.resultUrl) return { artifactId: null, storageUrl: null, artifactError: null }
  const traceId = `video-job-${job.id}`
  try {
    const existing = await prisma.artifact.findFirst({
      where: { traceId, type: 'video' },
      select: { id: true, storageUrl: true },
    })
    if (existing) return { artifactId: existing.id, storageUrl: existing.storageUrl, artifactError: null }
    const artifact = await createArtifact({
      appSlug: job.appSlug ?? 'amarktai-network',
      executionId: executionIdFor(job.resultMeta),
      jobId: job.id,
      type: 'video',
      subType: capabilityFor(job.resultMeta),
      capability: capabilityFor(job.resultMeta),
      title: `Video generation ${job.id}`,
      description: job.prompt,
      provider: job.provider,
      model: job.modelId,
      traceId,
      mimeType: 'video/mp4',
      contentUrl: job.resultUrl,
      allowRemoteReference: true,
      metadata: { capability: capabilityFor(job.resultMeta), jobId: job.id },
    })
    return { artifactId: artifact.id, storageUrl: artifact.storageUrl, artifactError: null }
  } catch (error) {
    return {
      artifactId: null,
      storageUrl: null,
      artifactError: error instanceof Error ? error.message : 'Video artifact persistence failed.',
    }
  }
}

async function reconcileControlPlaneJob(
  job: {
    id: string
    status: string
    appSlug: string | null
    provider: string
    modelId: string
    providerJobId: string | null
    resultUrl: string | null
    resultMeta: string | null
    errorMessage: string | null
  },
  artifact?: { artifactId: string | null },
) {
  const controlPlane = controlPlaneFor(job.resultMeta)
  if (!controlPlane.attemptId) return

  await finishControlPlaneAttempt({
    attemptId: controlPlane.attemptId,
    status: job.status === 'succeeded'
      ? 'completed'
      : job.status === 'failed'
        ? 'failed'
        : 'processing',
    providerJobId: job.providerJobId,
    pollUrl: `/api/brain/video-generate/${job.id}`,
    charged: true,
    artifactId: artifact?.artifactId,
    errorCategory: job.status === 'failed' ? 'provider_job_failed' : null,
    errorMessage: job.errorMessage,
    responseMetadata: { resultUrl: job.resultUrl },
  })
  await recordCapabilityTrace({
    jobId: controlPlane.jobId,
    appSlug: job.appSlug ?? 'amarktai-network',
    adultModeState: capabilityFor(job.resultMeta) === 'adult_video' ? 'enabled' : 'off',
    capability: capabilityFor(job.resultMeta),
    eventType: `video.poll.${job.status}`,
    selectedRoute: { provider: job.provider, model: job.modelId },
    providerJobId: job.providerJobId ?? undefined,
    artifactId: artifact?.artifactId ?? undefined,
    errorCategory: job.status === 'failed' ? 'provider_job_failed' : undefined,
    payload: { videoGenerationJobId: job.id, resultUrl: job.resultUrl },
  })
}

function responsePayload(
  job: {
    id: string
    status: string
    provider: string
    modelId: string
    prompt: string
    resultUrl: string | null
    resultMeta: string | null
    errorMessage: string | null
    createdAt: Date
    updatedAt: Date
  },
  artifact = { artifactId: null as string | null, storageUrl: null as string | null, artifactError: null as string | null },
) {
  const error = job.errorMessage ?? artifact.artifactError
  return {
    success: job.status === 'succeeded' && Boolean(job.resultUrl) && !artifact.artifactError,
    executed: job.status === 'succeeded' && Boolean(job.resultUrl) && !artifact.artifactError,
    capability: capabilityFor(job.resultMeta),
    provider: job.provider,
    model: job.modelId,
    jobStatus: job.status,
    artifactId: artifact.artifactId,
    storageUrl: artifact.storageUrl ?? job.resultUrl,
    error: error ?? null,
    blocker: error ?? null,
    jobId: job.id,
    pollUrl: `/api/brain/video-generate/${job.id}`,
    controlPlaneJobId: controlPlaneFor(job.resultMeta).jobId ?? null,
    status: job.status,
    resultUrl: job.resultUrl,
    prompt: job.prompt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({
      success: false, executed: false, capability: 'video_generation', provider: null, model: null,
      jobStatus: 'blocked', artifactId: null, storageUrl: null, error: 'jobId is required', blocker: 'jobId is required',
    }, { status: 400 })
  }

  const job = await prisma.videoGenerationJob.findUnique({ where: { id: jobId } })
  if (!job) {
    return NextResponse.json({
      success: false, executed: false, capability: 'video_generation', provider: null, model: null,
      jobStatus: 'failed', artifactId: null, storageUrl: null, error: 'Job not found', blocker: 'Job not found',
    }, { status: 404 })
  }

  if (job.status === 'succeeded' || job.status === 'failed') {
    const artifact = job.status === 'succeeded' ? await ensureVideoArtifact(job) : undefined
    await reconcileControlPlaneJob(job, artifact)
    const payload = responsePayload(job, artifact)
    reconcileVideoExecution(job.resultMeta, payload)
    return NextResponse.json(payload)
  }

  if (Date.now() - job.createdAt.getTime() > MAX_PROCESSING_MS) {
    const updated = await prisma.videoGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: `Video provider did not complete within ${Math.round(MAX_PROCESSING_MS / 60_000)} minutes.`,
      },
    })
    await reconcileControlPlaneJob(updated)
    const payload = responsePayload(updated)
    reconcileVideoExecution(updated.resultMeta, payload)
    return NextResponse.json(payload)
  }

  let update: { status: string; resultUrl?: string; error?: string } | null = null
  try {
    if (job.provider === 'genx' && job.providerJobId) {
      if (job.providerJobId.startsWith('genx-sync:')) {
        update = { status: 'succeeded', resultUrl: job.providerJobId.slice('genx-sync:'.length) }
      } else {
        const providerResult = await getGenXJobStatus(job.providerJobId.replace(/^genx-job:/, ''))
        if (providerResult) {
          update = {
            status: providerResult.status === 'completed'
              ? 'succeeded'
              : providerResult.status === 'failed'
                ? 'failed'
                : 'processing',
            resultUrl: providerResult.resultUrl ?? undefined,
            error: providerResult.error,
          }
        }
      }
    } else if (job.provider === 'qwen' && job.providerJobId) {
      const apiKey = await getVaultApiKey('qwen')
      update = apiKey
        ? await pollQwenWanJob(job.providerJobId, apiKey)
        : { status: 'failed', error: 'Qwen API key is missing.' }
    } else if (job.provider === 'together') {
      update = { status: 'failed', error: 'Legacy Together video jobs used an image endpoint and are not valid video outputs.' }
    } else {
      update = { status: 'failed', error: `Provider "${job.provider}" is not in the canonical video route.` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider polling temporarily unavailable.'
    const stale = Date.now() - job.createdAt.getTime() > MAX_PROCESSING_MS / 2
    if (stale) {
      const updated = await prisma.videoGenerationJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: message },
      })
      await reconcileControlPlaneJob(updated)
      return NextResponse.json(responsePayload(updated))
    }
    return NextResponse.json({
      ...responsePayload(job),
      blocker: message,
      error: message,
    })
  }

  if (!update) return NextResponse.json(responsePayload(job))

  const updated = await prisma.videoGenerationJob.update({
    where: { id: jobId },
    data: {
      status: update.status,
      resultUrl: update.resultUrl ?? job.resultUrl,
      errorMessage: update.error ?? job.errorMessage,
    },
  })

  if (['succeeded', 'failed'].includes(updated.status) && updated.appSlug) {
    dispatchEvent(
      updated.appSlug,
      updated.status === 'succeeded' ? 'video.generation.completed' : 'video.generation.failed',
      {
        jobId: updated.id,
        status: updated.status,
        provider: updated.provider,
        model: updated.modelId,
        resultUrl: updated.resultUrl,
        errorMessage: updated.errorMessage,
      },
    ).catch((error) => {
      console.error('[video-generate] webhook dispatch failed', {
        jobId: updated.id,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  const artifact = updated.status === 'succeeded' ? await ensureVideoArtifact(updated) : undefined
  await reconcileControlPlaneJob(updated, artifact)
  const payload = responsePayload(updated, artifact)
  reconcileVideoExecution(updated.resultMeta, payload)
  return NextResponse.json(payload)
}

function reconcileVideoExecution(resultMeta: string | null, payload: Record<string, unknown>) {
  const executionId = executionIdFor(resultMeta)
  if (executionId && ['succeeded', 'failed'].includes(String(payload.jobStatus))) {
    recordExecutionResponse(executionId, payload)
  }
}
