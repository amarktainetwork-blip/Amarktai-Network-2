import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>()
  return {
    records,
    getGenXJobStatus: vi.fn(),
    persistCanonicalMediaResult: vi.fn(),
  }
})

vi.mock('@/lib/local-json-store', () => ({
  LOCAL_STORE_FILES: { mediaJobs: 'jobs/media-jobs.json' },
  generateId: vi.fn(() => 'local-media-job-1'),
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

vi.mock('@/lib/genx-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/genx-client')>()
  return {
    ...actual,
    getGenXJobStatus: mocks.getGenXJobStatus,
  }
})

vi.mock('@/lib/canonical-media-artifact', () => ({
  persistCanonicalMediaResult: mocks.persistCanonicalMediaResult,
}))

import {
  createLocalMediaJob,
  localMediaJobResponse,
  pollLocalMediaJob,
} from '@/lib/media-job-store'
import { normalizeGovernedCapability } from '@/lib/provider-capability-governance'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

beforeEach(() => {
  mocks.records.clear()
  mocks.getGenXJobStatus.mockReset()
  mocks.persistCanonicalMediaResult.mockReset()
})

describe('local media job lifecycle', () => {
  it('returns a local job ID and poll URL for provider async work', () => {
    const job = createLocalMediaJob({
      capability: 'image_generation',
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'studio_image',
      title: 'Image',
      prompt: 'A glass city',
      provider: 'genx',
      model: 'gpt-image-2',
      providerJobId: 'provider-job-1',
    })

    expect(localMediaJobResponse(job)).toMatchObject({
      success: true,
      jobStatus: 'processing',
      jobId: 'local-media-job-1',
      providerJobId: 'provider-job-1',
      pollUrl: '/api/brain/media-jobs/local-media-job-1',
      artifactId: null,
    })
  })

  it('persists completed provider media as a canonical artifact', async () => {
    createLocalMediaJob({
      capability: 'music_generation',
      appSlug: 'amarktai-network',
      type: 'music',
      subType: 'generated_audio',
      title: 'Song',
      prompt: 'Cinematic instrumental',
      provider: 'genx',
      model: 'lyria-3-clip-preview',
      providerJobId: 'provider-job-2',
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'provider-job-2',
      status: 'completed',
      resultUrl: 'https://cdn.example/song.mp3',
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-1',
      storageUrl: '/api/admin/artifacts/artifact-1/content',
      mediaUrl: '/api/admin/artifacts/artifact-1/content',
    })

    const completed = await pollLocalMediaJob('local-media-job-1')

    expect(completed).toMatchObject({
      status: 'completed',
      artifactId: 'artifact-1',
      storageUrl: '/api/admin/artifacts/artifact-1/content',
      error: null,
    })
    expect(mocks.persistCanonicalMediaResult).toHaveBeenCalledWith(expect.objectContaining({
      type: 'music',
      provider: 'genx',
      traceId: 'media-job-local-media-job-1',
    }))
  })

  it('fails stale jobs instead of leaving them processing forever', async () => {
    const job = createLocalMediaJob({
      capability: 'tts',
      appSlug: 'amarktai-network',
      type: 'audio',
      subType: 'tts',
      title: 'Voice',
      prompt: 'Hello',
      provider: 'genx',
      model: 'grok-tts',
      providerJobId: 'provider-job-3',
    })
    mocks.records.set(job.id, {
      ...job,
      createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    })

    const failed = await pollLocalMediaJob(job.id)

    expect(failed).toMatchObject({ status: 'failed' })
    expect(failed?.error).toContain('15 minutes')
    expect(mocks.getGenXJobStatus).not.toHaveBeenCalled()
  })
})

describe('live media route contracts', () => {
  it('recognizes avatar video without advertising a fake provider', () => {
    expect(normalizeGovernedCapability('avatar_video')).toBe('avatar_video')
    expect(read('app/api/brain/avatar-video/route.ts')).toContain('delegateJsonCapability')
    expect(read('app/api/brain/avatar-video/route.ts')).toContain("capability: 'avatar_video'")
  })

  it('advertises Groq only because the canonical adapter implements TTS', () => {
    expect(MEDIA_CAPABILITY_ROUTES.tts.providers.map((entry) => entry.provider)).toContain('groq')
    const route = read('app/api/brain/tts/route.ts')
    const adapters = read('lib/ai-capability-adapters.ts')
    expect(route).toContain('delegateJsonCapability')
    expect(adapters).toContain('/audio/speech')
    expect(adapters).toContain("provider === 'groq'")
  })

  it('uses canonical video capability and exposes local polling in Studio', () => {
    const studio = read('app/api/admin/studio/execute/route.ts')
    expect(studio).toContain("capability === 'video_generation'")
    expect(studio).toContain('mediaStudioResponse')
    expect(studio).toContain('normalizeVocalStyle')
  })

  it('exposes Brain image polling without leaking provider jobs as the only job ID', () => {
    const imageRoute = read('app/api/brain/image/route.ts')
    const mediaJobRoute = read('app/api/brain/media-jobs/[jobId]/route.ts')

    expect(imageRoute).toContain('pollUrl: result.pollUrl')
    expect(imageRoute).toContain('providerJobId: result.providerJobId')
    expect(imageRoute).toContain("result.status === 'processing' ? 202")
    expect(mediaJobRoute).not.toContain('getSession')
    expect(mediaJobRoute).not.toContain('Unauthorized')
  })
})
