import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGenXJobStatus } from '@/lib/genx-client'
import { dispatchEvent } from '@/lib/webhook-manager'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'

const MAX_PROCESSING_MS = 15 * 60 * 1000

function capabilityFor(resultMeta: string | null) {
  try {
    const parsed = JSON.parse(resultMeta ?? '{}') as { capability?: string }
    if (parsed.capability === 'image_to_video') return 'image_to_video'
    return parsed.capability === 'adult_video' ? 'adult_video' : 'video_generation'
  } catch {
    return 'video_generation'
  }
}

function metaFor(resultMeta: string | null): Record<string, unknown> {
  try {
    return JSON.parse(resultMeta ?? '{}') as Record<string, unknown>
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
    const persisted = await persistCanonicalMediaResult({
      result: { resultUrl: job.resultUrl, providerJobId: job.id, status: 'succeeded' },
      appSlug: job.appSlug ?? 'amarktai-network',
      type: 'video',
      subType: capabilityFor(job.resultMeta),
      title: `Video generation ${job.id}`,
      description: job.prompt,
      provider: job.provider,
      model: job.modelId,
      traceId,
      metadata: { ...metaFor(job.resultMeta), capability: capabilityFor(job.resultMeta), jobId: job.id },
    })
    if (!persisted.artifactId || !persisted.storageUrl) {
      return { artifactId: null, storageUrl: null, artifactError: persisted.blocker ?? 'Video artifact ingestion failed.' }
    }
    return { artifactId: persisted.artifactId, storageUrl: persisted.storageUrl, artifactError: null }
  } catch (error) {
    return {
      artifactId: null,
      storageUrl: null,
      artifactError: error instanceof Error ? error.message : 'Video artifact persistence failed.',
    }
  }
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
    return NextResponse.json(responsePayload(job, artifact))
  }

  if (Date.now() - job.createdAt.getTime() > MAX_PROCESSING_MS) {
    const updated = await prisma.videoGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: `Video provider did not complete within ${Math.round(MAX_PROCESSING_MS / 60_000)} minutes.`,
      },
    })
    return NextResponse.json(responsePayload(updated))
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
    ).catch(() => null)
  }

  const artifact = updated.status === 'succeeded' ? await ensureVideoArtifact(updated) : undefined
  return NextResponse.json(responsePayload(updated, artifact))
}
