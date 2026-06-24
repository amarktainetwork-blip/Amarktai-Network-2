import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  appendRecord,
  findRecord,
  listRecords,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'
import { executeCapabilityOrchestration } from '@/lib/orchestrator'
import { pollLocalMediaJob } from '@/lib/media-job-store'
import { createArtifact, getArtifact } from '@/lib/artifact-store'
import { getStorageDriver } from '@/lib/storage-driver'
import { resolveStoragePath } from '@/lib/storage-root'
import { brandKitPrompt, getBrandKit } from '@/lib/creative-workspaces'
import { testLocalTool } from '@/lib/local-tools'
import { createControlPlaneJob } from '@/lib/control-plane-jobs'
import { prisma } from '@/lib/prisma'

const execFileAsync = promisify(execFile)
const MAX_SCENES = 30
const SCENE_SECONDS = 8

export const LONG_FORM_VIDEO_ARCHITECTURE = [
  'storyboard',
  'scene_list',
  'scene_jobs',
  'provider_generation',
  'voice',
  'music',
  'assembly',
  'artifact',
] as const

export type VideoProjectStatus =
  | 'planned'
  | 'generating_scenes'
  | 'stitching'
  | 'saving_artifact'
  | 'completed'
  | 'failed'
  | 'blocked'

export type LongFormCreativeWorkflowStatus =
  | 'SOURCE_WIRED_CREATIVE_WORKFLOW'
  | 'NEEDS_QUALITY_GATE'
  | 'BLOCKED_FINAL_ASSEMBLY'
  | 'TECHNICAL_ASSEMBLY_PASSED'

export interface LongFormQualityGate {
  creativeWorkflowStatus: LongFormCreativeWorkflowStatus
  scenePlanGeneric: boolean
  scenePromptsDistinct: boolean
  finalOutputDownloadable: boolean
  syncQuality: 'not_applicable' | 'unverified' | 'metadata_required'
  notes: string[]
}

export interface VideoScene {
  id: string
  order: number
  prompt: string
  duration: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  jobId: string | null
  providerJobId: string | null
  artifactId: string | null
  mediaUrl: string | null
  provider: string | null
  model: string | null
  error: string | null
}

