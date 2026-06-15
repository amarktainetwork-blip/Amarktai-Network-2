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
  const scenes = Array.from({ length: sceneCount }, (_, index): VideoScene => ({
    id: crypto.randomUUID(),
    order: index + 1,
    prompt: [
      `${input.style ?? 'cinematic'} ${input.tone ?? 'confident'} scene ${index + 1} of ${sceneCount}.`,
      input.prompt.trim(),
      `Advance the story visually; do not repeat earlier shots. Target ${sceneDuration} seconds.`,
      context,
    ].filter(Boolean).join('\n'),
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
    },
  })
  return saveProject(project, {
    status: 'completed',
    progress: 100,
    finalArtifactId: artifact.id,
    finalVideoUrl: artifact.previewUrl,
    completedAt: new Date().toISOString(),
    error: null,
    blocker: null,
  })
}

async function runFfmpeg(args: string[]) {
  await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', args, {
    timeout: 20 * 60_000,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  })
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
