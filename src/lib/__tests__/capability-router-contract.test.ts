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
  vi.clearAllMocks()
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
})

describe('capability router contract', () => {
  it('publishes the required capability inventory plus adult voice', () => {
    expect(CAPABILITY_ROUTER_CAPABILITIES).toEqual([
      ...REQUIRED_CAPABILITIES.slice(0, 15),
      'adult_voice',
      'avatar_video',
      ...REQUIRED_CAPABILITIES.slice(15),
    ])
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
      readiness: 'NEEDS_CONFIGURATION',
      error_category: 'missing_key',
    })
  })

  it('creates artifacts for immediate text, image, audio, and crawl outputs', async () => {
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
      expect(result).toMatchObject({
        success: true,
        readiness: 'READY',
        artifactId: 'artifact-1',
      })
    }
    expect(mocks.createArtifact).toHaveBeenCalledTimes(4)
  })

  it('does not create an artifact before an asynchronous job has output', async () => {
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
    expect(result).toMatchObject({
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
})