export interface VideoProject {
  id: string
  appSlug: string
  capability: 'video_generation' | 'adult_video'
  title: string
  prompt: string
  totalDuration: number
  aspectRatio: string
  style: string
  tone: string
  qualityTier: 'cheap' | 'balanced' | 'premium' | 'auto'
  requestedProvider: string | null
  requestedModel: string | null
  brandKitId: string | null
  audioReference: string | null
  status: VideoProjectStatus
  progress: number
  scenes: VideoScene[]
  finalArtifactId: string | null
  finalVideoUrl: string | null
  controlPlaneJobId: string | null
  qualityGate: LongFormQualityGate
  error: string | null
  blocker: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export function listVideoProjects(appSlug?: string) {
  return listRecords<VideoProject>(
    LOCAL_STORE_FILES.videoProjects,
    appSlug ? (project) => project.appSlug === appSlug : undefined,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getVideoProject(id: string) {
  return findRecord<VideoProject>(LOCAL_STORE_FILES.videoProjects, id)
}

export async function createLongFormVideoProject(input: {
  appSlug?: string
  title?: string
  prompt: string
  totalDuration?: number
  aspectRatio?: string
  style?: string
  tone?: string
  sceneCount?: number
  brandKitId?: string
  audioReference?: string
  qualityTier?: VideoProject['qualityTier']
  requestedProvider?: string
  requestedModel?: string
  capability?: VideoProject['capability']
  idempotencyKey?: string
}) {
  const totalDuration = clamp(Math.round(input.totalDuration ?? 90), 15, 240)
  const sceneCount = clamp(
    Math.round(input.sceneCount ?? Math.ceil(totalDuration / SCENE_SECONDS)),
    2,
    MAX_SCENES,
  )
  const sceneDuration = Math.ceil(totalDuration / sceneCount)
  const kit = getBrandKit(input.brandKitId)
  const context = brandKitPrompt(kit)
  const scenePrompts = buildLongFormScenePrompts({
    prompt: input.prompt.trim(),
    sceneCount,
    sceneDuration,
    style: input.style ?? 'cinematic',
    tone: input.tone ?? 'confident',
    context,
  })
  const scenes = Array.from({ length: sceneCount }, (_, index): VideoScene => ({
    id: crypto.randomUUID(),
    order: index + 1,
    prompt: scenePrompts[index] ?? '',
    duration: sceneDuration,
    status: 'queued',
    jobId: null,
    providerJobId: null,
    artifactId: null,
    mediaUrl: null,
    provider: null,
    model: null,
    error: null,
  }))
  const qualityGate = buildInitialQualityGate(scenes, Boolean(input.audioReference))
  const now = new Date().toISOString()
  const project = appendRecord<VideoProject>(LOCAL_STORE_FILES.videoProjects, {
    id: crypto.randomUUID(),
    appSlug: input.appSlug?.trim() || 'amarktai-network',
    capability: input.capability ?? 'video_generation',
    title: input.title?.trim() || input.prompt.trim().slice(0, 80),
    prompt: input.prompt.trim(),
    totalDuration,
    aspectRatio: input.aspectRatio || '16:9',
    style: input.style || 'cinematic',
    tone: input.tone || 'confident',
    qualityTier: input.qualityTier || 'auto',
    requestedProvider: input.requestedProvider || null,
    requestedModel: input.requestedModel || null,
    brandKitId: kit?.id ?? null,
    audioReference: input.audioReference || null,
    status: 'planned',
    progress: 0,
    scenes,
    finalArtifactId: null,
    finalVideoUrl: null,
    controlPlaneJobId: null,
    qualityGate,
    error: null,
    blocker: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  })
  const durableJob = await createControlPlaneJob({
    idempotencyKey: input.idempotencyKey,
    appSlug: project.appSlug,
    requestedCapability: project.capability,
    canonicalCapability: 'text_to_video',
    jobType: project.capability === 'adult_video' ? 'adult_media' : 'long_form_video',
    selectedRoute: {
      pipeline: 'long_form_video',
      sceneCount: project.scenes.length,
      clipDurationSeconds: project.scenes[0]?.duration ?? SCENE_SECONDS,
    },
    metadata: {
      videoProjectId: project.id,
      totalDuration: project.totalDuration,
      aspectRatio: project.aspectRatio,
      adult: project.capability === 'adult_video',
    },
    queueData: { videoProjectId: project.id },
  })
  return saveProject(project, {
    controlPlaneJobId: durableJob.id,
    status: durableJob.status === 'blocked' || durableJob.status === 'failed' ? 'blocked' : 'planned',
    blocker: durableJob.errorMessage,
  })
}

export async function advanceVideoProject(id: string): Promise<VideoProject | null> {
  let project = getVideoProject(id)
  if (!project || ['completed', 'failed', 'blocked'].includes(project.status)) return project
  project = ensureQualityGate(project)

  const scenes = await pollScenes(project.scenes)
  const activeCount = scenes.filter((scene) => scene.status === 'processing').length
  const launchCount = Math.max(0, 2 - activeCount)
  const queued = scenes.filter((scene) => scene.status === 'queued').slice(0, launchCount)
  for (const scene of queued) {
    const result = await executeCapabilityOrchestration({
      input: scene.prompt,
      capability: project.capability,
      appId: project.appSlug,
      adultMode: project.capability === 'adult_video',
      safeMode: project.capability === 'adult_video' ? false : undefined,
      qualityTier: project.qualityTier,
      saveArtifact: true,
      metadata: {
        source: 'long_form_video',
        videoProjectId: project.id,
        sceneId: scene.id,
        sceneOrder: scene.order,
        duration: scene.duration,
        aspectRatio: project.aspectRatio,
        style: project.style,
        tone: project.tone,
        brandKitId: project.brandKitId,
        controlPlaneJobId: project.controlPlaneJobId,
        pipeline: LONG_FORM_VIDEO_ARCHITECTURE,
        ignoredRequestedProvider: project.requestedProvider,
        ignoredRequestedModel: project.requestedModel,
      },
    })
    scene.provider = result.provider
    scene.model = result.model
    scene.jobId = result.jobId ?? null
    scene.providerJobId = result.providerJobId ?? null
    scene.artifactId = result.artifactId ?? null
    scene.mediaUrl = result.artifactUrl ?? result.mediaUrl ?? (
      result.output?.startsWith('http') ? result.output : null
    )
    scene.status = result.status === 'processing'
      ? 'processing'
      : result.success && scene.artifactId
        ? 'completed'
        : 'failed'
    scene.error = result.error ?? result.warning ?? null
  }

  const completed = scenes.filter((scene) => scene.status === 'completed').length
  const failed = scenes.filter((scene) => scene.status === 'failed').length
  const progress = Math.round((completed / scenes.length) * 85)
  project = saveProject(project, {
    scenes,
    status: 'generating_scenes',
    progress,
    error: failed ? `${failed} scene${failed === 1 ? '' : 's'} failed. Retryable scenes remain visible.` : null,
  })
  if (failed > 0 && scenes.every((scene) => ['completed', 'failed'].includes(scene.status))) {
    return saveProject(project, {
      status: 'failed',
      blocker: 'One or more provider clip jobs failed. Retry the failed scenes after provider readiness is restored.',
    })
  }
  if (!scenes.every((scene) => scene.status === 'completed')) return project
  try {
    return await stitchProject(project)
  } catch (error) {
    return saveProject(project, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Final video assembly failed.',
      blocker: 'Scene clips are preserved. Correct FFmpeg or storage readiness, then retry final assembly.',
      qualityGate: updateQualityGate(project.qualityGate, {
        creativeWorkflowStatus: 'BLOCKED_FINAL_ASSEMBLY',
        finalOutputDownloadable: false,
        notes: [
          ...project.qualityGate.notes,
          exactAssemblyFailure(error),
        ],
      }),
    })
  }
}

async function pollScenes(scenes: VideoScene[]) {
  for (const scene of scenes) {
    if (scene.status !== 'processing' || !scene.jobId) continue
    const job = await pollLocalMediaJob(scene.jobId)
    if (!job) continue
    scene.status = job.status === 'completed'
      ? 'completed'
      : job.status === 'failed'
        ? 'failed'
        : 'processing'
    scene.artifactId = job.artifactId
    scene.mediaUrl = job.storageUrl || job.mediaUrl
    scene.error = job.error
  }
  return scenes
}

async function stitchProject(project: VideoProject): Promise<VideoProject> {
  const [ffmpeg, ffprobe] = await Promise.all([
    testLocalTool('ffmpeg'),
    testLocalTool('ffprobe'),
  ])
  if (!ffmpeg.connected || !ffprobe.connected) {
    return saveProject(project, {
      status: 'blocked',
      progress: 85,
      blocker: 'All scene clips completed, but FFmpeg or ffprobe is unavailable for final assembly.',
      error: [ffmpeg, ffprobe].filter((tool) => !tool.connected).map((tool) => `${tool.id}: ${tool.detail}`).join(' | '),
    })
  }
  project = saveProject(project, { status: 'stitching', progress: 90 })
  const workspace = resolveStoragePath(`workspaces/video-projects/${project.id}`)
  await fs.mkdir(workspace, { recursive: true })
  const normalized: string[] = []
  for (const scene of project.scenes) {
    if (!scene.artifactId) throw new Error(`Scene ${scene.order} has no persisted artifact.`)
    const artifact = await getArtifact(scene.artifactId)
    if (!artifact?.storagePath) throw new Error(`Scene ${scene.order} artifact storage is unavailable.`)
    const bytes = await getStorageDriver().get(artifact.storagePath)
    if (!bytes) throw new Error(`Scene ${scene.order} clip cannot be read from storage.`)
    const source = path.join(workspace, `scene-${scene.order}.source`)
    const output = path.join(workspace, `scene-${scene.order}.mp4`)
    await fs.writeFile(source, bytes)
    await runFfmpeg([
      '-y', '-i', source,
      '-t', String(scene.duration),
      '-vf', videoScale(project.aspectRatio),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
      '-c:a', 'aac', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      output,
    ])
    await validateVideo(output)
    normalized.push(output)
  }
  const concatFile = path.join(workspace, 'concat.txt')
  await fs.writeFile(concatFile, normalized.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'))
  const stitched = path.join(workspace, 'stitched.mp4')
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', stitched])
  await validateVideo(stitched)
  const finalPath = path.join(workspace, 'final.mp4')
  const kit = getBrandKit(project.brandKitId)
  if (kit) {
    const color = kit.primaryColor.replace('#', '0x')
    await runFfmpeg([
      '-y', '-i', stitched,
      '-vf', `drawbox=x=0:y=ih-18:w=iw:h=18:color=${color}@0.85:t=fill`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
      '-c:a', 'copy', '-movflags', '+faststart',
      finalPath,
    ])
  } else {
    await fs.copyFile(stitched, finalPath)
  }
  project = saveProject(project, { status: 'saving_artifact', progress: 96 })
  const finalBytes = await fs.readFile(finalPath)
  const artifact = await createArtifact({
    appSlug: project.appSlug,
    type: 'video',
    subType: 'long_form_video',
    capability: 'video_generation',
    title: project.title,
    description: project.prompt,
    mimeType: 'video/mp4',
    content: finalBytes,
    metadata: {
      videoProjectId: project.id,
      duration: project.totalDuration,
      aspectRatio: project.aspectRatio,
      style: project.style,
      tone: project.tone,
      brandKitId: project.brandKitId,
      brandOverlay: kit ? { name: kit.name, primaryColor: kit.primaryColor } : null,
      audioReference: project.audioReference,
      sceneArtifacts: project.scenes.map((scene) => scene.artifactId),
      ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
      ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
      qualityGate: {
        ...project.qualityGate,
        finalOutputDownloadable: true,
        notes: [
          ...project.qualityGate.notes,
          'Final artifact exists locally and exposes a preview/download/storage URL.',
        ],
      },
    },
  })
  const finalVideoUrl = artifact.previewUrl || artifact.downloadUrl || artifact.storageUrl
  if (!finalVideoUrl) {
    throw new Error('Final video artifact was created but has no preview, download, or storage URL.')
  }
  return saveProject(project, {
    status: 'completed',
    progress: 100,
    finalArtifactId: artifact.id,
    finalVideoUrl,
    qualityGate: updateQualityGate(project.qualityGate, {
      finalOutputDownloadable: true,
      notes: [
        ...project.qualityGate.notes,
        'Final assembly completed and local artifact URL is available. Creative coherence, pronunciation, voice sync, and advert quality remain unverified.',
      ],
    }),
    completedAt: new Date().toISOString(),
    error: null,
    blocker: null,
  })
}

async function runFfmpeg(args: string[]) {
  try {
    await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', args, {
      timeout: 20 * 60_000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    })
  } catch (error) {
    throw new Error(exactAssemblyFailure(error))
  }
}

async function validateVideo(file: string) {
  const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], {
    timeout: 30_000,
    windowsHide: true,
  })
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`ffprobe could not validate assembled video ${path.basename(file)}.`)
  }
}

