import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>()
  return {
    records,
    getGenXJobStatus: vi.fn(),
    persistCanonicalMediaResult: vi.fn(),
    recordProviderResult: vi.fn(async () => null),
  }
})

vi.mock('@/lib/local-json-store', () => ({
  LOCAL_STORE_FILES: { mediaJobs: 'jobs/media-jobs.json', avatarLibrary: 'avatars/avatar-library.json' },
  generateId: vi.fn(() => 'local-media-job-1'),
  appendRecord: vi.fn((_file: string, record: Record<string, unknown>) => {
    mocks.records.set(String(record.id), record)
    return record
  }),
  findRecord: vi.fn((_file: string, id: string) => mocks.records.get(id) ?? null),
  listRecords: vi.fn((_file: string, predicate?: (record: Record<string, unknown>) => boolean) => {
    const values = [...mocks.records.values()]
    return predicate ? values.filter(predicate) : values
  }),
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

vi.mock('@/lib/provider-result-log', () => ({
  recordProviderResult: mocks.recordProviderResult,
}))

import {
  createLocalMediaJob,
  localMediaJobResponse,
  pollLocalMediaJob,
} from '@/lib/media-job-store'
import { normalizeGovernedCapability } from '@/lib/provider-capability-governance'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { routeLiveModel } from '@/lib/live-ai-routing'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

beforeEach(() => {
  mocks.records.clear()
  mocks.getGenXJobStatus.mockReset()
  mocks.persistCanonicalMediaResult.mockReset()
  mocks.recordProviderResult.mockReset()
  mocks.recordProviderResult.mockResolvedValue(null)
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
      proof: expect.objectContaining({ proofStatus: 'processing' }),
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
    expect(mocks.recordProviderResult).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'music_generation',
      provider: 'genx',
      artifactId: 'artifact-1',
      metadata: expect.objectContaining({ proofStatus: 'passed' }),
    }))
    expect(localMediaJobResponse(completed!)).toMatchObject({
      proof: expect.objectContaining({ proofStatus: 'passed', artifactId: 'artifact-1' }),
    })
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
    expect(localMediaJobResponse(failed!)).toMatchObject({
      proof: expect.objectContaining({ proofStatus: 'failed' }),
    })
  })

  it('fails completed provider jobs when artifact ingestion fails', async () => {
    createLocalMediaJob({
      capability: 'image_generation',
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'studio_image',
      title: 'Image',
      prompt: 'A glass city',
      provider: 'genx',
      model: 'gpt-image-2',
      providerJobId: 'provider-job-4',
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'provider-job-4',
      status: 'completed',
      resultUrl: 'https://query.genx.sh/api/v1/jobs/provider-job-4/file',
    })
    mocks.persistCanonicalMediaResult.mockRejectedValue(new Error('remote media fetch failed with HTTP 403'))

    const failed = await pollLocalMediaJob('local-media-job-1')

    expect(failed).toMatchObject({
      status: 'failed',
      artifactId: null,
      storageUrl: null,
      error: 'Provider completed but artifact ingestion failed: remote media fetch failed with HTTP 403',
    })
    expect(localMediaJobResponse(failed!)).toMatchObject({
      blocker: 'Provider completed but artifact ingestion failed: remote media fetch failed with HTTP 403',
      proof: expect.objectContaining({ proofStatus: 'failed' }),
    })
  })

  it('records completed avatar provider jobs in the reusable avatar library after artifact ingestion', async () => {
    createLocalMediaJob({
      capability: 'avatar_video',
      appSlug: 'amarktai-network',
      type: 'video',
      subType: 'avatar_video',
      title: 'Avatar: Ada',
      prompt: 'Create a reusable talking avatar.',
      provider: 'genx',
      model: 'veo-3.1-fast',
      providerJobId: 'provider-avatar-job-1',
      metadata: {
        avatarId: 'avatar-ada',
        avatarName: 'Ada',
        avatarLibrary: 'brand-library',
        persona: 'Helpful operator',
      },
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'provider-avatar-job-1',
      status: 'completed',
      resultUrl: 'https://cdn.example/avatar.mp4',
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-avatar-1',
      storageUrl: '/api/artifacts/file/artifact-avatar-1',
      mediaUrl: '/api/artifacts/file/artifact-avatar-1',
    })

    const completed = await pollLocalMediaJob('local-media-job-1')
    const avatar = mocks.records.get('avatar-ada')

    expect(completed).toMatchObject({
      status: 'completed',
      artifactId: 'artifact-avatar-1',
      storageUrl: '/api/artifacts/file/artifact-avatar-1',
    })
    expect(avatar).toMatchObject({
      id: 'avatar-ada',
      avatarId: 'avatar-ada',
      library: 'brand-library',
      name: 'Ada',
      artifactId: 'artifact-avatar-1',
      artifactUrl: '/api/artifacts/file/artifact-avatar-1',
      provider: 'genx',
    })
  })

  it('records avatar image jobs as avatar_image without promoting avatar_video proof', async () => {
    createLocalMediaJob({
      capability: 'avatar_image',
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'avatar_image',
      title: 'Avatar: Ada image',
      prompt: 'Create a reusable avatar image.',
      provider: 'genx',
      model: 'gpt-image-2',
      providerJobId: 'provider-avatar-image-job-1',
      metadata: {
        avatarId: 'avatar-ada-image',
        avatarName: 'Ada Image',
        avatarLibrary: 'brand-library',
        persona: 'Helpful operator',
      },
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'provider-avatar-image-job-1',
      status: 'completed',
      resultUrl: 'https://cdn.example/avatar.png',
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-avatar-image-1',
      storageUrl: '/api/artifacts/file/artifact-avatar-image-1',
      mediaUrl: '/api/artifacts/file/artifact-avatar-image-1',
    })

    const completed = await pollLocalMediaJob('local-media-job-1')

    expect(completed).toMatchObject({
      status: 'completed',
      capability: 'avatar_image',
      artifactId: 'artifact-avatar-image-1',
    })
    expect(mocks.recordProviderResult).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'avatar_image',
      contentType: 'image',
    }))
    expect(mocks.recordProviderResult).not.toHaveBeenCalledWith(expect.objectContaining({
      capability: 'avatar_video',
    }))
  })
})

