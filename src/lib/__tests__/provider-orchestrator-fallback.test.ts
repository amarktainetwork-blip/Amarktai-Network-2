import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  qwenExecute: vi.fn(),
  togetherExecute: vi.fn(),
  planCanonicalExecution: vi.fn(),
  createArtifact: vi.fn(),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn(),
}))

vi.mock('@/lib/providers/execution', () => ({
  planCanonicalExecution: mocks.planCanonicalExecution,
}))
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
    const candidate = (provider: 'qwen' | 'together', model: string, score: number) => ({
      provider,
      model: {
        provider,
        id: model,
        capabilities: ['image'],
        capabilityEvidence: 'model_metadata',
        status: 'available',
        speed: null,
        quality: null,
        cost: null,
        context: null,
        adult: 'unknown',
        streaming: 'unknown',
        research: 'unknown',
        artifactSupport: true,
        raw: {},
        discoveredAt: '2026-06-15T00:00:00.000Z',
      },
      score,
      scoreBreakdown: {},
      health: {
        provider,
        state: 'healthy',
        configured: true,
        tested: true,
        healthy: true,
        checkedAt: null,
        detail: 'Healthy',
      },
      adapter: `${provider}_capability_adapter`,
    })
    const qwen = candidate('qwen', 'qwen-image-2.0', 100)
    const together = candidate('together', 'black-forest-labs/FLUX.1-schnell', 90)
    mocks.planCanonicalExecution.mockResolvedValue({
      capability: 'image',
      profile: 'balanced',
      code: 'ROUTE_FOUND',
      reason: 'ready',
      selected: qwen,
      candidates: [qwen, together],
    })
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
