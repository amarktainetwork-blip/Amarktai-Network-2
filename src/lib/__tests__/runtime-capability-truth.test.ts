/**
 * Runtime Capability Truth Tests
 *
 * Verifies:
 *  - Runtime truth reports capabilities based on connected providers
 *  - GenX is the primary provider
 *  - Removed providers are NOT in runtime
 *  - Adult mode works with active providers
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

// ── Runtime provider status ──────────────────────────────────────────────────

describe('runtime provider status', () => {
  it('includes only active providers', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async () => null),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()

    const keys = providers.map(p => p.key)
    // Should include active providers
    expect(keys).toContain('genx')
    expect(keys).toContain('huggingface')
    expect(keys).toContain('groq')
    expect(keys).toContain('together')
    expect(keys).toContain('mimo')

    // Should NOT include removed providers
    expect(keys).not.toContain('qwen')
    expect(keys).not.toContain('openai')
    expect(keys).not.toContain('gemini')
    expect(keys).not.toContain('minimax')
    expect(keys).not.toContain('moonshot')
    expect(keys).not.toContain('openrouter')
    expect(keys).not.toContain('xai')
    expect(keys).not.toContain('grok')
    expect(keys).not.toContain('deepseek')
    expect(keys).not.toContain('anthropic')
    expect(keys).not.toContain('cohere')
    expect(keys).not.toContain('nvidia')
    expect(keys).not.toContain('replicate')
    expect(keys).not.toContain('elevenlabs')
    expect(keys).not.toContain('deepgram')
  })

  it('removed providers not in runtime provider governance', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async () => null),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()

    const removedKeys = ['qwen', 'openai', 'gemini', 'minimax', 'moonshot', 'openrouter', 'xai', 'grok', 'deepseek', 'anthropic', 'cohere', 'nvidia', 'replicate', 'elevenlabs', 'deepgram', 'mistral', 'zhipu']
    for (const key of removedKeys) {
      const entry = providers.find(p => p.key === key)
      expect(entry, `${key} should not be in runtime provider status`).toBeUndefined()
    }
  })
})

// ── Adult mode tests ──────────────────────────────────────────────────────────

describe('adult mode', () => {
  afterEach(() => {
    delete process.env.ADULT_MODE_ENABLED
  })

  it('adult gate uses connected Together AI without a separate adult live-test flag', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
            if (key === 'together') return { apiKey: 'tg_q1234567890abcdef1234567890', notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true }) }
            if (key === 'adult_mode') return { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'failed' }) }
            return null
          }),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.adultGate.providerAvailable).toBe(true)
    expect(truth.adultGate.status).toBe('ready')
    expect(truth.adultGate.configuredProviders).toContain('together')
  })

  it('adult gate uses connected HuggingFace provider key', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
            if (key === 'huggingface') return { apiKey: 'hf_q1234567890abcdef01234567', notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true }) }
            return null
          }),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.adultGate.providerAvailable).toBe(true)
    expect(truth.adultGate.configuredProviders).toContain('huggingface')
  })

  it('adult gate is not_wired when no adult-capable provider is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
            if (key === 'adult_mode') return { notes: JSON.stringify({ mode: 'specialist' }) }
            return null
          }),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')
    const gate = await getAdultCapabilityGate([])

    expect(gate.status).toBe('not_wired')
    expect(gate.providerAvailable).toBe(false)
  })
})

// ── configured_with_last_error status ────────────────────────────────────────

describe('adult gate ignores the obsolete separate adult live-test gate', () => {
  it('remains ready when the provider passed but the legacy adult test failed', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
            if (key === 'together') return { apiKey: 'tg_q1234567890abcdef1234567890' }
            if (key === 'adult_mode') return { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'failed' }) }
            return null
          }),
          upsert: vi.fn(async () => ({})),
        },
        aiProvider: {
          findMany: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (v: string) => v,
      encryptVaultKey: (v: string) => v,
    }))

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')
    const togetherProvider = {
      key: 'together',
      displayName: 'Together AI',
      reason: '',
      configured: true,
      connected: true,
      coveredByGenX: false,
      keySource: 'vault' as const,
      status: 'configured_wired' as const,
    }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.status).toBe('ready')
    expect(gate.testPassed).toBe(true)
    expect(gate.providerAvailable).toBe(true)
    expect(gate.blocker).toBeNull()
  })
})
