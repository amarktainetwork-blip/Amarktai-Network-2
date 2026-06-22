import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createArtifact: vi.fn(),
  callProvider: vi.fn(),
  getVaultApiKey: vi.fn(),
  getAppSafetyConfig: vi.fn(),
  loadAppSafetyConfigFromDB: vi.fn(),
  scanContent: vi.fn(),
  crawlAppWebsite: vi.fn(),
  callGenXMedia: vi.fn(),
  appAiProfileFindUnique: vi.fn(),
  recordCapabilityTraceSafe: vi.fn(),
  createControlPlaneJob: vi.fn(),
  startControlPlaneAttempt: vi.fn(),
  finishControlPlaneAttempt: vi.fn(),
  planCanonicalExecution: vi.fn(),
  localRecords: new Map<string, Record<string, unknown>>(),
}))

vi.mock('@/lib/artifact-store', () => ({ createArtifact: mocks.createArtifact }))
vi.mock('@/lib/brain', () => ({
  callProvider: mocks.callProvider,
  getVaultApiKey: mocks.getVaultApiKey,
}))
vi.mock('@/lib/content-filter', () => ({
  getAppSafetyConfig: mocks.getAppSafetyConfig,
  getGlobalAdultMode: () => true,
  loadAppSafetyConfigFromDB: mocks.loadAppSafetyConfigFromDB,
  loadGlobalAdultModeFromDB: vi.fn().mockResolvedValue(true),
  scanContent: mocks.scanContent,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    appAiProfile: {
      findUnique: mocks.appAiProfileFindUnique,
    },
  },
}))
vi.mock('@/lib/capability-tracing', () => ({
  recordCapabilityTraceSafe: mocks.recordCapabilityTraceSafe,
}))
vi.mock('@/lib/control-plane-jobs', () => ({
  createControlPlaneJob: mocks.createControlPlaneJob,
  startControlPlaneAttempt: mocks.startControlPlaneAttempt,
  finishControlPlaneAttempt: mocks.finishControlPlaneAttempt,
}))
vi.mock('@/lib/firecrawl', () => ({ crawlAppWebsite: mocks.crawlAppWebsite }))
vi.mock('@/lib/genx-client', () => ({
  callGenXMedia: mocks.callGenXMedia,
  GENX_AUDIO_MODELS: ['genx-audio'],
  GENX_I2V_MODELS: ['genx-i2v'],
  GENX_IMAGE_MODELS: ['genx-image'],
  GENX_TTS_MODELS: ['genx-tts'],
  GENX_STT_MODELS: ['genx-stt'],
  GENX_MUSIC_MODELS: ['genx-music'],
  GENX_AVATAR_MODELS: ['genx-avatar'],
  GENX_VIDEO_MODELS: ['genx-video'],
  getGenXJobStatus: vi.fn(),
}))
vi.mock('@/lib/model-registry', () => ({
  getDefaultModelForProvider: (provider: string) => `${provider}-default`,
}))
vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: (provider: string) => mocks.getVaultApiKey(provider),
  getMeshTestNotes: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/provider-registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/provider-registry')>()
  return {
    ...actual,
    getProviderReadiness: async (provider: string) => ({
      providerId: provider,
      state: await mocks.getVaultApiKey(provider) ? 'ready' : 'unconfigured',
      configured: Boolean(await mocks.getVaultApiKey(provider)),
      tested: true,
      healthy: Boolean(await mocks.getVaultApiKey(provider)),
      baseUrl: 'https://provider.example/v1',
      availableModels: 1,
      message: '',
      checkedAt: null,
    }),
    validateProviderModelAsync: vi.fn().mockResolvedValue({ valid: true, reason: null }),
  }
})
vi.mock('@/lib/provider-performance', () => ({
  rankProvidersForCapability: async (_capability: string, candidates: unknown[]) => candidates,
  recordProviderSuccess: vi.fn().mockResolvedValue(undefined),
  recordProviderFailure: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/universal-provider-call', () => ({
  callUniversalProvider: async (request: { providerKey: string; model: string; message: string; systemPrompt?: string }) =>
    mocks.callProvider(request.providerKey, request.model, request.message, request.systemPrompt),
}))
vi.mock('@/lib/providers/execution', () => ({
  planCanonicalExecution: mocks.planCanonicalExecution,
}))
vi.mock('@/lib/local-json-store', () => ({
  LOCAL_STORE_FILES: {
    mediaJobs: 'jobs/media-jobs.json',
  },
  generateId: vi.fn(() => `local-job-${mocks.localRecords.size + 1}`),
  appendRecord: vi.fn((_file: string, record: Record<string, unknown>) => {
    const id = typeof record.id === 'string' && record.id ? record.id : `local-job-${mocks.localRecords.size + 1}`
    const stored = { ...record, id }
    mocks.localRecords.set(id, stored)
    return stored
  }),
  findRecord: vi.fn((_file: string, id: string) => mocks.localRecords.get(id) ?? null),
  updateRecord: vi.fn((_file: string, id: string, updates: Record<string, unknown>) => {
    const existing = mocks.localRecords.get(id)
    if (!existing) return null
    const updated = { ...existing, ...updates }
    mocks.localRecords.set(id, updated)
    return updated
  }),
}))

