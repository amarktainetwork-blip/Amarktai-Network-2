import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>()
  return {
    records,
    getGenXJobStatus: vi.fn(),
    persistCanonicalMediaResult: vi.fn(),
    togetherPoll: vi.fn(),
    pollQwenWanxTask: vi.fn(),
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

vi.mock('@/lib/qwen-wanx-polling', () => ({
  pollQwenWanxTask: mocks.pollQwenWanxTask,
}))

vi.mock('@/lib/ai-capability-adapters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-capability-adapters')>()
  return {
    ...actual,
    providerHasCanonicalPollingContract: (provider: string) => ['genx', 'qwen', 'together'].includes(provider),
    getProviderCapabilityAdapter: (provider: string) => provider === 'together'
      ? {
          provider: 'together',
          id: 'together_capability_adapter',
          categories: ['video'],
          execute: vi.fn(),
          poll: mocks.togetherPoll,
        }
      : actual.getProviderCapabilityAdapter(provider as never),
  }
})

import {
  createLocalMediaJob,
  localMediaJobResponse,
  pollLocalMediaJob,
} from '@/lib/media-job-store'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { normalizeGovernedCapability } from '@/lib/provider-capability-governance'
import { getCapability } from '@/lib/providers/capability-registry'
import {
  clearProviderDiscoveryCache,
  discoverProvider,
  resolveProviderEndpoint,
} from '@/lib/providers/provider-discovery'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import { scoreProviderModel } from '@/lib/providers/provider-scoring'
import { getRoutingProfile } from '@/lib/providers/routing-profiles'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

