import { callGenXMedia, GENX_VIDEO_MODELS, getGenXJobStatus } from '@/lib/genx-client'
import {
  appendRecord,
  findRecord,
  generateId,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { recordProviderResult } from '@/lib/provider-result-log'
import { getFfmpegStatus, stitchVideoClips } from '@/lib/video-stitcher'
import { normalizeLongFormSceneDurations } from '@/lib/provider-video-policy'

export type LongFormVideoPhase = 'planning' | 'generating_scenes' | 'stitching' | 'completed' | 'failed'
export type LongFormVideoStrategy = 'direct_provider' | 'scene_stitched'

export interface LongFormVideoScene {
  index: number
  prompt: string
  durationSeconds: number
  provider: string
  model: string
  requestPayload?: Record<string, unknown> | null
  providerJobId: string | null
  status: 'queued' | 'processing' | 'completed' | 'failed'
  artifactId: string | null
  storageUrl: string | null
  storagePath: string | null
  error: string | null
  providerStatusCode?: number | null
  providerErrorDetails?: unknown
  providerRawErrorBody?: string | null
  attempts?: number
}

export interface LongFormVideoJob {
  id: string
  capability: 'long_form_video'
  appSlug: string
  prompt: string
  style: string
  aspectRatio: string
  targetDurationSeconds: number
  plannedDurationSeconds: number
  finalDurationSeconds: number | null
  sceneCount: number
  productionNotes: string
  voice: string
  music: string
  stitching: string
  provider: string
  model: string
  strategy: LongFormVideoStrategy
  phase: LongFormVideoPhase
  status: 'processing' | 'completed' | 'failed'
  providerJobId: string | null
  artifactId: string | null
  storageUrl: string | null
  mediaUrl: string | null
  storagePath: string | null
  error: string | null
  directProviderError: string | null
  ffmpegStatus: string
  scenes: LongFormVideoScene[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface StartLongFormVideoInput {
  appSlug: string
  prompt: string
  style?: string
  aspectRatio?: string
  targetDurationSeconds: number
  sceneCount?: number
  productionNotes?: string
  voice?: string
  music?: string
  stitching?: string
  metadata?: Record<string, unknown>
}

const MAX_PROCESSING_MS = 45 * 60 * 1000

function saveJob(job: LongFormVideoJob, updates: Partial<Omit<LongFormVideoJob, 'id'>>) {
  return updateRecord<LongFormVideoJob>(LOCAL_STORE_FILES.longFormVideoJobs, job.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export function getLongFormVideoJob(jobId: string): LongFormVideoJob | null {
  return findRecord<LongFormVideoJob>(LOCAL_STORE_FILES.longFormVideoJobs, jobId)
}

function splitPromptIntoScenes(input: StartLongFormVideoInput, sceneCount: number): Array<{ prompt: string; durationSeconds: number }> {
  const targetDuration = Math.max(90, Math.round(input.targetDurationSeconds))
  const durations = normalizeLongFormSceneDurations(targetDuration, sceneCount)
  const sentences = input.prompt
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return Array.from({ length: durations.length }, (_, index) => {
    const seed = sentences[index % Math.max(1, sentences.length)] ?? input.prompt
    const notes = input.productionNotes ? ` Production notes: ${input.productionNotes}` : ''
    const prompt = [
      `Create only scene ${index + 1} of ${durations.length} as a standalone ${durations[index]} second ${input.style ?? 'cinematic'} video clip.`,
      `Aspect ratio: ${input.aspectRatio ?? '16:9'}.`,
      `Visual brief: ${seed}${notes}`,
      'No title cards, no credits, no scene-number text, no unsafe or copyrighted characters.',
    ].join(' ')
    return {
      durationSeconds: durations[index],
      prompt: prompt.replace(/\s+/g, ' ').slice(0, 1200),
    }
  })
}

function publicProviderFailure(input: {
  sceneIndex?: number
  prompt?: string
  durationSeconds?: number
  provider: string
  model: string
  requestPayload?: Record<string, unknown>
  error?: string | null
  statusCode?: number
  errorDetails?: unknown
  rawErrorBody?: string | null
}) {
  return {
    sceneIndex: input.sceneIndex ?? null,
    prompt: input.prompt ?? null,
    durationSeconds: input.durationSeconds ?? null,
    provider: input.provider,
    model: input.model,
    requestPayload: input.requestPayload ?? null,
    error: input.error ?? null,
    statusCode: input.statusCode ?? null,
    errorDetails: input.errorDetails ?? null,
    rawErrorBody: input.rawErrorBody ?? null,
  }
}

function shouldRetrySceneFailure(statusCode?: number, error?: string | null) {
  if (statusCode && (statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500)) return true
  return Boolean(error && /timeout|temporar|rate|busy|overload|try again/i.test(error))
}

function jobResponse(job: LongFormVideoJob) {
  const completed = job.status === 'completed' && Boolean(job.artifactId && job.storageUrl)
  const processing = job.status === 'processing'
  const proofStatus = completed ? 'passed' : processing ? 'processing' : 'failed'
  return {
    success: completed || processing,
    executed: completed || processing,
    capability: 'long_form_video',
    provider: job.provider,
    model: job.model,
    strategy: job.strategy,
    phase: job.phase,
    status: job.status,
    jobStatus: job.status,
    jobId: job.id,
    providerJobId: job.providerJobId,
    pollUrl: `/api/brain/long-form-video/${job.id}`,
    artifactId: job.artifactId,
    storageUrl: job.storageUrl,
    mediaUrl: job.mediaUrl,
    videoUrl: job.mediaUrl ?? job.storageUrl,
    error: job.error,
    blocker: job.error,
    ffmpegStatus: job.ffmpegStatus,
    scenes: job.scenes,
    targetDurationSeconds: job.targetDurationSeconds,
    plannedDurationSeconds: job.plannedDurationSeconds,
    finalDurationSeconds: job.finalDurationSeconds,
    proof: {
      capability: 'long_form_video',
      provider: job.provider,
      model: job.model,
      route: `/api/brain/long-form-video/${job.id}`,
      artifactId: job.artifactId,
      jobId: job.id,
      providerJobId: job.providerJobId,
      proofStatus,
      timestamp: job.updatedAt,
      error: job.error,
    },
    job,
  }
}

async function persistFinalVideo(job: LongFormVideoJob, result: unknown, strategy: LongFormVideoStrategy) {
  const persisted = await persistCanonicalMediaResult({
    result,
    appSlug: job.appSlug,
    type: 'video',
    subType: 'long_form_video',
    title: `Long-form video: ${job.prompt.slice(0, 80)}`,
    description: job.prompt,
    provider: job.provider,
    model: job.model,
    traceId: `long-form-video-${job.id}`,
    metadata: {
      ...job.metadata,
      capability: 'long_form_video',
      jobId: job.id,
      strategy,
      targetDurationSeconds: job.targetDurationSeconds,
      plannedDurationSeconds: job.plannedDurationSeconds,
      finalDurationSeconds: job.finalDurationSeconds,
      sceneCount: job.sceneCount,
      scenes: job.scenes.map((scene) => ({
        index: scene.index,
        durationSeconds: scene.durationSeconds,
        artifactId: scene.artifactId,
        storageUrl: scene.storageUrl,
        providerJobId: scene.providerJobId,
      })),
    },
  })
  if (!persisted.artifactId || !persisted.storageUrl) {
    throw new Error(persisted.blocker ?? 'Long-form final artifact ingestion failed.')
  }
  await recordProviderResult({
    appSlug: job.appSlug,
    provider: job.provider,
    model: job.model,
    capability: 'long_form_video',
    success: true,
    executed: true,
    latencyMs: 0,
    contentType: 'video',
    artifactId: persisted.artifactId,
    artifactPath: persisted.storageUrl,
    metadata: {
      source: 'long_form_video_job',
      strategy,
      proofStatus: 'passed',
      jobId: job.id,
      targetDurationSeconds: job.targetDurationSeconds,
      plannedDurationSeconds: job.plannedDurationSeconds,
      finalDurationSeconds: job.finalDurationSeconds,
    },
  }).catch(() => null)
  return persisted
}

async function completeWithFinal(job: LongFormVideoJob, result: unknown, strategy: LongFormVideoStrategy) {
  const persisted = await persistFinalVideo(job, result, strategy)
  return saveJob(job, {
    status: 'completed',
    phase: 'completed',
    strategy,
    artifactId: persisted.artifactId,
    storageUrl: persisted.storageUrl,
    mediaUrl: persisted.mediaUrl,
    storagePath: persisted.storagePath,
    error: null,
    finalDurationSeconds: job.plannedDurationSeconds,
    completedAt: new Date().toISOString(),
  })!
}

async function startSceneFallback(job: LongFormVideoJob, reason: string): Promise<LongFormVideoJob> {
  const ffmpeg = await getFfmpegStatus()
  if (!ffmpeg.available) {
    const error = `GenX direct ${job.targetDurationSeconds}s video did not start (${reason}); scene stitching fallback is unavailable because ffmpeg is not installed or not on PATH.`
    return saveJob(job, {
      status: 'failed',
      phase: 'failed',
      error,
      directProviderError: reason,
      ffmpegStatus: ffmpeg.error ?? 'ffmpeg unavailable',
      completedAt: new Date().toISOString(),
    })!
  }

  const sceneCount = normalizeLongFormSceneDurations(job.targetDurationSeconds, job.sceneCount).length
  const plannedScenes = splitPromptIntoScenes({
    appSlug: job.appSlug,
    prompt: job.prompt,
    style: job.style,
    aspectRatio: job.aspectRatio,
    targetDurationSeconds: job.targetDurationSeconds,
    sceneCount,
    productionNotes: job.productionNotes,
  }, sceneCount)
  const scenes: LongFormVideoScene[] = []
  for (const [index, scene] of plannedScenes.entries()) {
    const sceneRequestPayload = {
      model: GENX_VIDEO_MODELS[0],
      params: {
        prompt: scene.prompt,
        type: 'video',
        duration: scene.durationSeconds,
        style: job.style,
      },
      metadata: {
        capability: 'long_form_video_scene',
        longFormJobId: job.id,
        sceneIndex: index + 1,
      },
    }
    let sceneResult = await callGenXMedia({
      model: GENX_VIDEO_MODELS[0],
      prompt: scene.prompt,
      type: 'video',
      duration: scene.durationSeconds,
      style: job.style,
      metadata: {
        capability: 'long_form_video_scene',
        longFormJobId: job.id,
        sceneIndex: index + 1,
      },
    })
    let attempts = 1
    if (!sceneResult.success && shouldRetrySceneFailure(sceneResult.statusCode, sceneResult.error)) {
      attempts += 1
      sceneResult = await callGenXMedia({
        model: GENX_VIDEO_MODELS[0],
        prompt: `${scene.prompt} Keep the clip simple, single location, continuous camera, provider-safe visual-only scene.`,
        type: 'video',
        duration: scene.durationSeconds,
        style: job.style,
        metadata: {
          capability: 'long_form_video_scene',
          longFormJobId: job.id,
          sceneIndex: index + 1,
          retry: 1,
        },
      })
    }
    if (!sceneResult.success || (!sceneResult.url && !sceneResult.jobId)) {
      const failure = publicProviderFailure({
        sceneIndex: index + 1,
        prompt: scene.prompt,
        durationSeconds: scene.durationSeconds,
        provider: 'genx',
        model: sceneResult.model,
        requestPayload: sceneRequestPayload,
        error: sceneResult.error ?? 'provider returned no media URL or job ID',
        statusCode: sceneResult.statusCode,
        errorDetails: sceneResult.errorDetails,
        rawErrorBody: sceneResult.rawErrorBody,
      })
      const error = `Scene ${index + 1} failed to start with ${failure.provider}/${failure.model}: ${failure.error}`
      scenes.push({
        index: index + 1,
        prompt: scene.prompt,
        durationSeconds: scene.durationSeconds,
        provider: failure.provider,
        model: failure.model,
        requestPayload: sceneRequestPayload,
        providerJobId: null,
        status: 'failed',
        artifactId: null,
        storageUrl: null,
        storagePath: null,
        error,
        providerStatusCode: failure.statusCode,
        providerErrorDetails: failure.errorDetails,
        providerRawErrorBody: failure.rawErrorBody,
        attempts,
      })
      return saveJob(job, {
        status: 'failed',
        phase: 'failed',
        strategy: 'scene_stitched',
        directProviderError: reason,
        ffmpegStatus: ffmpeg.ffmpegPath ?? 'ffmpeg',
        scenes,
        error,
        metadata: { ...job.metadata, failedScene: failure },
        completedAt: new Date().toISOString(),
      })!
    }
    const nextScene: LongFormVideoScene = {
      index: index + 1,
      prompt: scene.prompt,
      durationSeconds: scene.durationSeconds,
      provider: 'genx',
      model: sceneResult.model,
      requestPayload: sceneRequestPayload,
      providerJobId: sceneResult.jobId,
      status: sceneResult.url ? 'completed' : 'processing',
      artifactId: null,
      storageUrl: null,
      storagePath: null,
      error: null,
      providerStatusCode: null,
      providerErrorDetails: null,
      providerRawErrorBody: null,
      attempts,
    }
    if (sceneResult.url) {
      const persisted = await persistCanonicalMediaResult({
        result: { resultUrl: sceneResult.url, status: sceneResult.status, providerJobId: sceneResult.jobId },
        appSlug: job.appSlug,
        type: 'video',
        subType: 'long_form_video_scene',
        title: `Long-form scene ${index + 1}`,
        description: scene.prompt,
        provider: 'genx',
        model: sceneResult.model,
        traceId: `long-form-video-${job.id}-scene-${index + 1}`,
        metadata: { capability: 'long_form_video_scene', longFormJobId: job.id, sceneIndex: index + 1 },
      })
      if (!persisted.artifactId || !persisted.storagePath) {
        const error = `Scene ${index + 1} completed but artifact ingestion failed: ${persisted.blocker ?? 'missing storage path'}`
        return saveJob(job, {
          status: 'failed',
          phase: 'failed',
          strategy: 'scene_stitched',
          directProviderError: reason,
          ffmpegStatus: ffmpeg.ffmpegPath ?? 'ffmpeg',
          scenes,
          error,
          metadata: {
            ...job.metadata,
            failedScene: publicProviderFailure({
              sceneIndex: index + 1,
              prompt: scene.prompt,
              durationSeconds: scene.durationSeconds,
              provider: 'genx',
              model: sceneResult.model,
              requestPayload: sceneRequestPayload,
              error,
            }),
          },
          completedAt: new Date().toISOString(),
        })!
      }
      nextScene.artifactId = persisted.artifactId
      nextScene.storageUrl = persisted.storageUrl
      nextScene.storagePath = persisted.storagePath
    }
    scenes.push(nextScene)
  }

  const saved = saveJob(job, {
    strategy: 'scene_stitched',
    phase: 'generating_scenes',
    status: 'processing',
    provider: 'genx',
    model: GENX_VIDEO_MODELS[0],
    directProviderError: reason,
    ffmpegStatus: ffmpeg.ffmpegPath ?? 'ffmpeg',
    scenes,
    sceneCount,
    plannedDurationSeconds: plannedScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    error: null,
  })!
  return (await pollLongFormVideoJob(saved.id)) ?? saved
}

export async function startLongFormVideoJob(input: StartLongFormVideoInput): Promise<LongFormVideoJob> {
  const now = new Date().toISOString()
  const targetDurationSeconds = Math.max(90, Math.round(input.targetDurationSeconds))
  const sceneDurations = normalizeLongFormSceneDurations(targetDurationSeconds, input.sceneCount)
  const requestedSceneCount = sceneDurations.length
  const plannedDurationSeconds = sceneDurations.reduce((sum, duration) => sum + duration, 0)
  const job = appendRecord<LongFormVideoJob>(LOCAL_STORE_FILES.longFormVideoJobs, {
    id: generateId(),
    capability: 'long_form_video',
    appSlug: input.appSlug,
    prompt: input.prompt,
    style: input.style ?? 'cinematic',
    aspectRatio: input.aspectRatio ?? '16:9',
    targetDurationSeconds,
    plannedDurationSeconds,
    finalDurationSeconds: null,
    sceneCount: requestedSceneCount,
    productionNotes: input.productionNotes ?? '',
    voice: input.voice ?? 'off',
    music: input.music ?? 'off',
    stitching: input.stitching ?? 'on',
    provider: 'genx',
    model: GENX_VIDEO_MODELS[0],
    strategy: 'direct_provider',
    phase: 'planning',
    status: 'processing',
    providerJobId: null,
    artifactId: null,
    storageUrl: null,
    mediaUrl: null,
    storagePath: null,
    error: null,
    directProviderError: null,
    ffmpegStatus: 'not_checked',
    scenes: [],
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  })

  const direct = await callGenXMedia({
    model: GENX_VIDEO_MODELS[0],
    prompt: [
      `Create a completed ${targetDurationSeconds}-second long-form video.`,
      `Style: ${job.style}. Aspect ratio: ${job.aspectRatio}.`,
      `Script/topic: ${job.prompt}`,
      job.productionNotes ? `Production notes: ${job.productionNotes}` : '',
    ].filter(Boolean).join('\n'),
    type: 'video',
    duration: targetDurationSeconds,
    style: job.style,
    metadata: { capability: 'long_form_video', longFormJobId: job.id, targetDurationSeconds, plannedDurationSeconds },
  })

  if (direct.success && direct.url) {
    return completeWithFinal({ ...job, model: direct.model }, { resultUrl: direct.url, status: direct.status }, 'direct_provider')
  }
  if (direct.success && direct.jobId) {
    return saveJob(job, {
      phase: 'generating_scenes',
      providerJobId: direct.jobId,
      model: direct.model,
      error: null,
    })!
  }
  return startSceneFallback(job, direct.error ?? 'provider returned no long-form job or media URL')
}

async function persistCompletedScene(job: LongFormVideoJob, scene: LongFormVideoScene, resultUrl: string) {
  const persisted = await persistCanonicalMediaResult({
    result: { resultUrl, status: 'completed', providerJobId: scene.providerJobId },
    appSlug: job.appSlug,
    type: 'video',
    subType: 'long_form_video_scene',
    title: `Long-form scene ${scene.index}`,
    description: scene.prompt,
    provider: scene.provider,
    model: scene.model,
    traceId: `long-form-video-${job.id}-scene-${scene.index}`,
    metadata: { capability: 'long_form_video_scene', longFormJobId: job.id, sceneIndex: scene.index },
  })
  if (!persisted.artifactId || !persisted.storagePath) {
    throw new Error(`Scene ${scene.index} artifact ingestion failed: ${persisted.blocker ?? 'missing storage path'}`)
  }
  return {
    ...scene,
    status: 'completed' as const,
    artifactId: persisted.artifactId,
    storageUrl: persisted.storageUrl,
    storagePath: persisted.storagePath,
    error: null,
  }
}

export async function pollLongFormVideoJob(jobId: string): Promise<LongFormVideoJob | null> {
  const job = getLongFormVideoJob(jobId)
  if (!job || job.status === 'completed' || job.status === 'failed') return job

  if (Date.now() - new Date(job.createdAt).getTime() > MAX_PROCESSING_MS) {
    return saveJob(job, {
      status: 'failed',
      phase: 'failed',
      error: `Long-form video job did not complete within ${Math.round(MAX_PROCESSING_MS / 60_000)} minutes.`,
      completedAt: new Date().toISOString(),
    })
  }

  if (job.strategy === 'direct_provider' && job.providerJobId) {
    const providerResult = await getGenXJobStatus(job.providerJobId)
    if (!providerResult) return job
    if (providerResult.status === 'failed') {
      return startSceneFallback(job, providerResult.error ?? 'direct provider job failed')
    }
    if (!['completed', 'succeeded'].includes(providerResult.status)) {
      return saveJob(job, { phase: 'generating_scenes', status: 'processing', error: null })
    }
    if (!providerResult.resultUrl) {
      return startSceneFallback(job, 'direct provider completed without a usable media URL')
    }
    try {
      return await completeWithFinal(job, {
        resultUrl: providerResult.resultUrl,
        status: providerResult.status,
        providerJobId: job.providerJobId,
      }, 'direct_provider')
    } catch (error) {
      return saveJob(job, {
        status: 'failed',
        phase: 'failed',
        error: `Direct long-form video completed but artifact ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        completedAt: new Date().toISOString(),
      })
    }
  }

  if (job.strategy === 'scene_stitched') {
    const scenes = [...job.scenes]
    for (const scene of scenes) {
      if (scene.status === 'completed') continue
      if (!scene.providerJobId) {
        scene.status = 'failed'
        scene.error = `Scene ${scene.index} has no provider job ID.`
        return saveJob(job, { status: 'failed', phase: 'failed', scenes, error: scene.error, completedAt: new Date().toISOString() })
      }
      const providerResult = await getGenXJobStatus(scene.providerJobId)
      if (!providerResult) continue
      if (providerResult.status === 'failed') {
        scene.status = 'failed'
        scene.error = `Scene ${scene.index} provider failed: ${providerResult.error ?? 'unknown provider error'}`
        return saveJob(job, { status: 'failed', phase: 'failed', scenes, error: scene.error, completedAt: new Date().toISOString() })
      }
      if (['completed', 'succeeded'].includes(providerResult.status)) {
        if (!providerResult.resultUrl) {
          scene.status = 'failed'
          scene.error = `Scene ${scene.index} completed without a usable media URL.`
          return saveJob(job, { status: 'failed', phase: 'failed', scenes, error: scene.error, completedAt: new Date().toISOString() })
        }
        try {
          scenes[scene.index - 1] = await persistCompletedScene(job, scene, providerResult.resultUrl)
        } catch (error) {
          const message = error instanceof Error ? error.message : `Scene ${scene.index} artifact ingestion failed.`
          scene.status = 'failed'
          scene.error = message
          return saveJob(job, { status: 'failed', phase: 'failed', scenes, error: message, completedAt: new Date().toISOString() })
        }
      }
    }

    if (scenes.some((scene) => scene.status !== 'completed')) {
      return saveJob(job, { phase: 'generating_scenes', status: 'processing', scenes, error: null })
    }

    const stitchingJob = saveJob(job, { phase: 'stitching', scenes, error: null }) ?? { ...job, scenes, phase: 'stitching' as const }
    const stitched = await stitchVideoClips({
      traceId: job.id,
      clips: scenes.map((scene) => ({ storagePath: scene.storagePath ?? '', label: `Scene ${scene.index}` })),
    })
    if (!stitched.success || !stitched.content) {
      return saveJob(stitchingJob, {
        status: 'failed',
        phase: 'failed',
        error: stitched.error ?? 'Long-form video stitching failed.',
        ffmpegStatus: stitched.ffmpegPath ?? stitched.error ?? 'ffmpeg unavailable',
        completedAt: new Date().toISOString(),
      })
    }
    try {
      return await completeWithFinal(stitchingJob, {
        videoBase64: stitched.content.toString('base64'),
        mimeType: 'video/mp4',
        status: 'completed',
      }, 'scene_stitched')
    } catch (error) {
      return saveJob(stitchingJob, {
        status: 'failed',
        phase: 'failed',
        error: `Stitched video artifact ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        completedAt: new Date().toISOString(),
      })
    }
  }

  return job
}

export function longFormVideoJobResponse(job: LongFormVideoJob) {
  return jobResponse(job)
}
