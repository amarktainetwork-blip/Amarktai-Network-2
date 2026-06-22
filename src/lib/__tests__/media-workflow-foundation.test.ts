import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createArtifact: vi.fn(),
  createControlPlaneJob: vi.fn(),
  startControlPlaneAttempt: vi.fn(),
  finishControlPlaneAttempt: vi.fn(),
  testLocalTool: vi.fn(),
  execFile: vi.fn(),
  resolveStoragePath: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: mocks.execFile,
}))

vi.mock('@/lib/artifact-store', () => ({
  createArtifact: mocks.createArtifact,
}))

vi.mock('@/lib/control-plane-jobs', () => ({
  createControlPlaneJob: mocks.createControlPlaneJob,
  startControlPlaneAttempt: mocks.startControlPlaneAttempt,
  finishControlPlaneAttempt: mocks.finishControlPlaneAttempt,
}))

vi.mock('@/lib/local-tools', () => ({
  testLocalTool: mocks.testLocalTool,
}))

vi.mock('@/lib/storage-root', () => ({
  resolveStoragePath: mocks.resolveStoragePath,
}))

describe('media workflow foundation', () => {
  let tempRoot: string

  beforeEach(() => {
    vi.clearAllMocks()
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'amarktai-media-foundation-'))
    mocks.resolveStoragePath.mockImplementation((key: string) => path.join(tempRoot, key))
    mocks.testLocalTool.mockImplementation(async (id: string) => ({
      id,
      connected: true,
      capabilities: [id],
      detail: `${id} ready`,
      setupCommand: 'setup',
    }))
    mocks.createArtifact.mockImplementation(async (input: { type: string; subType?: string }) => ({
      id: `artifact-${input.type}-${input.subType ?? 'default'}`,
      previewUrl: `/preview/${input.type}`,
      downloadUrl: `/download/${input.type}`,
      storageUrl: `/storage/${input.type}`,
    }))
    mocks.createControlPlaneJob.mockResolvedValue({ id: 'job-long-form-1' })
    mocks.startControlPlaneAttempt.mockResolvedValue({ id: 'attempt-long-form-1' })
    mocks.finishControlPlaneAttempt.mockResolvedValue({ id: 'job-long-form-1', status: 'completed' })
    mocks.execFile.mockImplementation((command: string, args: string[], options: unknown, callback?: (...values: unknown[]) => void) => {
      const cb = typeof options === 'function' ? options : callback
      const output = args.at(-1)
      if (typeof output === 'string' && /\.(mp4|wav)$/i.test(output)) {
        fs.mkdirSync(path.dirname(output), { recursive: true })
        fs.writeFileSync(output, Buffer.from(`${command}:${path.basename(output)}`))
      }
      cb?.(null, args.includes('-show_entries') ? '1.25\n' : '', '')
      return { pid: 1 }
    })
  })

  it('assembles provided clips into a persisted long-form video artifact and job', async () => {
    const { proveLongFormAssemblyFromProvidedClips } = await import('@/lib/media-workflow-foundation')

    const result = await proveLongFormAssemblyFromProvidedClips({
      appSlug: 'proof-app',
      sceneCount: 2,
      durationSeconds: 1,
    })

    expect(result.status).toBe('completed')
    expect(result.artifactId).toBe('artifact-video-long_form_multi_scene_video_assembly')
    expect(result.jobId).toBe('job-long-form-1')
    expect(mocks.createControlPlaneJob).toHaveBeenCalledWith(expect.objectContaining({
      requestedCapability: 'long_form_multi_scene_video_assembly',
      jobType: 'long_form_video',
      queue: false,
    }))
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'video',
      subType: 'long_form_multi_scene_video_assembly',
      capability: 'long_form_multi_scene_video_assembly',
      metadata: expect.objectContaining({
        productContract: 'technical_ffmpeg_assembly_only',
        creativeWorkflowStatus: 'TECHNICAL_ASSEMBLY_PASSED',
        generatedProviderClip: false,
        providerNativeLongFormProven: false,
        coherentAdvertQualityProven: false,
        sourceClipCount: 2,
      }),
    }))
    expect(mocks.finishControlPlaneAttempt).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      artifactId: 'artifact-video-long_form_multi_scene_video_assembly',
    }))
  })

  it('creates a local audio-bed artifact without claiming provider music generation', async () => {
    const { proveAudioBedGeneration } = await import('@/lib/media-workflow-foundation')

    const result = await proveAudioBedGeneration({
      appSlug: 'proof-app',
      durationSeconds: 2,
    })

    expect(result.status).toBe('completed')
    expect(result.artifactId).toBe('artifact-audio-audio_bed')
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'audio',
      subType: 'audio_bed',
      capability: 'music_audio_bed_generation',
      provider: 'local',
      model: 'ffmpeg',
      metadata: expect.objectContaining({
        productContract: 'audio_bed_assembly',
        providerMusicGeneration: false,
      }),
    }))
  })

  it('formats captions as VTT/SRT metadata and persists a subtitle artifact', async () => {
    const {
      buildSubtitleCues,
      cuesToSrt,
      cuesToVtt,
      proveCaptionsSubtitlesPipeline,
    } = await import('@/lib/media-workflow-foundation')

    const cues = buildSubtitleCues('First caption. Second caption.', 4)
    expect(cuesToVtt(cues)).toContain('WEBVTT')
    expect(cuesToSrt(cues)).toContain('1\n00:00:00,000 -->')

    const result = await proveCaptionsSubtitlesPipeline({
      appSlug: 'proof-app',
      transcript: 'First caption. Second caption.',
      sourceMedia: 'proof-video.mp4',
      durationSeconds: 4,
    })

    expect(result.status).toBe('completed')
    expect(result.artifactId).toBe('artifact-transcript-captions_vtt')
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'transcript',
      subType: 'captions_vtt',
      capability: 'captions_subtitles_pipeline',
      mimeType: 'text/vtt',
      metadata: expect.objectContaining({
        sourceMedia: 'proof-video.mp4',
        cueCount: 2,
        formats: ['vtt', 'srt'],
      }),
    }))
  })

  it('blocks media artifact work when required local tools are unavailable', async () => {
    mocks.testLocalTool.mockImplementation(async (id: string) => ({
      id,
      connected: id !== 'ffmpeg',
      capabilities: [id],
      detail: id === 'ffmpeg' ? 'FFMPEG_REQUIRED' : `${id} ready`,
      setupCommand: 'setup',
    }))
    const { proveAudioBedGeneration } = await import('@/lib/media-workflow-foundation')

    const result = await proveAudioBedGeneration({ appSlug: 'proof-app' })

    expect(result.status).toBe('blocked')
    expect(result.error).toContain('ffmpeg: FFMPEG_REQUIRED')
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })
})
