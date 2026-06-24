import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { createArtifact } from '@/lib/artifact-store'
import {
  createControlPlaneJob,
  finishControlPlaneAttempt,
  startControlPlaneAttempt,
} from '@/lib/control-plane-jobs'
import { testLocalTool } from '@/lib/local-tools'
import { resolveStoragePath } from '@/lib/storage-root'

const execFileAsync = promisify(execFile)

type FoundationStatus = 'completed' | 'blocked' | 'failed'

export interface MediaFoundationResult {
  status: FoundationStatus
  artifactId: string | null
  artifactUrl: string | null
  jobId: string | null
  diagnostics: Record<string, unknown>
  error: string | null
}

export interface SubtitleCue {
  startSeconds: number
  endSeconds: number
  text: string
}

type ToolId = 'ffmpeg' | 'ffprobe' | 'storage'

async function requireTools(ids: ToolId[]): Promise<{ ok: true } | { ok: false; error: string; diagnostics: Record<string, unknown> }> {
  const results = await Promise.all(ids.map((id) => testLocalTool(id)))
  const missing = results.filter((result) => !result.connected)
  if (missing.length === 0) return { ok: true }
  return {
    ok: false,
    error: missing.map((tool) => `${tool.id}: ${tool.detail}`).join(' | '),
    diagnostics: {
      tools: Object.fromEntries(results.map((tool) => [tool.id, {
        connected: tool.connected,
        detail: tool.detail,
        setupCommand: tool.setupCommand,
      }])),
    },
  }
}

async function runFfmpeg(args: string[]) {
  await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', args, {
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  })
}

async function validateMedia(file: string, kind: 'audio' | 'video') {
  const output = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], {
    timeout: 30_000,
    windowsHide: true,
  })
  const stdout = typeof output === 'string' ? output : String(output.stdout ?? '')
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`ffprobe could not validate ${kind} output ${path.basename(file)}.`)
  }
  return duration
}