describe('live media route contracts', () => {
  it('recognizes avatar video without advertising a fake provider', () => {
    expect(normalizeGovernedCapability('avatar_video')).toBe('avatar_video')
    const route = read('app/api/brain/avatar-video/route.ts')
    expect(route).toContain('callGenXMedia')
    expect(route).toContain('persistCanonicalMediaResult')
    expect(route).toContain('recordAvatarLibraryEntry')
    expect(route).toContain("mode === 'video' ? 'avatar_video' : 'avatar_image'")
    expect(route).toContain('avatarVideoProofEligible')
    expect(route).not.toContain('avatar video provider unavailable')
  })

  it('does not advertise Groq as a canonical TTS provider', () => {
    expect(MEDIA_CAPABILITY_ROUTES.tts.providers.map((entry) => entry.provider)).not.toContain('groq')
    expect(routeLiveModel({ capability: 'tts' }).selectedProvider).not.toBe('groq')
    expect(read('app/api/brain/tts/route.ts')).toContain('Groq TTS is not an approved working audio execution route.')
  })

  it('uses canonical video capability and exposes local polling in Studio', () => {
    const studio = read('app/api/admin/studio/execute/route.ts')
    expect(studio).toContain("if (tab === 'Video') return 'video_generation'")
    expect(studio).toContain('pollUrl: tracked?.pollUrl ?? null')
    expect(studio).toContain("proofStatus: processing ? 'processing' : 'failed'")
    expect(studio).toContain("const vocalStyle = stringControl(controls, 'vocalStyle', stringControl(controls, 'vocals', 'instrumental_only'))")
    expect(studio).toContain("const duration = Math.max(180, durationSeconds(stringControl(controls, 'duration', '180s'), 180))")
    expect(studio).toContain("stringArrayControl(controls, 'genres'")
  })
})
