import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getVaultApiKey, callProvider } from '@/lib/brain'
import { callGenXMedia, GENX_VIDEO_MODELS } from '@/lib/genx-client'
import { createArtifact } from '@/lib/artifact-store'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import {
  ensureExecution,
  recordExecutionResponse,
  startExecution,
} from '@/lib/execution'
import {
  requestedVideoDuration,
  shouldUseLongFormVideo,
  getVideoModelContract,
} from '@/lib/video-route-specs'
import { createLongFormVideoProject } from '@/lib/long-form-video'
import {
  createControlPlaneJob,
  finishControlPlaneAttempt,
  startControlPlaneAttempt,
} from '@/lib/control-plane-jobs'
import {
  getAdultAppCapabilityProfile,
  validateAdultCapabilityRequest,
} from '@/lib/adult-app-capabilities'
import { recordCapabilityTrace } from '@/lib/capability-tracing'

const RequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['cinematic', 'animated', 'realistic', 'documentary', 'commercial']).optional().default('cinematic'),
  duration: z.number().int().min(1).max(240).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  appSlug: z.string().optional(),
  provider: z.enum(['genx', 'qwen', 'auto']).optional().default('auto'),
  model: z.string().optional(),
  capability: z.enum(['video_generation', 'adult_video']).optional().default('video_generation'),
  executionId: z.string().optional(),
  adultApprovalRequired: z.boolean().optional().default(false),
  format: z.string().optional(),
  multiScene: z.boolean().optional().default(false),
  idempotencyKey: z.string().max(160).optional(),
})

