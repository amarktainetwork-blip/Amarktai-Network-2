import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { callProvider } from '@/lib/brain'
import { callGenXMedia, GENX_VIDEO_MODELS } from '@/lib/genx-client'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import {
  normalizeProviderVideoAspectRatio,
  normalizeProviderVideoCount,
  normalizeProviderVideoDuration,
} from '@/lib/provider-video-policy'

const RequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['cinematic', 'animated', 'realistic', 'documentary', 'commercial']).optional().default('cinematic'),
  duration: z.number().int().min(1).max(30).optional().default(4),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  referenceImageUrl: z.string().url().optional(),
  count: z.union([z.number(), z.string()]).optional(),
  appSlug: z.string().optional(),
  provider: z.enum(['genx', 'auto']).optional().default('auto'),
  model: z.string().optional(),
  capability: z.enum(['video_generation', 'image_to_video', 'adult_video']).optional().default('video_generation'),
})

async function planningFallback(prompt: string, style: string, duration: number) {
  const request = `Create a ${duration}-second ${style} video storyboard for "${prompt}". Include scenes, shots, narration, and visual notes.`
  for (const [provider, model] of [
    ['groq', 'llama-3.3-70b-versatile'],
    ['together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
  ] as const) {
    const result = await callProvider(provider, model, request)
    if (result.output) return result.output
  }
  return null
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({
    success: false, executed: false, capability: 'video_generation', provider: null, model: null,
    jobStatus: 'blocked', artifactId: null, storageUrl: null, error: 'Invalid request',
    blocker: 'Invalid request', details: parsed.error.flatten(),
  }, { status: 400 })

  const { prompt, style, duration, aspectRatio, referenceImageUrl, appSlug, provider, model, capability, count } = parsed.data
  const providerDuration = normalizeProviderVideoDuration(duration)
  const providerAspectRatio = normalizeProviderVideoAspectRatio(aspectRatio)
  const providerCount = normalizeProviderVideoCount(count)
  const effectiveReferenceImageUrl = capability === 'image_to_video' ? referenceImageUrl : undefined
  if (capability === 'adult_video') {
    const targetApp = appSlug ?? 'amarktai-network'
    await loadAppSafetyConfigFromDB(targetApp)
    const safety = getAppSafetyConfig(targetApp)
    if (safety.safeMode || !safety.adultMode) {
      const error = 'Adult video requires adultMode=true and safeMode=false for this app.'
      return NextResponse.json({
        success: false, executed: false, capability, provider: null, model: null,
        jobStatus: 'blocked', artifactId: null, storageUrl: null, error, blocker: error,
      }, { status: 403 })
    }
    const scan = scanContent(prompt, targetApp)
    if (scan.flagged) {
      const error = `Prompt blocked by policy: ${scan.categories.join(', ')}.`
      return NextResponse.json({
        success: false, executed: false, capability, provider: null, model: null,
        jobStatus: 'blocked', artifactId: null, storageUrl: null, error, blocker: error,
      }, { status: 422 })
    }
  }

  const enhancedPrompt = effectiveReferenceImageUrl
    ? `${style} style ${providerDuration}-second image-to-video from reference ${effectiveReferenceImageUrl}: ${prompt}`
    : `${style} style ${providerDuration}-second video: ${prompt}`
  let providerJobId = ''
  let usedProvider = ''
  let usedModel = ''
  let status = 'processing'
  let resultUrl = ''
  let providerFailure: {
    error: string | null
    statusCode?: number
    errorDetails?: unknown
    rawErrorBody?: string | null
    model?: string
  } | null = null

  if (provider === 'auto' || provider === 'genx') {
    const genxModel = model && GENX_VIDEO_MODELS.includes(model as (typeof GENX_VIDEO_MODELS)[number])
      ? model
      : GENX_VIDEO_MODELS[0]
    const result = await callGenXMedia({
      model: genxModel,
      prompt: enhancedPrompt,
      type: 'video',
      duration: providerDuration,
      params: {
        aspectRatio: providerAspectRatio,
        aspect_ratio: providerAspectRatio,
        count: providerCount,
        ...(effectiveReferenceImageUrl ? { referenceImageUrl: effectiveReferenceImageUrl, imageUrl: effectiveReferenceImageUrl } : {}),
      },
      metadata: {
        capability,
        requestedDurationSeconds: duration,
        normalizedDurationSeconds: providerDuration,
        aspectRatio: providerAspectRatio,
        referenceImageUrl: effectiveReferenceImageUrl,
        count: providerCount,
      },
    })
    if (result.success && (result.jobId || result.url)) {
      providerJobId = result.jobId ? `genx-job:${result.jobId}` : `genx-sync:${result.url}`
      usedProvider = 'genx'
      usedModel = genxModel
      status = result.url || result.status === 'completed' ? 'succeeded' : 'processing'
      resultUrl = result.url ?? ''
    } else {
      providerFailure = {
        error: result.error,
        statusCode: result.statusCode,
        errorDetails: result.errorDetails,
        rawErrorBody: result.rawErrorBody,
        model: result.model,
      }
    }
  }

  if (!providerJobId) {
    const videoPlan = await planningFallback(prompt, style, providerDuration)
    const providerHttpFailure = typeof providerFailure?.statusCode === 'number'
    const setupFailure = providerFailure?.error && /not configured|missing|requires_endpoint|endpoint/i.test(providerFailure.error)
      ? providerFailure.error
      : null
    const blocker = providerHttpFailure && providerFailure?.error
      ? `GenX video provider failed: ${providerFailure.error}`
      : setupFailure ?? 'No tested approved video provider could start a real job.'
    return NextResponse.json({
      success: false,
      capability,
      executed: false,
      provider: null,
      model: null,
      jobStatus: 'needs_setup',
      artifactId: null,
      storageUrl: null,
      generation_available: false,
      planning_available: Boolean(videoPlan),
      video_plan: videoPlan,
      error: blocker,
      blocker,
      providerError: providerFailure?.error ?? null,
      providerStatusCode: providerFailure?.statusCode ?? null,
      providerErrorDetails: providerFailure?.errorDetails ?? null,
      providerRawErrorBody: providerFailure?.rawErrorBody ?? null,
      normalizedRequest: {
        duration: providerDuration,
        aspectRatio: providerAspectRatio,
        count: providerCount,
        referenceImageUrl: effectiveReferenceImageUrl ?? null,
      },
    }, { status: providerHttpFailure ? 502 : 501 })
  }

  const job = await prisma.videoGenerationJob.create({
    data: {
      provider: usedProvider,
      modelId: usedModel,
      prompt: enhancedPrompt,
      style,
      duration: providerDuration,
      aspectRatio: providerAspectRatio,
      appSlug: appSlug ?? null,
      status,
      providerJobId,
      resultUrl: resultUrl || null,
      resultMeta: JSON.stringify({
        capability,
        requestedDurationSeconds: duration,
        normalizedDurationSeconds: providerDuration,
        aspectRatio: providerAspectRatio,
        referenceImageUrl: effectiveReferenceImageUrl,
        count: providerCount,
      }),
    },
  })
  let artifactId: string | null = null
  let storageUrl: string | null = null
  if (status === 'succeeded' && resultUrl) {
    try {
      const persisted = await persistCanonicalMediaResult({
        result: { resultUrl, status, providerJobId },
        appSlug: appSlug ?? 'amarktai-network',
        type: 'video',
        subType: capability,
        title: `${capability === 'adult_video' ? 'Adult video' : 'Video'}: ${prompt.slice(0, 80)}`,
        description: enhancedPrompt,
        provider: usedProvider,
        model: usedModel,
        traceId: `video-job-${job.id}`,
        metadata: {
          capability,
          jobId: job.id,
          requestedDurationSeconds: duration,
          normalizedDurationSeconds: providerDuration,
          aspectRatio: providerAspectRatio,
          referenceImageUrl: effectiveReferenceImageUrl,
          count: providerCount,
        },
      })
      if (!persisted.artifactId || !persisted.storageUrl) throw new Error(persisted.blocker ?? 'Video artifact ingestion failed')
      artifactId = persisted.artifactId
      storageUrl = persisted.storageUrl
    } catch (error) {
      const message = `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`
      return NextResponse.json({
        success: false, executed: false, capability, provider: usedProvider, model: usedModel,
        jobStatus: 'failed', artifactId: null, storageUrl: null, error: message, blocker: message, jobId: job.id,
      }, { status: 500 })
    }
  }
  return NextResponse.json({
    success: true,
    capability,
    executed: true,
    jobId: job.id,
    status: job.status,
    jobStatus: job.status,
    provider: usedProvider,
    model: usedModel,
    artifactId,
    storageUrl,
    normalizedRequest: {
      duration: providerDuration,
      aspectRatio: providerAspectRatio,
      count: providerCount,
      referenceImageUrl: effectiveReferenceImageUrl ?? null,
    },
    error: null,
    blocker: null,
    pollUrl: `/api/brain/video-generate/${job.id}`,
  }, { status: status === 'succeeded' ? 201 : 202 })
}
