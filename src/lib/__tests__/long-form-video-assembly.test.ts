import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>()
  let idCounter = 0
  return {
    records,
    callGenXMedia: vi.fn(),
    getGenXJobStatus: vi.fn(),
    persistCanonicalMediaResult: vi.fn(),
    recordProviderResult: vi.fn(async () => null),
    getFfmpegStatus: vi.fn(),
    stitchVideoClips: vi.fn(),
    nextId: () => {
      idCounter += 1
      return `long-form-job-${idCounter}`
    },
    resetIds: () => {
      idCounter = 0
    },
  }
})

vi.mock('@/lib/local-json-store', () => ({
  LOCAL_STORE_FILES: { longFormVideoJobs: 'jobs/long-form-video-jobs.json' },
  generateId: vi.fn(() => mocks.nextId()),
  appendRecord: vi.fn((_file: string, record: Record<string, unknown>) => {
    mocks.records.set(String(record.id), record)
    return record
  }),
  findRecord: vi.fn((_file: string, id: string) => mocks.records.get(id) ?? null),
  updateRecord: vi.fn((_file: string, id: string, updates: Record<string, unknown>) => {
    const current = mocks.records.get(id)
    if (!current) return null
    const updated = { ...current, ...updates }
    mocks.records.set(id, updated)
    return updated
  }),
}))

vi.mock('@/lib/genx-client', () => ({
  GENX_VIDEO_MODELS: ['veo-3.1'],
  callGenXMedia: mocks.callGenXMedia,
  getGenXJobStatus: mocks.getGenXJobStatus,
}))

vi.mock('@/lib/canonical-media-artifact', () => ({
  persistCanonicalMediaResult: mocks.persistCanonicalMediaResult,
}))

vi.mock('@/lib/provider-result-log', () => ({
  recordProviderResult: mocks.recordProviderResult,
}))

vi.mock('@/lib/video-stitcher', () => ({
  getFfmpegStatus: mocks.getFfmpegStatus,
  stitchVideoClips: mocks.stitchVideoClips,
}))

import {
  longFormVideoJobResponse,
  pollLongFormVideoJob,
  startLongFormVideoJob,
} from '@/lib/long-form-video-store'

beforeEach(() => {
  mocks.records.clear()
  mocks.resetIds()
  mocks.callGenXMedia.mockReset()
  mocks.getGenXJobStatus.mockReset()
  mocks.persistCanonicalMediaResult.mockReset()
  mocks.recordProviderResult.mockReset()
  mocks.recordProviderResult.mockResolvedValue(null)
  mocks.getFfmpegStatus.mockReset()
  mocks.stitchVideoClips.mockReset()
})

