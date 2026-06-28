import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { callProvider } from '@/lib/brain'
import { callGenXMedia, GENX_VIDEO_MODELS } from '@/lib/genx-client'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'

const RequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['cinematic', 'animated', 'realistic', 'documentary', 'commercial']).optional().default('cinematic'),
  duration: z.number().int().min(1).max(30).optional().default(4),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  referenceImageUrl: z.string().url().optional(),
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
    ['mimo', 'mimo-v2.5'],
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

  const { prompt, style, duration, aspectRatio, referenceImageUrl, appSlug, provider, model, capability } = parsed.data
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

  const enhancedPrompt = referenceImageUrl
    ? `${style} style image-to-video from reference ${referenceImageUrl}: ${prompt}`
    : `${style} style video: ${prompt}`
  let providerJobId = ''
  let usedProvider = ''
  let usedModel = ''
  let status = 'processing'
  let resultUrl = ''

  if (provider === 'auto' || provider === 'genx') {
    const genxModel = model && GENX_VIDEO_MODELS.includes(model as (typeof GENX_VIDEO_MODELS)[number])
      ? model
      : GENX_VIDEO_MODELS[0]
    const result = await callGenXMedia({
      model: genxModel,
      prompt: enhancedPrompt,
      type: 'video',
      duration,
      params: referenceImageUrl ? { referenceImageUrl, imageUrl: referenceImageUrl } : undefined,
      metadata: { capability, aspectRatio, referenceImageUrl },
    })
    if (result.success && (result.jobId || result.url)) {
      providerJobId = result.jobId ? `genx-job:${result.jobId}` : `genx-sync:${result.url}`
      usedProvider = 'genx'
      usedModel = genxModel
      status = result.url || result.status === 'completed' ? 'succeeded' : 'processing'
      resultUrl = result.url ?? ''
    }
  }

  if (!providerJobId) {
    const videoPlan = await planningFallback(prompt, style, duration)
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
      error: 'No tested approved video provider could start a real job.',
      blocker: 'No tested approved video provider could start a real job.',
    }, { status: 501 })
  }

  const job = await prisma.videoGenerationJob.create({
    data: {
      provider: usedProvider,
      modelId: usedModel,
      prompt: enhancedPrompt,
      style,
      duration,
      aspectRatio,
      appSlug: appSlug ?? null,
      status,
      providerJobId,
      resultUrl: resultUrl || null,
      resultMeta: JSON.stringify({ capability, aspectRatio, referenceImageUrl }),
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
        metadata: { capability, jobId: job.id, aspectRatio, referenceImageUrl },
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
    error: null,
    blocker: null,
    pollUrl: `/api/brain/video-generate/${job.id}`,
  }, { status: status === 'succeeded' ? 201 : 202 })
}
