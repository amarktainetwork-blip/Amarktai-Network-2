/**
 * Runtime Capability Truth Tests
 *
 * Verifies:
 *  - Runtime truth does not block if direct providers exist without GenX
 *  - GenX missing IS a blocker when no direct providers are configured
 *  - Final 5 active providers work correctly
 *  - Removed providers are not active
 *  - Adult mode does not require a separate adult key
 *  - Music requires GenX
 *  - Text/Chat is available via multiple direct providers without GenX
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

function makePrisma(rows: Record<string, { apiKey?: string; notes?: string }> = {}) {
  return {
    integrationConfig: {
      findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
        const row = rows[key]
        return row ?? null
      }),
      upsert: vi.fn(async () => ({})),
    },
  }
}

function makeCrypto() {
  return {
    decryptVaultKey: (v: string) => v,
    encryptVaultKey: (v: string) => v,
  }
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

// ── GenX-optional capability tests ───────────────────────────────────────────

describe('runtime truth does not block if direct providers exist without GenX', () => {
  it('does NOT add GenX blocker when Groq is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ groq: { apiKey: 'gsk_groq_q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(false)
  })

  it('does NOT add GenX blocker when Together is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'tg_q1234567890abcdef1234567890' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(false)
  })

  it('does NOT add GenX blocker when MiMo is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ mimo: { apiKey: 'mimo_q1234567890abcdef1234567' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(false)
  })

  it('Text/Chat is available when Groq is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ groq: { apiKey: 'gsk_groq_q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const textChat = truth.capabilities.find(c => c.name === 'Text / Chat')
    expect(textChat?.status).toBe('available')
  })

  it('Text/Chat is available when Together is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'tg_q1234567890abcdef1234567890' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const textChat = truth.capabilities.find(c => c.name === 'Text / Chat')
    expect(textChat?.status).toBe('available')
  })

  it('Text/Chat is available when MiMo is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ mimo: { apiKey: 'mimo_q1234567890abcdef1234567' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const textChat = truth.capabilities.find(c => c.name === 'Text / Chat')
    expect(textChat?.status).toBe('available')
  })

  it('GenX IS a blocker when no providers are configured at all', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(true)
  })
})

// ── Image/Video available via active providers ────────────────────────────────

describe('Image generation available with active providers', () => {
  it('Image available when Together is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'tg_q1234567890abcdef1234567890' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const image = truth.capabilities.find(c => c.name === 'Image Generation')
    expect(image?.status).toBe('available')
  })

  it('Image available when HuggingFace is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ huggingface: { apiKey: 'hf_q1234567890abcdef01234567' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const image = truth.capabilities.find(c => c.name === 'Image Generation')
    expect(image?.status).toBe('available')
  })
})

// ── TTS/STT available via active providers ─────────────────────────────────

describe('TTS/STT available with active providers', () => {
  it('TTS available when Groq is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ groq: { apiKey: 'gsk_groq_q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const tts = truth.capabilities.find(c => c.name === 'Voice TTS')
    expect(tts?.status).toBe('available')
  })

  it('STT available when Groq is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ groq: { apiKey: 'gsk_groq_q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const stt = truth.capabilities.find(c => c.name === 'STT / Transcription')
    expect(stt?.status).toBe('available')
  })
})

// ── Music requires GenX ───────────────────────────────────────────────────────

describe('Music generation requires GenX', () => {
  it('music is blocked when no GenX is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ groq: { apiKey: 'gsk_groq_q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const music = truth.capabilities.find(c => c.name === 'Music Generation')
    expect(music?.status).toBe('blocked')
  })

  it('music is available for live testing with GenX configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ genx: { apiKey: 'gnxk_q1234567890abcdef12345678' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const music = truth.capabilities.find(c => c.name === 'Music Generation')
    expect(music?.status).toBe('available')
    expect(music?.models).toEqual(expect.arrayContaining(['lyria-3-clip-preview', 'lyria-3-pro-preview']))
  })
})

// ── Adult mode tests ──────────────────────────────────────────────────────────

describe('adult mode does not require a separate adult key', () => {
  afterEach(() => {
    delete process.env.ADULT_MODE_ENABLED
  })

  it('adult gate uses connected Together AI without a separate adult live-test flag', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        together: {
          apiKey: 'tg_q1234567890abcdef1234567890',
          notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true }),
        },
        adult_mode: { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'failed' }) },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.adultGate.providerAvailable).toBe(true)
    expect(truth.adultGate.status).toBe('ready')
    expect(truth.adultGate.configuredProviders).toContain('together')
  })

  it('adult gate uses connected HuggingFace provider key', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        huggingface: {
          apiKey: 'hf_q1234567890abcdef01234567',
          notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true }),
        },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.adultGate.providerAvailable).toBe(true)
    expect(truth.adultGate.configuredProviders).toContain('huggingface')
  })

  it('adult gate is not_wired when no adult-capable provider is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        adult_mode: { notes: JSON.stringify({ mode: 'specialist' }) },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

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
      prisma: makePrisma({
        together: { apiKey: 'tg_q1234567890abcdef1234567890' },
        adult_mode: { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'failed' }) },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

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

// ── Deprecated providers not counted as active blockers ───────────────────────

describe('deprecated providers do not count as active blockers', () => {
  it('removed providers not in runtime provider governance', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()

    // Removed providers should not appear in the runtime list
    const removedKeys = ['qwen', 'openai', 'gemini', 'minimax', 'moonshot', 'openrouter', 'xai', 'grok', 'deepseek', 'anthropic', 'cohere', 'nvidia', 'replicate', 'elevenlabs', 'deepgram', 'mistral', 'zhipu']
    for (const key of removedKeys) {
      const entry = providers.find(p => p.key === key)
      expect(entry, `${key} should not be in runtime provider status`).toBeUndefined()
    }
  })
})