function videoScale(aspectRatio: string) {
  const dimensions = aspectRatio === '9:16' ? '720:1280' : aspectRatio === '1:1' ? '1080:1080' : '1280:720'
  return `scale=${dimensions}:force_original_aspect_ratio=decrease,pad=${dimensions}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`
}

function saveProject(project: VideoProject, updates: Partial<VideoProject>) {
  const saved = updateRecord<VideoProject>(LOCAL_STORE_FILES.videoProjects, project.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  }) ?? project
  if (saved.controlPlaneJobId) {
    const terminal = ['completed', 'failed', 'blocked'].includes(saved.status)
    void prisma.controlPlaneJob.update({
      where: { id: saved.controlPlaneJobId },
      data: {
        status: saved.status === 'generating_scenes' || saved.status === 'stitching' || saved.status === 'saving_artifact'
          ? 'processing'
          : saved.status,
        progress: saved.progress,
        artifactId: saved.finalArtifactId,
        metadata: JSON.stringify({
          videoProjectId: saved.id,
          sceneCount: saved.scenes.length,
          completedScenes: saved.scenes.filter((scene) => scene.status === 'completed').length,
          qualityGate: saved.qualityGate,
          scenes: saved.scenes.map((scene) => ({
            id: scene.id,
            order: scene.order,
            status: scene.status,
            provider: scene.provider,
            model: scene.model,
            jobId: scene.jobId,
            providerJobId: scene.providerJobId,
            artifactId: scene.artifactId,
            error: scene.error,
          })),
        }),
        errorMessage: saved.error ?? saved.blocker,
        completedAt: terminal ? new Date() : null,
        startedAt: saved.status !== 'planned' ? new Date() : undefined,
      },
    }).catch((error) => {
      console.error('[long-form-video] Failed to sync control-plane job:', error)
    })
  }
  return saved
}