async function createQwenJob(prompt: string, model: string, apiKey: string) {
  const contract = getVideoModelContract('qwen', model)
  if (!contract || contract.mode !== 'text_to_video') {
    throw new Error(`${model} is not registered as a provider-safe Qwen text-to-video model.`)
  }
  const response = await fetch(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({ model, input: { prompt }, parameters: { size: '1280*720' } }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  if (!response.ok) throw new Error(`Qwen Wan returned HTTP ${response.status}`)
  const data = await response.json() as { output?: { task_id?: string } }
  if (!data.output?.task_id) throw new Error('Qwen Wan did not return a task ID')
  return { providerJobId: `qwen-wan:${data.output.task_id}`, status: 'processing' }
}

async function planningFallback(prompt: string, style: string, duration: number) {
  const request = `Create a ${duration}-second ${style} video storyboard for "${prompt}". Include scenes, shots, narration, and visual notes.`
  for (const [provider, model] of [
    ['groq', 'llama-3.3-70b-versatile'],
    ['together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
    ['qwen', 'qwen-plus'],
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

  const {
    prompt,
    style,
    duration,
    aspectRatio,
    appSlug,
    provider,
    model,
    capability,
    executionId,
    adultApprovalRequired,
    format,
    multiScene,
    idempotencyKey,
  } = parsed.data
  const resolvedDuration = requestedVideoDuration(prompt, duration)
  if (capability === 'adult_video') {
    const targetApp = appSlug ?? 'amarktai-network'
    const adultProfile = await getAdultAppCapabilityProfile(targetApp)
    const adultPolicy = validateAdultCapabilityRequest(
      adultProfile,
      shouldUseLongFormVideo({ prompt, duration: resolvedDuration, format, multiScene })
        ? 'adult_long_video'
        : 'adult_short_video',
      prompt,
    )
    if (!adultPolicy.allowed) {
      return NextResponse.json({
        success: false, executed: false, capability, provider: null, model: null,
        jobStatus: 'blocked', artifactId: null, storageUrl: null,
        error: adultPolicy.blocker, blocker: adultPolicy.blocker,
      }, { status: 403 })
    }
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

  const execution = ensureExecution({
    appSlug: appSlug ?? 'amarktai-network',
    requestedCapability: capability,
    prompt,
    action: 'generate',
    selectedProvider: provider === 'auto' ? undefined : provider,
    selectedModel: model,
    adultPolicy: capability === 'adult_video' ? 'full_adult_app_mode' : 'off',
    adultApprovalRequired,
    expensiveMedia: resolvedDuration > 10,
    metadata: { style, duration: resolvedDuration, aspectRatio, format, multiScene },
  }, executionId)
  if (execution.status === 'awaiting_approval' || execution.status === 'blocked') {
    return NextResponse.json({
      success: false,
      executed: false,
      capability,
      provider: execution.providerPlan.provider,
      model: execution.modelPlan.model,
      jobStatus: execution.status,
      artifactId: null,
      storageUrl: null,
      error: execution.error ?? execution.approval.reason,
      blocker: execution.error ?? execution.approval.reason,
      executionId: execution.executionId,
      execution,
    }, { status: execution.status === 'awaiting_approval' ? 202 : 409 })
  }
  startExecution(execution.executionId)

  if (shouldUseLongFormVideo({ prompt, duration: resolvedDuration, format, multiScene })) {
    const project = await createLongFormVideoProject({
      appSlug: appSlug ?? 'amarktai-network',
      prompt,
      totalDuration: resolvedDuration,
      aspectRatio,
      style,
      qualityTier: 'auto',
      requestedProvider: provider === 'auto' ? undefined : provider,
      requestedModel: model,
      capability,
      idempotencyKey: idempotencyKey ?? `${appSlug ?? 'amarktai-network'}:${capability}:${prompt}:${resolvedDuration}`,
    })
    const payload = {
      success: project.status !== 'blocked',
      executed: false,
      capability,
      jobStatus: project.status,
      provider: null,
      model: null,
      projectId: project.id,
      controlPlaneJobId: project.controlPlaneJobId,
      pollUrl: `/api/admin/video-projects?id=${project.id}`,
      artifactId: project.finalArtifactId,
      storageUrl: project.finalVideoUrl,
      error: project.error,
      blocker: project.blocker,
      executionId: execution.executionId,
      route: 'long_form_video',
      sceneCount: project.scenes.length,
    }
    const executionResult = recordExecutionResponse(execution.executionId, payload)
    return NextResponse.json({ ...payload, execution: executionResult }, { status: 202 })
  }

  const enhancedPrompt = `${style} style video: ${prompt}`
  let providerJobId = ''
  let usedProvider = ''
  let usedModel = ''
  let status = 'processing'
  let resultUrl = ''

  if (provider === 'auto' || provider === 'genx') {
    const genxModel = model && GENX_VIDEO_MODELS.includes(model as (typeof GENX_VIDEO_MODELS)[number])
      ? model
      : GENX_VIDEO_MODELS[0]
    const contract = getVideoModelContract('genx', genxModel)
    const result = contract
      ? await callGenXMedia({
          model: genxModel,
          prompt: enhancedPrompt,
          type: 'video',
          ...(contract.supportsDurationCustomization ? { duration: resolvedDuration } : {}),
          params: { aspectRatio },
        })
      : { success: false, jobId: null, url: null, status: 'failed' as const, model: genxModel, latencyMs: 0, error: 'No provider-safe GenX video contract exists.' }
    if (result.success && (result.jobId || result.url)) {
      providerJobId = result.jobId ? `genx-job:${result.jobId}` : `genx-sync:${result.url}`
      usedProvider = 'genx'
      usedModel = genxModel
      status = result.url || result.status === 'completed' ? 'succeeded' : 'processing'
      resultUrl = result.url ?? ''
    }
  }

  if (!providerJobId && (provider === 'auto' || provider === 'qwen')) {
    const apiKey = await getVaultApiKey('qwen')
    if (apiKey) {
      const qwenModel = model || 'wanx2.1-t2v-turbo'
      try {
        const result = await createQwenJob(enhancedPrompt, qwenModel, apiKey)
        providerJobId = result.providerJobId
        usedProvider = 'qwen'
        usedModel = qwenModel
        status = result.status
      } catch {
        // Continue to the next approved provider.
      }
    }
  }

  if (!providerJobId) {
    const videoPlan = await planningFallback(prompt, style, resolvedDuration)
    const payload = {
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
      executionId: execution.executionId,
    }
    const executionResult = recordExecutionResponse(execution.executionId, payload)
    return NextResponse.json({ ...payload, execution: executionResult }, { status: 501 })
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
      resultMeta: JSON.stringify({ capability, executionId: execution.executionId }),
    },
  })
  const controlPlaneJob = await createControlPlaneJob({
    idempotencyKey: idempotencyKey ?? `${execution.executionId}:video`,
    appSlug: appSlug ?? 'amarktai-network',
    requestedCapability: capability,
    canonicalCapability: 'text_to_video',
    jobType: status === 'succeeded' ? 'video_generation' : 'external_provider_poll',
    selectedRoute: { provider: usedProvider, model: usedModel, outputType: 'video' },
    metadata: { videoGenerationJobId: job.id, executionId: execution.executionId },
    queueData: { videoGenerationJobId: job.id },
    queue: status !== 'succeeded',
  })
  const attempt = await startControlPlaneAttempt({
    jobId: controlPlaneJob.id,
    provider: usedProvider,
    model: usedModel,
    adapter: `${usedProvider}_capability_adapter`,
    outputType: 'video',
    requestMetadata: { duration: resolvedDuration, aspectRatio, providerJobId },
  })
  let artifactId: string | null = null
  let storageUrl: string | null = null
  if (status === 'succeeded' && resultUrl) {
    try {
      const artifact = await createArtifact({
        appSlug: appSlug ?? 'amarktai-network',
        executionId: execution.executionId,
        jobId: job.id,
        type: 'video',
        subType: capability,
        capability,
        title: `${capability === 'adult_video' ? 'Adult video' : 'Video'}: ${prompt.slice(0, 80)}`,
        description: enhancedPrompt,
        provider: usedProvider,
        model: usedModel,
        traceId: `video-job-${job.id}`,
        contentUrl: resultUrl,
        allowRemoteReference: true,
        mimeType: 'video/mp4',
        metadata: { capability, jobId: job.id },
      })
      artifactId = artifact.id
      storageUrl = artifact.storageUrl
      await finishControlPlaneAttempt({
        attemptId: attempt.id,
        status: 'completed',
        providerJobId,
        pollUrl: `/api/brain/video-generate/${job.id}`,
        charged: true,
        artifactId,
        responseMetadata: { resultUrl },
      })
    } catch (error) {
      const message = `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`
      await finishControlPlaneAttempt({
        attemptId: attempt.id,
        status: 'failed',
        providerJobId,
        pollUrl: `/api/brain/video-generate/${job.id}`,
        charged: true,
        errorCategory: 'artifact_persistence_failed',
        errorMessage: message,
        responseMetadata: { resultUrl },
      })
      await recordCapabilityTrace({
        jobId: controlPlaneJob.id,
        appSlug: appSlug ?? 'amarktai-network',
        adultModeState: capability === 'adult_video' ? 'enabled' : 'off',
        capability,
        eventType: 'video.artifact_persistence_failed',
        selectedRoute: { provider: usedProvider, model: usedModel },
        providerJobId,
        errorCategory: 'artifact_persistence_failed',
        payload: { videoGenerationJobId: job.id, resultUrl, message },
      })
      const payload = {
        success: false, executed: false, capability, provider: usedProvider, model: usedModel,
        jobStatus: 'failed', artifactId: null, storageUrl: null, error: message, blocker: message, jobId: job.id,
        executionId: execution.executionId,
      }
      const executionResult = recordExecutionResponse(execution.executionId, payload)
      return NextResponse.json({ ...payload, execution: executionResult }, { status: 500 })
    }
  }
  if (status !== 'succeeded') {
    await finishControlPlaneAttempt({
      attemptId: attempt.id,
      status: 'processing',
      providerJobId,
      pollUrl: `/api/brain/video-generate/${job.id}`,
      charged: true,
    })
  }
  await prisma.videoGenerationJob.update({
    where: { id: job.id },
    data: {
      resultMeta: JSON.stringify({
        capability,
        executionId: execution.executionId,
        controlPlaneJobId: controlPlaneJob.id,
        controlPlaneAttemptId: attempt.id,
      }),
    },
  })
  await recordCapabilityTrace({
    jobId: controlPlaneJob.id,
    appSlug: appSlug ?? 'amarktai-network',
    adultModeState: capability === 'adult_video' ? 'enabled' : 'off',
    capability,
    eventType: status === 'succeeded' ? 'video.completed' : 'video.provider_job_started',
    selectedRoute: { provider: usedProvider, model: usedModel },
    providerJobId,
    artifactId: artifactId ?? undefined,
    payload: { videoGenerationJobId: job.id, pollUrl: `/api/brain/video-generate/${job.id}` },
  })
  const payload = {
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
    executionId: execution.executionId,
    controlPlaneJobId: controlPlaneJob.id,
  }
  const executionResult = recordExecutionResponse(execution.executionId, payload)
  return NextResponse.json(
    { ...payload, execution: executionResult },
    { status: status === 'succeeded' ? 201 : 202 },
  )
}
