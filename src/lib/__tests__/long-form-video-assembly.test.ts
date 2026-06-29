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
    nextId: () => `long-form-job-${++idCounter}`,
    resetIds: () => { idCounter = 0 },
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
  GENX_DEFAULT_VIDEO_MODEL: 'kling-v2.5-turbo',
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
  it('starts 90s+ long-form jobs as 4-8 second scenes only', async () => {
    mocks.getFfmpegStatus.mockResolvedValue({ available: true, ffmpegPath: 'ffmpeg', error: null })
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'scene-provider-job',
      status: 'processing',
      model: 'kling-v2.5-turbo',
      latencyMs: 10,
      error: null,
    })

    const started = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second campaign film. Scene two. Scene three.',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })

    expect(started.strategy).toBe('scene_stitched')
    expect(started.phase).toBe('generating_scenes')
    expect(started.providerJobId).toBeNull()
    expect(started.scenes).toHaveLength(12)
    expect(started.scenes.every((scene) => scene.durationSeconds >= 4 && scene.durationSeconds <= 8)).toBe(true)
    expect(started.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0)).toBe(90)
    expect(mocks.callGenXMedia).toHaveBeenCalledTimes(12)
    expect(mocks.callGenXMedia).not.toHaveBeenCalledWith(expect.objectContaining({ duration: 90 }))
  })

  it('fails honestly before scene generation when ffmpeg is unavailable', async () => {
    mocks.getFfmpegStatus.mockResolvedValue({ available: false, ffmpegPath: null, error: 'ffmpeg is not installed or not available on PATH.' })

    const job = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second film',
      targetDurationSeconds: 90,
    })

    expect(job.status).toBe('failed')
    expect(job.error).toContain('ffmpeg is not installed or not on PATH')
    expect(mocks.callGenXMedia).not.toHaveBeenCalled()
    expect(longFormVideoJobResponse(job).proof).toMatchObject({ proofStatus: 'failed' })
  })

  it('stitches final video only after all scene jobs complete and persist', async () => {
    mocks.getFfmpegStatus.mockResolvedValue({ available: true, ffmpegPath: 'ffmpeg', error: null })
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'scene-provider-job',
      status: 'processing',
      model: 'kling-v2.5-turbo',
      latencyMs: 10,
      error: null,
    })
    const started = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second campaign film',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })
    mocks.getGenXJobStatus.mockResolvedValue({ status: 'completed', resultUrl: 'https://cdn.example/scene.mp4' })
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

    expect(mocks.stitchVideoClips).toHaveBeenCalled()
    expect(completed).toMatchObject({
      status: 'completed',
      phase: 'completed',
      strategy: 'scene_stitched',
      artifactId: 'artifact-final',
    })
    expect(mocks.persistCanonicalMediaResult).toHaveBeenLastCalledWith(expect.objectContaining({
      subType: 'long_form_video',
      result: expect.objectContaining({ videoBase64: Buffer.from('stitched-video').toString('base64') }),
    }))
  })

  it('records provider details when a scene fails to start', async () => {
    mocks.getFfmpegStatus.mockResolvedValue({ available: true, ffmpegPath: 'ffmpeg', error: null })
    mocks.callGenXMedia.mockResolvedValueOnce({
      success: false,
      url: null,
      jobId: null,
      status: 'failed',
      model: 'kling-v2.5-turbo',
      latencyMs: 10,
      error: 'provider rejected scene prompt',
      statusCode: 400,
      errorDetails: { error: { message: 'invalid scene prompt' } },
      rawErrorBody: '{"error":{"message":"invalid scene prompt"}}',
    })

    const failed = await startLongFormVideoJob({
      appSlug: 'demo',
      prompt: 'A 90 second film',
      targetDurationSeconds: 90,
      sceneCount: 3,
    })

    expect(failed.status).toBe('failed')
    expect(failed.scenes[0]).toMatchObject({
      index: 1,
      status: 'failed',
      provider: 'genx',
      model: 'kling-v2.5-turbo',
      providerStatusCode: 400,
      providerErrorDetails: { error: { message: 'invalid scene prompt' } },
      providerRawErrorBody: '{"error":{"message":"invalid scene prompt"}}',
    })
    expect(failed.scenes[0].requestPayload).toMatchObject({
      model: 'kling-v2.5-turbo',
      params: expect.objectContaining({ type: 'video' }),
      metadata: expect.objectContaining({ sceneIndex: 1 }),
    })
    expect(failed.metadata.failedScene).toMatchObject({
      sceneIndex: 1,
      statusCode: 400,
      rawErrorBody: '{"error":{"message":"invalid scene prompt"}}',
    })
    expect(mocks.stitchVideoClips).not.toHaveBeenCalled()
  })
})