export async function proveLongFormAssemblyFromProvidedClips(input: {
  appSlug: string
  title?: string
  prompt?: string
  sceneCount?: number
  durationSeconds?: number
}): Promise<MediaFoundationResult> {
  const tools = await requireTools(['ffmpeg', 'ffprobe', 'storage'])
  if (!tools.ok) {
    return { status: 'blocked', artifactId: null, artifactUrl: null, jobId: null, diagnostics: tools.diagnostics, error: tools.error }
  }

  try {
    const id = randomUUID()
    const sceneCount = Math.min(Math.max(Math.round(input.sceneCount ?? 2), 1), 3)
    const duration = Math.min(Math.max(input.durationSeconds ?? 1.2, 0.8), 4)
    const workspace = resolveStoragePath(`workspaces/media-foundation/long-form-${id}`)
    await fs.mkdir(workspace, { recursive: true })

    const clips: string[] = []
    const colors = ['0x102a43', '0x5f0f40', '0x14532d']
    for (let index = 0; index < sceneCount; index += 1) {
      const clip = path.join(workspace, `scene-${index + 1}.mp4`)
      await runFfmpeg([
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=${colors[index] ?? colors[0]}:s=640x360:d=${duration}:r=24`,
        '-f', 'lavfi',
        '-i', `anullsrc=channel_layout=stereo:sample_rate=48000`,
        '-shortest',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        clip,
      ])
      await validateMedia(clip, 'video')
      clips.push(clip)
    }

    const concatFile = path.join(workspace, 'concat.txt')
    await fs.writeFile(concatFile, clips.map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`).join('\n'))
    const finalVideo = path.join(workspace, 'long-form-proof.mp4')
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', finalVideo])
    const finalDuration = await validateMedia(finalVideo, 'video')

    const job = await createControlPlaneJob({
      appSlug: input.appSlug,
      requestedCapability: 'long_form_multi_scene_video_assembly',
      canonicalCapability: 'long_form_video_assembly',
      jobType: 'long_form_video',
      queue: false,
      selectedRoute: {
        pipeline: 'media_workflow_foundation',
        source: 'provided_ffmpeg_proof_clips',
      },
      metadata: {
        prompt: input.prompt ?? 'Minimal provided-clip long-form assembly proof.',
        sceneCount,
        generatedProviderClip: false,
        proofOnly: true,
        productContract: 'technical_ffmpeg_assembly_only',
        creativeWorkflowStatus: 'TECHNICAL_ASSEMBLY_PASSED',
        providerNativeLongFormProven: false,
        coherentAdvertQualityProven: false,
      },
    })
    const attempt = await startControlPlaneAttempt({
      jobId: job.id,
      provider: 'local',
      model: 'ffmpeg',
      adapter: 'media_workflow_foundation.long_form_assembly',
      outputType: 'video',
    })
    const artifact = await createArtifact({
      appSlug: input.appSlug,
      jobId: job.id,
      type: 'video',
      subType: 'long_form_multi_scene_video_assembly',
      capability: 'long_form_multi_scene_video_assembly',
      title: input.title ?? 'Long-form assembly proof',
      description: input.prompt ?? 'Minimal provided-clip long-form assembly proof.',
      provider: 'local',
      model: 'ffmpeg',
      mimeType: 'video/mp4',
      content: await fs.readFile(finalVideo),
      metadata: {
        proofOnly: true,
        productContract: 'technical_ffmpeg_assembly_only',
        creativeWorkflowStatus: 'TECHNICAL_ASSEMBLY_PASSED',
        sourceClipCount: clips.length,
        sourceMedia: clips.map((clip) => path.basename(clip)),
        generatedProviderClip: false,
        providerNativeLongFormProven: false,
        coherentAdvertQualityProven: false,
        voiceSyncQuality: 'not_checked',
        finalDurationSeconds: finalDuration,
        workspace,
      },
    })
    await finishControlPlaneAttempt({
      attemptId: attempt.id,
      status: 'completed',
      latencyMs: 0,
      artifactId: artifact.id,
      responseMetadata: {
        sourceClipCount: clips.length,
        finalDurationSeconds: finalDuration,
        artifactId: artifact.id,
        productContract: 'technical_ffmpeg_assembly_only',
        creativeWorkflowStatus: 'TECHNICAL_ASSEMBLY_PASSED',
        generatedProviderClip: false,
        providerNativeLongFormProven: false,
        coherentAdvertQualityProven: false,
        voiceSyncQuality: 'not_checked',
      },
    })

    return {
      status: 'completed',
      artifactId: artifact.id,
      artifactUrl: artifact.previewUrl || artifact.downloadUrl || artifact.storageUrl,
      jobId: job.id,
      error: null,
      diagnostics: {
        sourceClipCount: clips.length,
        generatedProviderClip: false,
        finalDurationSeconds: finalDuration,
        artifactId: artifact.id,
        jobId: job.id,
      },
    }
  } catch (error) {
    return {
      status: 'failed',
      artifactId: null,
      artifactUrl: null,
      jobId: null,
      diagnostics: {
        source: 'media_workflow_foundation.long_form_assembly',
        productContract: 'technical_ffmpeg_assembly_only',
        creativeWorkflowStatus: 'BLOCKED_FINAL_ASSEMBLY',
        generatedProviderClip: false,
        providerNativeLongFormProven: false,
        coherentAdvertQualityProven: false,
      },
      error: error instanceof Error ? error.message : 'Long-form assembly proof failed.',
    }
  }
}

export async function proveAudioBedGeneration(input: {
  appSlug: string
  title?: string
  prompt?: string
  durationSeconds?: number
  frequencyHz?: number
}): Promise<MediaFoundationResult> {
  const tools = await requireTools(['ffmpeg', 'ffprobe', 'storage'])
  if (!tools.ok) {
    return { status: 'blocked', artifactId: null, artifactUrl: null, jobId: null, diagnostics: tools.diagnostics, error: tools.error }
  }

  try {
    const id = randomUUID()
    const duration = Math.min(Math.max(input.durationSeconds ?? 2, 1), 15)
    const frequency = Math.min(Math.max(input.frequencyHz ?? 220, 80), 1200)
    const workspace = resolveStoragePath(`workspaces/media-foundation/audio-bed-${id}`)
    await fs.mkdir(workspace, { recursive: true })
    const output = path.join(workspace, 'audio-bed.wav')
    await runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `sine=frequency=${frequency}:duration=${duration}:sample_rate=48000`,
      '-filter:a', 'volume=0.08',
      '-c:a', 'pcm_s16le',
      output,
    ])
    const actualDuration = await validateMedia(output, 'audio')
    const artifact = await createArtifact({
      appSlug: input.appSlug,
      type: 'audio',
      subType: 'audio_bed',
      capability: 'music_audio_bed_generation',
      title: input.title ?? 'Audio-bed proof',
      description: input.prompt ?? 'Local ffmpeg audio-bed composition proof; not provider music generation.',
      provider: 'local',
      model: 'ffmpeg',
      mimeType: 'audio/wav',
      content: await fs.readFile(output),
      metadata: {
        proofOnly: true,
        productContract: 'audio_bed_assembly',
        providerMusicGeneration: false,
        durationSeconds: actualDuration,
        frequencyHz: frequency,
      },
    })
    return {
      status: 'completed',
      artifactId: artifact.id,
      artifactUrl: artifact.previewUrl || artifact.downloadUrl || artifact.storageUrl,
      jobId: null,
      error: null,
      diagnostics: {
        productContract: 'audio_bed_assembly',
        providerMusicGeneration: false,
        durationSeconds: actualDuration,
        artifactId: artifact.id,
      },
    }
  } catch (error) {
    return {
      status: 'failed',
      artifactId: null,
      artifactUrl: null,
      jobId: null,
      diagnostics: { source: 'media_workflow_foundation.audio_bed' },
      error: error instanceof Error ? error.message : 'Audio-bed proof failed.',
    }
  }
}