describe('long-form video assembly jobs', () => {
  it('accepts a 90s+ direct GenX provider job and keeps proof processing until final artifact ingestion', async () => {
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'genx-direct-90',
      status: 'processing',
      model: 'veo-3.1',
      latencyMs: 10,
      error: null,
    })

    const started = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second product story',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })

    expect(mocks.callGenXMedia).toHaveBeenCalledWith(expect.objectContaining({ duration: 90, type: 'video' }))
    expect(started).toMatchObject({
      status: 'processing',
      phase: 'generating_scenes',
      strategy: 'direct_provider',
      providerJobId: 'genx-direct-90',
    })
    expect(longFormVideoJobResponse(started).proof).toMatchObject({ proofStatus: 'processing', artifactId: null })
    expect(mocks.recordProviderResult).not.toHaveBeenCalled()

    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'genx-direct-90',
      status: 'completed',
      resultUrl: 'https://cdn.genx.example/long-90.mp4',
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-long-1',
      storageUrl: '/api/artifacts/file/artifacts/demo/video/long.mp4',
      mediaUrl: '/api/artifacts/file/artifacts/demo/video/long.mp4',
      storagePath: 'artifacts/demo/video/long.mp4',
      blocker: null,
    })

    const completed = await pollLongFormVideoJob(started.id)

    expect(completed).toMatchObject({
      status: 'completed',
      phase: 'completed',
      strategy: 'direct_provider',
      artifactId: 'artifact-long-1',
      storageUrl: '/api/artifacts/file/artifacts/demo/video/long.mp4',
    })
    expect(mocks.persistCanonicalMediaResult).toHaveBeenCalledWith(expect.objectContaining({
      type: 'video',
      subType: 'long_form_video',
      metadata: expect.objectContaining({ targetDurationSeconds: 90, strategy: 'direct_provider' }),
    }))
    expect(mocks.recordProviderResult).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'long_form_video',
      success: true,
      artifactId: 'artifact-long-1',
      metadata: expect.objectContaining({ proofStatus: 'passed' }),
    }))
    expect(longFormVideoJobResponse(completed!).videoUrl).toBe('/api/artifacts/file/artifacts/demo/video/long.mp4')
  })

  it('splits into scene jobs and stitches final video when direct long-form is rejected and ffmpeg is available', async () => {
    mocks.callGenXMedia
      .mockResolvedValueOnce({
        success: false,
        url: null,
        jobId: null,
        status: 'failed',
        model: 'veo-3.1',
        latencyMs: 10,
        error: 'duration exceeds provider max 30s',
      })
      .mockResolvedValue({
        success: true,
        url: null,
        jobId: 'scene-provider-job',
        status: 'processing',
        model: 'veo-3.1',
        latencyMs: 10,
        error: null,
      })
    mocks.getFfmpegStatus.mockResolvedValue({ available: true, ffmpegPath: 'ffmpeg', error: null })

    const started = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second campaign film. Scene two. Scene three.',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })

    expect(started.strategy).toBe('scene_stitched')
    expect(started.phase).toBe('generating_scenes')
    expect(started.scenes).toHaveLength(3)
    expect(started.scenes.every((scene) => scene.durationSeconds <= 30)).toBe(true)
    expect(mocks.callGenXMedia).toHaveBeenCalledTimes(4)

    mocks.getGenXJobStatus.mockResolvedValue({
      status: 'completed',
      resultUrl: 'https://cdn.genx.example/scene.mp4',
    })
    mocks.persistCanonicalMediaResult.mockImplementation(async (input: { subType: string; traceId: string }) => {
      if (input.subType === 'long_form_video_scene') {
        const sceneNumber = input.traceId.split('-').pop()
        return {
          artifactId: `artifact-scene-${sceneNumber}`,
          storageUrl: `/api/artifacts/file/artifacts/demo/video/scene-${sceneNumber}.mp4`,
          mediaUrl: `/api/artifacts/file/artifacts/demo/video/scene-${sceneNumber}.mp4`,
          storagePath: `artifacts/demo/video/scene-${sceneNumber}.mp4`,
          blocker: null,
        }
      }
      return {
        artifactId: 'artifact-final',
        storageUrl: '/api/artifacts/file/artifacts/demo/video/final.mp4',
        mediaUrl: '/api/artifacts/file/artifacts/demo/video/final.mp4',
        storagePath: 'artifacts/demo/video/final.mp4',
        blocker: null,
      }
    })
    mocks.stitchVideoClips.mockResolvedValue({
      success: true,
      content: Buffer.from('stitched-video'),
      error: null,
      ffmpegPath: 'ffmpeg',
    })

    const completed = await pollLongFormVideoJob(started.id)

    expect(mocks.stitchVideoClips).toHaveBeenCalledWith(expect.objectContaining({
      clips: expect.arrayContaining([
        expect.objectContaining({ storagePath: 'artifacts/demo/video/scene-1.mp4' }),
        expect.objectContaining({ storagePath: 'artifacts/demo/video/scene-2.mp4' }),
        expect.objectContaining({ storagePath: 'artifacts/demo/video/scene-3.mp4' }),
      ]),
    }))
    expect(completed).toMatchObject({
      status: 'completed',
      phase: 'completed',
      strategy: 'scene_stitched',
      artifactId: 'artifact-final',
      storageUrl: '/api/artifacts/file/artifacts/demo/video/final.mp4',
    })
    expect(mocks.persistCanonicalMediaResult).toHaveBeenLastCalledWith(expect.objectContaining({
      subType: 'long_form_video',
      result: expect.objectContaining({ videoBase64: Buffer.from('stitched-video').toString('base64') }),
    }))
  })

  it('returns an exact blocker when direct long-form fails and ffmpeg is unavailable', async () => {
    mocks.callGenXMedia.mockResolvedValue({
      success: false,
      url: null,
      jobId: null,
      status: 'failed',
      model: 'veo-3.1',
      latencyMs: 10,
      error: 'duration exceeds provider max 30s',
    })
    mocks.getFfmpegStatus.mockResolvedValue({ available: false, ffmpegPath: null, error: 'ffmpeg is not installed or not available on PATH.' })

    const job = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second film',
      targetDurationSeconds: 90,
    })

    expect(job.status).toBe('failed')
    expect(job.error).toContain('duration exceeds provider max 30s')
    expect(job.error).toContain('ffmpeg is not installed or not on PATH')
    expect(longFormVideoJobResponse(job).proof).toMatchObject({ proofStatus: 'failed' })
  })

  it('identifies the failed scene when a scene provider job fails', async () => {
    mocks.callGenXMedia
      .mockResolvedValueOnce({
        success: false,
        url: null,
        jobId: null,
        status: 'failed',
        model: 'veo-3.1',
        latencyMs: 10,
        error: 'duration exceeds provider max 30s',
      })
      .mockImplementation(async (_input: unknown) => ({
        success: true,
        url: null,
        jobId: `scene-job-${mocks.callGenXMedia.mock.calls.length}`,
        status: 'processing',
        model: 'veo-3.1',
        latencyMs: 10,
        error: null,
      }))
    mocks.getFfmpegStatus.mockResolvedValue({ available: true, ffmpegPath: 'ffmpeg', error: null })
    const started = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second film',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })
    mocks.getGenXJobStatus
      .mockResolvedValueOnce({ status: 'completed', resultUrl: 'https://cdn.example/scene-1.mp4' })
      .mockResolvedValueOnce({ status: 'failed', error: 'provider quota exhausted' })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'scene-1-artifact',
      storageUrl: '/api/artifacts/file/scene-1.mp4',
      mediaUrl: '/api/artifacts/file/scene-1.mp4',
      storagePath: 'scene-1.mp4',
      blocker: null,
    })

    const failed = await pollLongFormVideoJob(started.id)

    expect(failed).toMatchObject({ status: 'failed', phase: 'failed' })
    expect(failed?.error).toBe('Scene 2 provider failed: provider quota exhausted')
    expect(mocks.stitchVideoClips).not.toHaveBeenCalled()
  })
})
