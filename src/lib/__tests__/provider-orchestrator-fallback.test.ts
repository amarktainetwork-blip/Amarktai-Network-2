import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  qwenExecute: vi.fn(),
  togetherExecute: vi.fn(),
  createArtifact: vi.fn(),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn(),
}))

vi.mock('@/lib/capability-routing-policy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/capability-routing-policy')>()
  const qwenRoute = {
    provider: 'qwen',
    modelIds: ['qwen-image-2.0'],
    executable: true,
    adapter: 'qwen_capability_adapter',
    source: 'universal_model_catalog',
    route: '/api/connected-apps/capabilities/execute',
    outputType: 'image',
    adapterImplemented: true,
  } as const
  const togetherRoute = {
    provider: 'together',
    modelIds: ['black-forest-labs/FLUX.1-schnell'],
    executable: true,
    adapter: 'together_capability_adapter',
    source: 'universal_model_catalog',
    route: '/api/connected-apps/capabilities/execute',
    outputType: 'image',
    adapterImplemented: true,
  } as const
  return {
    ...actual,
    selectCapabilityRoutePlan: vi.fn().mockResolvedValue({
      capability: 'text_to_image',
      qualityTier: 'auto',
      selected: { route: qwenRoute, model: 'qwen-image-2.0', configured: true, rank: 0 },
      candidates: [],
      fallback: [{
        route: togetherRoute,
        model: 'black-forest-labs/FLUX.1-schnell',
        configured: true,
        rank: 1,
      }],
      setupRequired: false,
      reason: 'ready',
    }),
  }
})
vi.mock('@/lib/ai-capability-adapters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-capability-adapters')>()
  return {
    ...actual,
    getProviderCapabilityAdapter: (provider: string) => ({
      id: `${provider}_capability_adapter`,
      provider,
      categories: ['computer_vision'],
      execute: provider === 'qwen' ? mocks.qwenExecute : mocks.togetherExecute,
    }),
  }
})
vi.mock('@/lib/provider-registry', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/provider-registry')>(),
  validateProviderModelAsync: vi.fn().mockResolvedValue({ valid: true, reason: null }),
}))
vi.mock('@/lib/provider-performance', () => ({
  recordProviderSuccess: mocks.recordSuccess,
  recordProviderFailure: mocks.recordFailure,
}))
vi.mock('@/lib/artifact-store', () => ({ createArtifact: mocks.createArtifact }))
vi.mock('@/lib/content-filter', () => ({
  getAppSafetyConfig: vi.fn().mockReturnValue({
    safeMode: false,
    adultMode: true,
    suggestiveMode: true,
  }),
  loadAppSafetyConfigFromDB: vi.fn(),
  scanContent: vi.fn().mockReturnValue({ flagged: false, message: '' }),
}))
vi.mock('@/lib/firecrawl', () => ({ crawlAppWebsite: vi.fn() }))

import { executeCapabilityOrchestration } from '@/lib/orchestrator'

describe('canonical provider fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.recordSuccess.mockResolvedValue(undefined)
    mocks.recordFailure.mockResolvedValue(undefined)
    mocks.createArtifact.mockResolvedValue({
      id: 'artifact-1',
      downloadUrl: '/api/admin/artifacts/artifact-1/download',
      storageUrl: '/api/artifacts/file/image.png',
    })
    mocks.qwenExecute.mockResolvedValue({
      status: 'failed',
      provider: 'qwen',
      model: 'qwen-image-2.0',
      output: null,
      mediaUrl: null,
      bytes: null,
      contentType: null,
      providerJobId: null,
      latencyMs: 20,
      rawStatus: 400,
      error: 'Model is not supported in this region.',
      errorCategory: 'model_not_supported',
      retryable: true,
      diagnostics: null,
    })
    mocks.togetherExecute.mockResolvedValue({
      status: 'completed',
      provider: 'together',
      model: 'black-forest-labs/FLUX.1-schnell',
      output: null,
      mediaUrl: 'https://cdn.example/fallback.png',
      bytes: null,
      contentType: 'image/png',
      providerJobId: null,
      latencyMs: 30,
      rawStatus: 200,
      error: null,
      errorCategory: null,
      retryable: false,
      diagnostics: null,
    })
  })

  it('falls back from a Qwen image model failure and persists the successful artifact', async () => {
    const result = await executeCapabilityOrchestration({
      input: 'Create a product launch image',
      capability: 'image_generation',
      saveArtifact: true,
      appId: 'marketing',
    })

    expect(result).toMatchObject({
      success: true,
      readiness: 'READY',
      provider: 'together',
      fallbackUsed: true,
      artifactId: 'artifact-1',
    })
    expect(result.providerAttempts).toHaveLength(2)
    expect(result.providerAttempts?.[0]).toMatchObject({
      provider: 'qwen',
      adapter: 'qwen_capability_adapter',
      outputType: 'image',
      errorCategory: 'model_not_supported',
    })
    expect(mocks.recordFailure).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'qwen',
      capability: 'text_to_image',
    }))
    expect(mocks.recordSuccess).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'together',
      capability: 'text_to_image',
    }))
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'together',
      capability: 'text_to_image',
    }))
  })

  it('keeps Studio failures structured and carries providerAttempts into execution history', () => {
    const studio = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/studio/execute/route.ts'),
      'utf8',
    )
    const execution = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/execution/execution-runner.ts'),
      'utf8',
    )
    expect(studio).toContain('executeCapabilityOrchestration')
    expect(studio).toContain('...result')
    expect(studio).toContain("result.readiness === 'BLOCKED'")
    expect(studio).not.toContain("result.readiness === 'NEEDS_CONFIGURATION' ? 503")
    expect(execution).toContain('result: response')
  })
})