beforeEach(() => {
  mocks.records.clear()
  mocks.getGenXJobStatus.mockReset()
  mocks.persistCanonicalMediaResult.mockReset()
  clearProviderDiscoveryCache()
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

  it('persists completed GenX image jobs as canonical artifacts', async () => {
    createLocalMediaJob({
      capability: 'image_generation',
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'studio_image',
      title: 'Image',
      prompt: 'Cinematic city skyline',
      provider: 'genx',
      model: 'gpt-image-2',
      providerJobId: 'provider-job-2',
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      id: 'provider-job-2',
      status: 'completed',
      resultUrl: 'https://cdn.example/image.png',
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
      mediaUrl: '/api/admin/artifacts/artifact-1/content',
      error: null,
    })
    expect(mocks.persistCanonicalMediaResult).toHaveBeenCalledWith(expect.objectContaining({
      type: 'image',
      provider: 'genx',
      traceId: 'media-job-local-media-job-1',
    }))
    expect(localMediaJobResponse(completed!)).toMatchObject({
      artifactUrl: '/api/admin/artifacts/artifact-1/download',
      previewUrl: '/api/admin/artifacts/artifact-1/download',
      downloadUrl: '/api/admin/artifacts/artifact-1/download',
      imageUrl: '/api/admin/artifacts/artifact-1/download',
      providerJobId: 'provider-job-2',
      pollUrl: '/api/brain/media-jobs/local-media-job-1',
    })
  })

  it('polls Together async video jobs through the canonical Brain local job surface', async () => {
    createLocalMediaJob({
      capability: 'video_generation',
      appSlug: 'amarktai-network',
      type: 'video',
      subType: 'video_generation',
      title: 'Video',
      prompt: 'Launch trailer',
      provider: 'together',
      model: 'together-video-1',
      providerJobId: 'together-job-2',
    })
    mocks.togetherPoll.mockResolvedValue({
      status: 'completed',
      provider: 'together',
      model: 'together-video-1',
      output: { status: 'completed' },
      mediaUrl: 'https://cdn.example/together-video.mp4',
      bytes: null,
      contentType: 'video/mp4',
      providerJobId: 'together-job-2',
      latencyMs: 12,
      rawStatus: 200,
      error: null,
      errorCategory: null,
      retryable: false,
      diagnostics: null,
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-together-1',
      storageUrl: '/api/admin/artifacts/artifact-together-1/content',
      mediaUrl: '/api/admin/artifacts/artifact-together-1/content',
    })

    const completed = await pollLocalMediaJob('local-media-job-1')

    expect(mocks.togetherPoll).toHaveBeenCalledWith('together-job-2', expect.objectContaining({
      model: 'together-video-1',
    }))
    expect(completed).toMatchObject({
      status: 'completed',
      artifactId: 'artifact-together-1',
      mediaUrl: '/api/admin/artifacts/artifact-together-1/content',
    })
    expect(localMediaJobResponse(completed!)).toMatchObject({
      pollUrl: '/api/brain/media-jobs/local-media-job-1',
      providerJobId: 'together-job-2',
      artifactUrl: '/api/admin/artifacts/artifact-together-1/download',
      previewUrl: '/api/admin/artifacts/artifact-together-1/download',
      downloadUrl: '/api/admin/artifacts/artifact-together-1/download',
      videoUrl: '/api/admin/artifacts/artifact-together-1/download',
    })
  })

  it('polls Qwen async media jobs through the canonical Brain local job surface', async () => {
    createLocalMediaJob({
      capability: 'video_generation',
      appSlug: 'amarktai-network',
      type: 'video',
      subType: 'video_generation',
      title: 'Qwen Video',
      prompt: 'City flyover',
      provider: 'qwen',
      model: 'wan2.1-t2v-turbo',
      providerJobId: 'qwen-wan:task-2',
    })
    mocks.pollQwenWanxTask.mockResolvedValue({
      ok: true,
      executed: true,
      provider: 'qwen',
      model: 'wan2.1-t2v-turbo',
      capability: 'text_to_image_poll',
      latencyMs: 11,
      contentType: 'application/json',
      json: {
        output: {
          task_status: 'SUCCEEDED',
          video_url: 'https://cdn.example/qwen-task.mp4',
        },
      },
    })
    mocks.persistCanonicalMediaResult.mockResolvedValue({
      artifactId: 'artifact-qwen-1',
      storageUrl: '/api/admin/artifacts/artifact-qwen-1/content',
      mediaUrl: '/api/admin/artifacts/artifact-qwen-1/content',
    })

    const completed = await pollLocalMediaJob('local-media-job-1')

    expect(mocks.pollQwenWanxTask).toHaveBeenCalledWith({
      taskId: 'task-2',
      model: 'wan2.1-t2v-turbo',
    })
    expect(completed).toMatchObject({
      status: 'completed',
      artifactId: 'artifact-qwen-1',
      mediaUrl: '/api/admin/artifacts/artifact-qwen-1/content',
    })
    expect(localMediaJobResponse(completed!)).toMatchObject({
      artifactUrl: '/api/admin/artifacts/artifact-qwen-1/download',
      previewUrl: '/api/admin/artifacts/artifact-qwen-1/download',
      downloadUrl: '/api/admin/artifacts/artifact-qwen-1/download',
      videoUrl: '/api/admin/artifacts/artifact-qwen-1/download',
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
  })
})

describe('provider discovery runtime fallbacks', () => {
  it('normalizes GenX base-url env aliases for canonical discovery endpoints', () => {
    const previousApiUrl = process.env.GENX_API_URL
    const previousBaseUrl = process.env.GENX_BASE_URL
    const previousTextBaseUrl = process.env.GENX_TEXT_BASE_URL
    process.env.GENX_API_URL = 'https://genx.sh/api/v1/models'
    delete process.env.GENX_BASE_URL
    delete process.env.GENX_TEXT_BASE_URL

    try {
      const genx = PROVIDER_TRUTH.find((entry) => entry.id === 'genx')!
      expect(resolveProviderEndpoint(genx, 'async_generation')).toBe('https://query.genx.sh/api/v1')
      expect(resolveProviderEndpoint(genx, 'streaming_text')).toBe('https://query.genx.sh/v1')
    } finally {
      if (previousApiUrl === undefined) delete process.env.GENX_API_URL
      else process.env.GENX_API_URL = previousApiUrl
      if (previousBaseUrl === undefined) delete process.env.GENX_BASE_URL
      else process.env.GENX_BASE_URL = previousBaseUrl
      if (previousTextBaseUrl === undefined) delete process.env.GENX_TEXT_BASE_URL
      else process.env.GENX_TEXT_BASE_URL = previousTextBaseUrl
    }
  })

  it('strips GenX /v1 and /api/v1 variants without double-appending endpoint paths', () => {
    const genx = PROVIDER_TRUTH.find((entry) => entry.id === 'genx')!
    const previousApiUrl = process.env.GENX_API_URL
    const previousBaseUrl = process.env.GENX_BASE_URL

    const cases = [
      'https://query.genx.sh',
      'https://query.genx.sh/v1',
      'https://query.genx.sh/v1/models',
      'https://query.genx.sh/v1/chat/completions',
      'https://query.genx.sh/api/v1',
      'https://query.genx.sh/api/v1/models',
      'https://genx.sh',
    ]

    try {
      for (const raw of cases) {
        process.env.GENX_API_URL = raw
        process.env.GENX_BASE_URL = raw
        const asyncEndpoint = resolveProviderEndpoint(genx, 'async_generation')
        const textEndpoint = resolveProviderEndpoint(genx, 'streaming_text')
        expect(asyncEndpoint).toBe('https://query.genx.sh/api/v1')
        expect(textEndpoint).toBe('https://query.genx.sh/v1')
        expect(asyncEndpoint).not.toContain('/v1/v1')
        expect(asyncEndpoint).not.toContain('/v1/api/v1')
        expect(asyncEndpoint).not.toContain('/api/v1/api/v1')
      }
    } finally {
      if (previousApiUrl === undefined) delete process.env.GENX_API_URL
      else process.env.GENX_API_URL = previousApiUrl
      if (previousBaseUrl === undefined) delete process.env.GENX_BASE_URL
      else process.env.GENX_BASE_URL = previousBaseUrl
    }
  })

  it('uses the GenX static runtime catalog when live model discovery fails', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const snapshot = await discoverProvider('genx', {
      force: true,
      credential: 'test-genx-key',
      keySource: 'test',
      capability: 'image',
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(snapshot.status).toBe('ready')
    expect(snapshot.error).toContain('static runtime fallback')
    expect(snapshot.models.map((model) => model.id)).toContain('gpt-image-2')
    expect(snapshot.models.map((model) => model.id)).not.toContain('kling-v3-pro-i2v')
    expect(snapshot.models.every((model) => model.provider === 'genx')).toBe(true)
    expect(snapshot.models.every((model) => model.capabilities.includes('image'))).toBe(true)
    expect(snapshot.models.every((model) => model.capabilityEvidence === 'provider_contract')).toBe(true)
  })

  it('keeps GenX fallback models routable when discovery health is degraded', () => {
    const provider = PROVIDER_TRUTH.find((entry) => entry.id === 'genx')!
    const capability = getCapability('image')!
    const candidate = scoreProviderModel({
      provider,
      capability,
      profile: getRoutingProfile('balanced', {
        providerPreference: ['genx'],
        modelPreference: ['gpt-image-2'],
        artifactSupport: true,
      }),
      health: {
        provider: 'genx',
        state: 'degraded',
        configured: true,
        tested: true,
        healthy: false,
        checkedAt: new Date().toISOString(),
        detail: 'Live model discovery failed.',
      },
      model: {
        provider: 'genx',
        id: 'gpt-image-2',
        capabilities: ['image'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        speed: null,
        quality: null,
        cost: null,
        context: null,
        adult: 'unknown',
        streaming: 'unknown',
        research: 'unknown',
        artifactSupport: true,
        raw: {
          source: 'genx_static_runtime_fallback',
          capabilities: ['image'],
        },
        discoveredAt: new Date().toISOString(),
      },
    })

    expect(candidate).toMatchObject({
      provider: 'genx',
      model: { id: 'gpt-image-2', capabilityEvidence: 'provider_contract' },
    })
  })

  it('does not expose unsupported static GenX fallback candidates for unproven families', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const imageToVideo = await discoverProvider('genx', {
      force: true,
      credential: 'test-genx-key',
      keySource: 'test',
      capability: 'image_to_video',
      fetcher: fetcher as unknown as typeof fetch,
    })
    const stt = await discoverProvider('genx', {
      force: true,
      credential: 'test-genx-key',
      keySource: 'test',
      capability: 'stt',
      fetcher: fetcher as unknown as typeof fetch,
    })
    const avatar = await discoverProvider('genx', {
      force: true,
      credential: 'test-genx-key',
      keySource: 'test',
      capability: 'avatar',
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(imageToVideo).toMatchObject({ status: 'failed', models: [] })
    expect(stt).toMatchObject({ status: 'failed', models: [] })
    expect(avatar).toMatchObject({ status: 'failed', models: [] })
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
    const legacyVideoRoute = read('app/api/brain/video-generate/[jobId]/route.ts')

    expect(imageRoute).toContain('pollUrl: result.pollUrl')
    expect(imageRoute).toContain('providerJobId: result.providerJobId')
    expect(imageRoute).toContain("result.status === 'processing' ? 202")
    expect(mediaJobRoute).not.toContain('getSession')
    expect(mediaJobRoute).not.toContain('Unauthorized')
    expect(legacyVideoRoute).toContain('Legacy compatibility route')
  })

  it('returns local Brain image job ids, provider job ids, and poll URLs from the Brain image route', async () => {
    vi.resetModules()
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn().mockResolvedValue({
        success: true,
        output: null,
        jobId: 'brain-job-1',
        providerJobId: 'provider-job-1',
        pollUrl: '/api/brain/media-jobs/brain-job-1',
        status: 'processing',
        provider: 'genx',
        model: 'gpt-image-2',
        artifactId: null,
        artifactUrl: null,
        error: null,
      }),
    }))
    vi.doMock('@/lib/execution', () => ({
      ensureExecution: vi.fn().mockReturnValue({ executionId: 'exec-1' }),
      startExecution: vi.fn(),
      recordExecutionResponse: vi.fn().mockReturnValue({ executionId: 'exec-1' }),
    }))

    const { POST } = await import('@/app/api/brain/image/route')
    const response = await POST(new Request('http://localhost/api/brain/image', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'A glass city' }),
      headers: { 'Content-Type': 'application/json' },
    }) as never)
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload).toMatchObject({
      success: true,
      jobId: 'brain-job-1',
      providerJobId: 'provider-job-1',
      pollUrl: '/api/brain/media-jobs/brain-job-1',
      status: 'processing',
      provider: 'genx',
      model: 'gpt-image-2',
      executionId: 'exec-1',
    })
    expect(payload.jobId).not.toBe(payload.providerJobId)

    vi.doUnmock('@/lib/capability-router')
    vi.doUnmock('@/lib/execution')
  })
})