function ensureQualityGate(project: VideoProject): VideoProject {
  if (project.qualityGate) return project
  return {
    ...project,
    qualityGate: buildInitialQualityGate(project.scenes, Boolean(project.audioReference)),
  }
}

export function buildLongFormScenePrompts(input: {
  prompt: string
  sceneCount: number
  sceneDuration: number
  style: string
  tone: string
  context?: string
}): string[] {
  const beats = [
    ['opening product context', 'establish the real business, location, audience, and brand promise'],
    ['customer problem moment', 'show the viewer need or pain point the offer solves'],
    ['solution demonstration', 'show the product or service in use with concrete benefits'],
    ['proof and trust detail', 'show credentials, process, outcomes, or social proof'],
    ['conversion close', 'show the call to action and memorable final brand frame'],
  ] as const
  return Array.from({ length: input.sceneCount }, (_, index) => {
    const beat = beats[index % beats.length]
    return [
      `${input.style} ${input.tone} ${beat[0]}.`,
      `Primary visual intent: ${beat[1]}.`,
      `Brand/request: ${input.prompt.trim()}.`,
      `Shot direction: use a distinct camera setup, foreground subject, background, and action for this beat.`,
      `Target duration: ${input.sceneDuration} seconds.`,
      input.context,
    ].filter(Boolean).join('\n')
  })
}

