/**
 * Runtime Capability Truth Tests
 *
 * Verifies:
 *  - Runtime truth does not block if direct providers exist without GenX
 *  - GenX missing IS a blocker when no direct providers are configured
 *  - Deprecated/backlog providers do not count as blockers
 *  - Adult mode does not require a separate adult key
 *  - Configured-with-last-error is not globally blocking
 *  - Music is always not_implemented (post-launch)
 *  - Text/Chat is available via multiple direct providers without GenX
 *  - Image/Video/TTS/STT available via non-GenX providers
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
  afterEach(() => {
    delete process.env.QWEN_API_KEY
    delete process.env.GROQ_API_KEY
  })

  it('does NOT add GenX blocker when Qwen is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ qwen: { apiKey: 'sk-qwen-q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(false)
  })

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

  it('Text/Chat is available when Qwen is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ qwen: { apiKey: 'sk-qwen-q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const textChat = truth.capabilities.find(c => c.name === 'Text / Chat')
    expect(textChat?.status).toBe('available')
  })

  it('Text/Chat is available when MiniMax is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const textChat = truth.capabilities.find(c => c.name === 'Text / Chat')
    expect(textChat?.status).toBe('available')
  })

  it('Text/Chat is available when DeepSeek is configured (no GenX)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ deepseek: { apiKey: 'sk-deepseek-q1234567890abcdef' } }),
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

// ── Image/Video available via non-GenX providers ──────────────────────────────

describe('Image generation available without GenX', () => {
  it('Image available when Qwen is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ qwen: { apiKey: 'sk-qwen-q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const image = truth.capabilities.find(c => c.name === 'Image Generation')
    expect(image?.status).toBe('available')
  })

  it('Image available when MiniMax is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const image = truth.capabilities.find(c => c.name === 'Image Generation')
    expect(image?.status).toBe('available')
  })

  it('Video available when Qwen is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ qwen: { apiKey: 'sk-qwen-q1234567890abcdef12' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const video = truth.capabilities.find(c => c.name === 'Video Generation')
    expect(video?.status).toBe('available')
  })

  it('Video available when MiniMax is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const video = truth.capabilities.find(c => c.name === 'Video Generation')
    expect(video?.status).toBe('available')
  })
})

// ── TTS/STT available via non-GenX providers ─────────────────────────────────

describe('TTS/STT available without GenX', () => {
  it('TTS available when MiniMax is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const tts = truth.capabilities.find(c => c.name === 'Voice TTS')
    expect(tts?.status).toBe('available')
  })

  it('STT available when Deepgram is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ deepgram: { apiKey: 'dg-q1234567890abcdef123456789' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const stt = truth.capabilities.find(c => c.name === 'STT / Transcription')
    expect(stt?.status).toBe('available')
  })

  it('STT available when MiniMax is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const stt = truth.capabilities.find(c => c.name === 'STT / Transcription')
    expect(stt?.status).toBe('available')
  })
})

// ── Music is always post-launch ───────────────────────────────────────────────

describe('Music generation follows GenX Lyria governance', () => {
  it('music is blocked until GenX Lyria is configured even when MiniMax is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ minimax: { apiKey: 'mm-minimax-q1234567890abcdef' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const music = truth.capabilities.find(c => c.name === 'Music Generation')
    expect(music?.status).toBe('blocked')
    expect(music?.blocker).toContain('Configure GenX')
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

  it('adult gate uses Together AI provider key (no separate key needed)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        together: { apiKey: 'tg_q1234567890abcdef1234567890' },
        adult_mode: { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'passed' }) },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.adultGate.providerAvailable).toBe(true)
    expect(truth.adultGate.status).toBe('ready')
    expect(truth.adultGate.configuredProviders).toContain('together')
  })

  it('adult gate uses HuggingFace provider key (no separate key needed)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        huggingface: { apiKey: 'hf_q1234567890abcdef01234567' },
        adult_mode: { notes: JSON.stringify({ mode: 'specialist', lastTestStatus: 'passed' }) },
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

describe('adult gate configured_with_last_error status', () => {
  it('reports configured_with_last_error when test failed (not globally blocked)', async () => {
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
      coveredByGenX: false,
      keySource: 'vault' as const,
      status: 'configured_wired' as const,
    }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.status).toBe('configured_with_last_error')
    expect(gate.testPassed).toBe(false)
    expect(gate.providerAvailable).toBe(true)
    expect(gate.blocker).toBeTruthy()
  })
})

// ── Deprecated providers not counted as active blockers ───────────────────────

describe('deprecated providers do not count as active blockers', () => {
  it('cohere/mistral (deprecated) not in runtime provider governance', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()

    // Deprecated providers should either not appear or show as non-blockers
    const cohereEntry = providers.find(p => p.key === 'cohere')
    const mistralEntry = providers.find(p => p.key === 'mistral')

    // They may appear in runtime list with blocked/not_configured status,
    // but their governanceStatus should be 'deprecated'
    if (cohereEntry) {
      expect(cohereEntry.governanceStatus).toBe('deprecated')
    }
    if (mistralEntry) {
      expect(mistralEntry.governanceStatus).toBe('deprecated')
    }
  })

  it('backlog providers (suno/udio) are not in runtime provider status', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()

    const sunoEntry = providers.find(p => p.key === 'suno')
    const udioEntry = providers.find(p => p.key === 'udio')

    // Backlog providers should not appear in the runtime list
    expect(sunoEntry).toBeUndefined()
    expect(udioEntry).toBeUndefined()
  })
})

// ── Research/crawler providers ────────────────────────────────────────────────

describe('research/crawler capability', () => {
  it('research available when Firecrawl is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ firecrawl: { apiKey: 'fc_q1234567890abcdef12345678' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const research = truth.capabilities.find(c => c.name === 'Web Crawler / Research')
    expect(research?.status).toBe('available')
  })

  it('research available when Gemini is configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ gemini: { apiKey: 'AIza_q1234567890abcdef12345' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    const research = truth.capabilities.find(c => c.name === 'Web Crawler / Research')
    expect(research?.status).toBe('available')
  })
})