export function buildSubtitleCues(transcript: string, durationSeconds = 4): SubtitleCue[] {
  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const parts = sentences.length ? sentences : [transcript.trim()].filter(Boolean)
  const safeDuration = Math.max(durationSeconds, parts.length)
  const cueDuration = safeDuration / Math.max(parts.length, 1)
  return parts.map((text, index) => ({
    startSeconds: roundTime(index * cueDuration),
    endSeconds: roundTime(Math.min((index + 1) * cueDuration, safeDuration)),
    text,
  }))
}

export function cuesToVtt(cues: SubtitleCue[]): string {
  return [
    'WEBVTT',
    '',
    ...cues.flatMap((cue) => [
      `${formatTimestamp(cue.startSeconds, '.')} --> ${formatTimestamp(cue.endSeconds, '.')}`,
      cue.text,
      '',
    ]),
  ].join('\n')
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues.map((cue, index) => [
    String(index + 1),
    `${formatTimestamp(cue.startSeconds, ',')} --> ${formatTimestamp(cue.endSeconds, ',')}`,
    cue.text,
    '',
  ].join('\n')).join('\n')
}

export async function proveCaptionsSubtitlesPipeline(input: {
  appSlug: string
  transcript: string
  sourceMedia?: string
  durationSeconds?: number
}): Promise<MediaFoundationResult> {
  const tools = await requireTools(['storage'])
  if (!tools.ok) {
    return { status: 'blocked', artifactId: null, artifactUrl: null, jobId: null, diagnostics: tools.diagnostics, error: tools.error }
  }
  const transcript = input.transcript.trim()
  if (!transcript) {
    return {
      status: 'blocked',
      artifactId: null,
      artifactUrl: null,
      jobId: null,
      diagnostics: { sourceMedia: input.sourceMedia ?? null },
      error: 'Captions/subtitles pipeline requires transcript text or a completed STT transcript artifact.',
    }
  }
  try {
    const cues = buildSubtitleCues(transcript, input.durationSeconds ?? 4)
    const vtt = cuesToVtt(cues)
    const srt = cuesToSrt(cues)
    const artifact = await createArtifact({
      appSlug: input.appSlug,
      type: 'transcript',
      subType: 'captions_vtt',
      capability: 'captions_subtitles_pipeline',
      title: 'Captions/subtitles proof',
      description: 'Subtitle file generated from transcript text.',
      provider: 'local',
      model: 'subtitle_formatter',
      mimeType: 'text/vtt',
      content: Buffer.from(vtt, 'utf8'),
      metadata: {
        sourceMedia: input.sourceMedia ?? null,
        cueCount: cues.length,
        formats: ['vtt', 'srt'],
        srtPreview: srt.slice(0, 2000),
      },
    })
    return {
      status: 'completed',
      artifactId: artifact.id,
      artifactUrl: artifact.previewUrl || artifact.downloadUrl || artifact.storageUrl,
      jobId: null,
      error: null,
      diagnostics: {
        sourceMedia: input.sourceMedia ?? null,
        cueCount: cues.length,
        formats: ['vtt', 'srt'],
        artifactId: artifact.id,
      },
    }
  } catch (error) {
    return {
      status: 'failed',
      artifactId: null,
      artifactUrl: null,
      jobId: null,
      diagnostics: { source: 'media_workflow_foundation.captions' },
      error: error instanceof Error ? error.message : 'Captions/subtitles proof failed.',
    }
  }
}

function formatTimestamp(seconds: number, separator: '.' | ',') {
  const clamped = Math.max(0, seconds)
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const wholeSeconds = Math.floor(clamped % 60)
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000)
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}${separator}${String(millis).padStart(3, '0')}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000
}