import {
  CAPABILITY_ROUTER_CAPABILITIES,
  executeCapability,
  type CapabilityRouterCapability,
} from '@/lib/capability-router'

const REQUIRED_CAPABILITIES: CapabilityRouterCapability[] = [
  'chat',
  'code',
  'file_analysis',
  'image_generation',
  'image_edit',
  'video_generation',
  'image_to_video',
  'music_generation',
  'lyrics_generation',
  'tts',
  'stt',
  'voice_response',
  'adult_text',
  'adult_image',
  'adult_video',
  'suggestive_image',
  'suggestive_video',
  'repo_edit',
  'app_build',
  'deploy_plan',
  'research',
  'scrape_website',
]

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  delete process.env.HF_ENDPOINT_MUSIC_GENERATION
  delete process.env.HF_SPECIALIST_ENDPOINTS_JSON
  delete process.env.HF_MODEL_MUSIC_GENERATION
  delete process.env.HF_SPECIALIST_MODELS_JSON
  mocks.localRecords.clear()
  mocks.createArtifact.mockResolvedValue({ id: 'artifact-1' })
  mocks.getVaultApiKey.mockResolvedValue(null)
  mocks.getAppSafetyConfig.mockReturnValue({
    safeMode: false,
    adultMode: true,
    suggestiveMode: true,
  })
  mocks.loadAppSafetyConfigFromDB.mockResolvedValue(undefined)
  mocks.appAiProfileFindUnique.mockImplementation(async ({ where }: { where: { appSlug: string } }) => ({
    appSlug: where.appSlug,
    safeMode: where.appSlug === 'safe-app',
    adultMode: where.appSlug !== 'safe-app',
    adultCategories: '["fictional_adult"]',
    adultTextEnabled: true,
    adultImageEnabled: true,
    adultVoiceEnabled: true,
    adultAvatarEnabled: true,
    adultShortVideoEnabled: true,
    adultLongVideoEnabled: true,
    adultApprovedProviders: '["genx","huggingface","together"]',
    adultApprovedModels: '[]',
    adultSafetyRules: '[]',
    adultAuditLogging: true,
  }))
  mocks.recordCapabilityTraceSafe.mockResolvedValue(null)
  mocks.createControlPlaneJob.mockResolvedValue({ id: 'control-job-1', status: 'queued' })
  mocks.startControlPlaneAttempt.mockResolvedValue({ id: 'control-attempt-1' })
  mocks.finishControlPlaneAttempt.mockResolvedValue({ id: 'control-job-1', status: 'processing' })
  mocks.scanContent.mockReturnValue({
    flagged: false,
    categories: [],
    message: '',
    confidence: 0,
    scanner: 'keyword_fallback',
  })
  mocks.callProvider.mockResolvedValue({
    ok: false,
    output: null,
    error: 'not configured',
  })
  mocks.callGenXMedia.mockResolvedValue({
    success: false,
    url: null,
    jobId: null,
    status: 'failed',
    model: 'genx-model',
    error: 'GenX API key is not configured',
  })
  mocks.crawlAppWebsite.mockResolvedValue({
    success: false,
    error: 'Firecrawl API key not configured',
  })
  mocks.planCanonicalExecution.mockResolvedValue({
    capability: 'chat',
    profile: 'balanced',
    code: 'NO_ROUTE_FOUND',
    reason: 'No discovered route.',
    selected: null,
    candidates: [],
  })
})