export function evaluateLongFormScenePlan(prompts: string[]): Pick<LongFormQualityGate, 'scenePlanGeneric' | 'scenePromptsDistinct' | 'notes'> {
  const generic = prompts.some((prompt) =>
    /\bscene\s+\d+\s+of\s+\d+\b/i.test(prompt)
    || !/primary visual intent:/i.test(prompt)
    || !/shot direction:/i.test(prompt)
  )
  const intents = prompts.map((prompt) =>
    prompt.match(/primary visual intent:\s*(.+)/i)?.[1]
      ?.toLowerCase()
      .replace(/\s+/g, ' ')
      .trim() ?? prompt.toLowerCase().replace(/\d+/g, '#').trim(),
  )
  const scenePromptsDistinct = new Set(intents).size === prompts.length
  const notes = [
    generic ? 'Scene plan needs a distinct visual intent and shot direction for every scene.' : 'Scene plan includes distinct visual-intent fields.',
    scenePromptsDistinct ? 'Scene prompts are not simple repeats.' : 'Scene prompts repeat too much to claim coherent creative planning.',
    'Production advert quality, pronunciation, lip sync, and audio/video sync remain unverified until separate quality checks pass.',
  ]
  return { scenePlanGeneric: generic, scenePromptsDistinct, notes }
}

function buildInitialQualityGate(scenes: VideoScene[], hasAudioReference: boolean): LongFormQualityGate {
  const sceneGate = evaluateLongFormScenePlan(scenes.map((scene) => scene.prompt))
  return {
    creativeWorkflowStatus: sceneGate.scenePlanGeneric || !sceneGate.scenePromptsDistinct
      ? 'NEEDS_QUALITY_GATE'
      : 'SOURCE_WIRED_CREATIVE_WORKFLOW',
    scenePlanGeneric: sceneGate.scenePlanGeneric,
    scenePromptsDistinct: sceneGate.scenePromptsDistinct,
    finalOutputDownloadable: false,
    syncQuality: hasAudioReference ? 'metadata_required' : 'not_applicable',
    notes: [
      ...sceneGate.notes,
      hasAudioReference
        ? 'Audio/voice sync cannot be claimed until transcript and timing metadata are attached and checked.'
        : 'No voiceover timing metadata was provided; sync quality is not claimed.',
    ],
  }
}

function updateQualityGate(current: LongFormQualityGate, updates: Partial<LongFormQualityGate>): LongFormQualityGate {
  return {
    ...current,
    ...updates,
    notes: updates.notes ?? current.notes,
  }
}

function exactAssemblyFailure(error: unknown) {
  if (!error || typeof error !== 'object') return 'Final video assembly failed.'
  const value = error as { message?: unknown; stderr?: unknown; code?: unknown; signal?: unknown }
  const details = [
    typeof value.message === 'string' ? value.message : null,
    typeof value.stderr === 'string' && value.stderr.trim() ? value.stderr.trim().slice(0, 1200) : null,
    value.code !== undefined ? `exitCode=${String(value.code)}` : null,
    value.signal !== undefined ? `signal=${String(value.signal)}` : null,
  ].filter(Boolean)
  return details.length ? `Final video assembly failed: ${details.join(' | ')}` : 'Final video assembly failed.'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