describe('capability router contract', () => {
  it('publishes the required capability inventory plus adult voice', () => {
    expect(CAPABILITY_ROUTER_CAPABILITIES).toEqual(expect.arrayContaining([
      ...REQUIRED_CAPABILITIES,
      'adult_voice',
      'adult_avatar',
      'avatar_generation',
      'avatar_video',
      'reasoning',
      'voice_clone',
      'ocr',
      'vision',
      'embeddings',
      'rerank',
      'translation',
      'documents',
      'agents',
    ]))
  })

  it('returns a truthful canonical state for every supported capability', async () => {
    for (const capability of CAPABILITY_ROUTER_CAPABILITIES) {
      const result = await executeCapability({
        input: 'contract check',
        capability,
        files: capability === 'file_analysis' ? ['contract.txt'] : undefined,
        adultMode: capability.startsWith('adult_') ? true : undefined,
        safeMode:
          capability.startsWith('adult_') || capability.startsWith('suggestive_')
            ? false
            : undefined,
      })
      expect(['READY', 'NEEDS_INPUT', 'NEEDS_CONFIGURATION', 'BLOCKED', 'UNAVAILABLE']).toContain(
        result.readiness,
      )
      expect(result.capability).toBe(capability)
    }
  })

  it('blocks unknown capabilities and prohibited direct providers', async () => {
    const unknown = await executeCapability({
      input: 'do something',
      capability: 'invented_capability',
    })
    expect(unknown).toMatchObject({ success: false, readiness: 'BLOCKED' })

    const prohibited = await executeCapability({
      input: 'hello',
      capability: 'chat',
      providerOverride: 'openai',
    })
    expect(prohibited).toMatchObject({
      success: false,
      readiness: 'BLOCKED',
      error_category: 'provider_policy_block',
    })
  })

  it('does not pretend text is speech-to-text audio', async () => {
    const result = await executeCapability({
      input: 'transcribe this',
      capability: 'stt',
    })
    expect(result).toMatchObject({
      success: false,
      readiness: 'NEEDS_INPUT',
      error_category: 'model_not_supported',
    })
    expect(result.error).toContain('audio input reference')
  })

  it('gates adult capabilities with request and app policy', async () => {
    const noOptIn = await executeCapability({
      input: 'adult request',
      capability: 'adult_text',
    })
    expect(noOptIn).toMatchObject({ readiness: 'BLOCKED', error_category: 'guardrail_block' })

    mocks.getAppSafetyConfig.mockReturnValue({
      safeMode: true,
      adultMode: false,
      suggestiveMode: false,
    })
    const appBlocked = await executeCapability({
      input: 'adult request',
      capability: 'adult_image',
      appId: 'safe-app',
      adultMode: true,
      safeMode: false,
    })
    expect(appBlocked).toMatchObject({ readiness: 'BLOCKED', error_category: 'guardrail_block' })
    expect(mocks.appAiProfileFindUnique).toHaveBeenCalledWith({ where: { appSlug: 'safe-app' } })
  })

  it('reports unsupported adult video honestly', async () => {
    const result = await executeCapability({
      input: 'Create a fictional consensual adult age 25 video request',
      capability: 'adult_video',
      appId: 'adult-app',
      adultMode: true,
      safeMode: false,
    })
    expect(result).toMatchObject({
      success: false,
      readiness: 'UNAVAILABLE',
      error_category: 'no_route_found',
      code: 'NO_ROUTE_FOUND',
    })
  })

  it('rejects production short-video overrides that are only technical proof or quality-gated', async () => {
    const result = await executeCapability({
      input: 'Create a four second cinematic sunrise.',
      capability: 'video_generation',
      providerOverride: 'genx',
      modelOverride: 'grok-imagine-video',
      saveArtifact: true,
    })

    expect(result).toMatchObject({
      success: false,
      readiness: 'UNAVAILABLE',
      error_category: 'no_route_found',
      provider: 'genx',
      model: 'grok-imagine-video',
    })
    expect(result.error).toContain('Technical proof only for text_to_video')
    expect(mocks.planCanonicalExecution).not.toHaveBeenCalled()
  })

  it('permits explicit proof-mode short-video execution to reach canonical planning', async () => {
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'video',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'proof route ready',
      selected: {
        provider: 'genx',
        model: {
          provider: 'genx',
          id: 'grok-imagine-video',
          capabilities: ['video'],
          capabilityEvidence: 'provider_contract',
          status: 'available',
          artifactSupport: true,
          raw: {},
          discoveredAt: '2026-06-15T00:00:00.000Z',
        },
        score: 100,
        scoreBreakdown: {},
        health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
        adapter: 'genx_capability_adapter',
      },
      candidates: [{
        provider: 'genx',
        model: {
          provider: 'genx',
          id: 'grok-imagine-video',
          capabilities: ['video'],
          capabilityEvidence: 'provider_contract',
          status: 'available',
          artifactSupport: true,
          raw: {},
          discoveredAt: '2026-06-15T00:00:00.000Z',
        },
        score: 100,
        scoreBreakdown: {},
        health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
        adapter: 'genx_capability_adapter',
      }],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: 'https://media.example/proof-video.mp4',
      jobId: null,
      status: 'completed',
      model: 'grok-imagine-video',
      error: null,
    })

    const result = await executeCapability({
      input: 'Create a four second cinematic sunrise.',
      capability: 'video_generation',
      providerOverride: 'genx',
      modelOverride: 'grok-imagine-video',
      saveArtifact: true,
      metadata: {
        proofMode: true,
        executionMode: 'proof',
      },
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      provider: 'genx',
      model: 'grok-imagine-video',
    })
    expect(mocks.planCanonicalExecution).toHaveBeenCalled()
  })

  it('reports endpoint-required rerank candidates without attempting blind fallbacks', async () => {
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'rerank',
      profile: 'balanced',
      code: 'NO_ROUTE_FOUND',
      reason: 'No executable rerank route. Top blockers: Hugging Face rerank requires a specialist endpoint.',
      selected: null,
      candidates: [],
      rejectedCandidates: [{
        provider: 'huggingface',
        modelId: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        capability: 'rerank',
        code: 'DEDICATED_ENDPOINT_REQUIRED',
        reason: 'Hugging Face rerank models are catalog-visible, but rerank execution requires a specialist endpoint before routing.',
      }],
    })

    const result = await executeCapability({
      input: 'rank these documents',
      capability: 'rerank',
      metadata: { documents: ['alpha', 'beta'] },
    })

    expect(result).toMatchObject({
      success: false,
      readiness: 'NEEDS_CONFIGURATION',
      error_category: 'provider_misconfigured',
      code: 'NO_ROUTE_FOUND',
      providerAttempts: [{
        provider: 'huggingface',
        model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        status: 'needs_configuration',
        classification: 'endpoint_required',
        errorCategory: 'provider_misconfigured',
      }],
    })
    expect(result.error).toContain('NO_ROUTE_FOUND')
  })

  it('creates artifacts for immediate text, image, audio, and crawl outputs', async () => {
    const route = (provider: string, model: string, capability: string) => {
      const selected = {
        provider,
        model: {
          provider,
          id: model,
          capabilities: [capability],
          capabilityEvidence: 'model_metadata',
          status: 'available',
          artifactSupport: true,
          raw: {},
          discoveredAt: '2026-06-15T00:00:00.000Z',
        },
        score: 100,
        scoreBreakdown: {},
        health: { provider, state: 'healthy', configured: true, tested: true, healthy: true },
        adapter: `${provider}_capability_adapter`,
      }
      return {
        capability,
        profile: 'balanced',
        code: 'ROUTE_FOUND',
        reason: 'ready',
        selected,
        candidates: [selected],
      }
    }
    mocks.planCanonicalExecution
      .mockResolvedValueOnce(route('groq', 'llama-3.3-70b-versatile', 'chat'))
      .mockResolvedValueOnce(route('genx', 'gpt-image-1', 'image'))
      .mockResolvedValueOnce(route('genx', 'gpt-4o-mini-tts', 'tts'))
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callProvider.mockResolvedValue({
      ok: true,
      output: 'generated text',
      error: null,
    })
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: 'https://media.example/output',
      jobId: null,
      status: 'completed',
      model: 'genx-model',
      error: null,
    })
    mocks.crawlAppWebsite.mockResolvedValue({
      success: true,
      summary: 'site summary',
      pages: [],
      detectedNiche: 'software',
      detectedFeatures: [],
      aiCapabilitiesNeeded: [],
    })

    const requests = [
      { capability: 'chat', input: 'hello', providerOverride: 'groq' },
      { capability: 'image_generation', input: 'create image', providerOverride: 'genx' },
      { capability: 'tts', input: 'speak this', providerOverride: 'genx' },
      { capability: 'scrape_website', input: 'https://example.com' },
    ] as const

    for (const request of requests) {
      const result = await executeCapability({ ...request, saveArtifact: true })
      expect(result, JSON.stringify(result)).toMatchObject({
        success: true,
        readiness: 'READY',
        artifactId: 'artifact-1',
      })
    }
    expect(mocks.createArtifact).toHaveBeenCalledTimes(4)
  })

  it('routes scrape_website through the capability-level website execution path without provider/model exposure', async () => {
    mocks.crawlAppWebsite.mockResolvedValue({
      success: true,
      summary: 'crawl summary',
      pages: [{ url: 'https://example.com' }],
      detectedNiche: 'software',
      detectedFeatures: ['docs'],
      aiCapabilitiesNeeded: ['research'],
    })

    const result = await executeCapability({
      input: 'https://example.com',
      capability: 'scrape_website',
      saveArtifact: false,
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      capability: 'scrape_website',
      provider: 'local-crawler',
      model: null,
      outputType: 'text',
      status: 'completed',
      fallbackUsed: false,
    })
    expect(mocks.crawlAppWebsite).toHaveBeenCalledWith('https://example.com')
    expect(result.output).toContain('crawl summary')
    expect(result).not.toHaveProperty('providerJobId')
  })

  it('does not create an artifact before an asynchronous job has output', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'veo-3.1',
        capabilities: ['video'],
        capabilityEvidence: 'model_metadata',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'video',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'job-1',
      status: 'pending',
      model: 'genx-video',
      error: null,
    })
    const result = await executeCapability({
      input: 'create video',
      capability: 'video_generation',
      providerOverride: 'genx',
      saveArtifact: true,
    })
    expect(result, JSON.stringify(result)).toMatchObject({
      success: true,
      readiness: 'READY',
      providerJobId: 'job-1',
      output: null,
    })
    expect(result.jobId).toBeTruthy()
    expect(result.pollUrl).toContain('/api/brain/media-jobs/')
    expect(result.diagnostics).toMatchObject({ controlPlaneJobId: 'control-job-1' })
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })

  it('returns a Brain local polling contract for asynchronous GenX image generation', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'gpt-image-1',
        capabilities: ['image'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'image',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'provider-image-job-1',
      status: 'pending',
        model: 'gpt-image-1',
      error: null,
    })

    const result = await executeCapability({
      input: 'create image',
      capability: 'image_generation',
      providerOverride: 'genx',
      saveArtifact: true,
    })

    expect(result, JSON.stringify(result)).toMatchObject({
      success: true,
      readiness: 'READY',
      provider: 'genx',
      model: 'gpt-image-1',
      status: 'processing',
      providerJobId: 'provider-image-job-1',
      output: null,
    })
    expect(result.jobId).toBeTruthy()
    expect(result.pollUrl).toContain('/api/brain/media-jobs/')
    expect(result.jobId).not.toBe(result.providerJobId)
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })

  it('returns a canonical local job and poll URL for asynchronous music generation', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'lyria-2',
        capabilities: ['music'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      jobId: 'music-job-1',
      status: 'pending',
      model: 'lyria-2',
      error: null,
    })

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      providerOverride: 'genx',
      saveArtifact: true,
      metadata: { proofMode: true, executionMode: 'proof' },
    })

    expect(result, JSON.stringify(result)).toMatchObject({
      success: true,
      readiness: 'READY',
      provider: 'genx',
      model: 'lyria-2',
      status: 'processing',
      providerJobId: 'music-job-1',
      output: null,
    })
    expect(result.jobId).toBeTruthy()
    expect(result.pollUrl).toContain('/api/brain/media-jobs/')
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })

  it('persists immediate GenX music audio URLs as local artifacts', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'lyria-2',
        capabilities: ['music'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: 'https://media.example/music.mp3',
      bytes: null,
      contentType: 'audio/mpeg',
      jobId: null,
      status: 'completed',
      model: 'lyria-2',
      error: null,
    })

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      providerOverride: 'genx',
      saveArtifact: true,
      metadata: { proofMode: true, executionMode: 'proof' },
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      artifactId: 'artifact-1',
      provider: 'genx',
      model: 'lyria-2',
    })
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'music',
      contentUrl: 'https://media.example/music.mp3',
      mimeType: 'audio/mpeg',
    }))
  })

  it('persists immediate GenX music base64 bytes as local artifacts', async () => {
    const audioBytes = Buffer.from('fake-audio-bytes')
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'lyria-2',
        capabilities: ['music'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      bytes: audioBytes,
      contentType: 'audio/wav',
      jobId: null,
      status: 'completed',
      model: 'lyria-2',
      error: null,
    })

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      providerOverride: 'genx',
      saveArtifact: true,
      metadata: { proofMode: true, executionMode: 'proof' },
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      artifactId: 'artifact-1',
    })
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'music',
      content: audioBytes,
      mimeType: 'audio/wav',
    }))
  })

  it('keeps Hugging Face music endpoint audio bytes blocked in production without promotion to launch-ready', async () => {
    process.env.HF_ENDPOINT_MUSIC_GENERATION = 'https://hf.example/music'
    const audioBytes = Buffer.from('hf-audio-bytes')
    const selected = {
      provider: 'huggingface',
      model: {
        provider: 'huggingface',
        id: 'facebook/musicgen-small',
        capabilities: ['music'],
        capabilityEvidence: 'model_metadata',
        status: 'available',
        artifactSupport: true,
        metadata: { executable: 'REQUIRES_DEDICATED_ENDPOINT' },
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'huggingface', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'huggingface_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'HF specialist endpoint configured.',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockImplementation(async (provider: string) =>
      provider === 'huggingface' ? 'configured' : null,
    )
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(Uint8Array.from(audioBytes), {
        status: 200,
        headers: { 'content-type': 'audio/wav' },
      }),
    ))

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      providerOverride: 'huggingface',
      saveArtifact: true,
    })

    expect(result, JSON.stringify(result)).toMatchObject({
      success: false,
      readiness: 'NEEDS_CONFIGURATION',
      provider: 'huggingface',
    })
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })

  it('skips Hugging Face music candidates that require an endpoint and falls back truthfully', async () => {
    const hfCandidate = {
      provider: 'huggingface',
      model: {
        provider: 'huggingface',
        id: 'facebook/musicgen-small',
        capabilities: ['music'],
        capabilityEvidence: 'model_metadata',
        status: 'available',
        artifactSupport: true,
        metadata: { executable: 'REQUIRES_DEDICATED_ENDPOINT' },
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'huggingface', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'huggingface_capability_adapter',
    }
    const genxCandidate = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'lyria-2',
        capabilities: ['music'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 90,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'HF visible, GenX executable.',
      selected: hfCandidate,
      candidates: [hfCandidate, genxCandidate],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: 'https://media.example/music.mp3',
      bytes: null,
      contentType: 'audio/mpeg',
      jobId: null,
      status: 'completed',
      model: 'lyria-2',
      error: null,
    })

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      saveArtifact: true,
    })

    expect(result, JSON.stringify(result)).toMatchObject({
      success: false,
      readiness: 'NEEDS_CONFIGURATION',
      fallbackUsed: true,
    })
    expect(result.providerAttempts?.[0]).toMatchObject({
      provider: 'huggingface',
      status: 'failed',
      errorCategory: 'provider_misconfigured',
    })
    expect(result.providerAttempts?.[0].error).toContain('Endpoint required for music_generation.')
    expect(result.providerAttempts?.[0].error).not.toContain('No canonical adapter contract')
    expect(result.providerAttempts?.[1]).toMatchObject({
      provider: 'genx',
      status: 'failed',
      classification: 'blocked_by_policy',
    })
  })

  it('fails GenX music without audio and does not create an artifact', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'lyria-2',
        capabilities: ['music'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'healthy', configured: true, tested: true, healthy: true },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'music',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: null,
      bytes: null,
      contentType: null,
      jobId: null,
      status: 'completed',
      model: 'lyria-2',
      error: 'Gemini returned no audio data',
    })

    const result = await executeCapability({
      input: 'Compose an uplifting launch anthem',
      capability: 'music_generation',
      providerOverride: 'genx',
      saveArtifact: true,
    })

    expect(result).toMatchObject({
      success: false,
      readiness: 'UNAVAILABLE',
      error: 'NO_ROUTE_FOUND: endpoint required',
    })
    expect(result.providerAttempts?.[0]).toMatchObject({
      provider: 'genx',
      error: 'Technical proof only for music_generation.',
    })
    expect(mocks.createArtifact).not.toHaveBeenCalled()
  })

  it('keeps a forced GenX image route routable when static discovery fallback candidates exist', async () => {
    const selected = {
      provider: 'genx',
      model: {
        provider: 'genx',
        id: 'gpt-image-1',
        capabilities: ['image'],
        capabilityEvidence: 'provider_contract',
        status: 'available',
        artifactSupport: true,
        raw: { source: 'genx_static_runtime_fallback' },
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score: 100,
      scoreBreakdown: {},
      health: { provider: 'genx', state: 'degraded', configured: true, tested: true, healthy: false },
      adapter: 'genx_capability_adapter',
    }
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'image',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'GenX discovery failed; using static runtime fallback.',
      selected,
      candidates: [selected],
    })
    mocks.getVaultApiKey.mockResolvedValue('configured')
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      url: 'https://media.example/genx.png',
      jobId: null,
      status: 'completed',
        model: 'gpt-image-1',
      error: null,
    })

    const result = await executeCapability({
      input: 'create image',
      capability: 'image_generation',
      providerOverride: 'genx',
      saveArtifact: true,
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      provider: 'genx',
      model: 'gpt-image-1',
    })
  })
})
