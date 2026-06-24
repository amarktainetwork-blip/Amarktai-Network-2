/**
 * Avatar Capability Tests — non-adult multi-provider suite
 *
 * Covers:
 *  - Payload validation (styles, modes, age categories, child safety)
 *  - Voice clone rules (consent, rights, minor blocking, celebrity)
 *  - HF avatar image execution (binary, JSON URL, job)
 *  - Together avatar image execution
 *  - Budget-based provider ordering
 *  - Router: GenX/HF/Together success paths
 *  - Router: provider fallback chain
 *  - Router: voice attached to avatar result
 *  - Router: adult avatar remains separate
 *  - No removed providers
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateAvatarPayload,
  buildAvatarPrompt,
  executeHFAvatarImage,
  executeTogetherAvatarImage,
  executeAvatarVoice,
  resolveAvatarProviderOrder,
  buildAvatarStorageMetadata,
  ALLOWED_AVATAR_STYLES,
  ALLOWED_AVATAR_MODES,
  AVATAR_PROVIDER_CATALOG,
  type AvatarPayload,
  type AvatarVoiceConfig,
} from '../avatar-capability'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<AvatarPayload> = {}): AvatarPayload {
  return {
    avatarName: 'Luna',
    style: 'realistic_human',
    mode: 'portrait',
    ageCategory: 'adult',
    appearance: 'Tall woman with dark hair and green eyes',
    ...overrides,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

describe('validateAvatarPayload', () => {
  it('accepts valid adult realistic payload', () => {
    const r = validateAvatarPayload(makePayload())
    expect(r.valid).toBe(true)
    expect(r.error).toBeNull()
  })

  it('rejects missing avatarName', () => {
    const r = validateAvatarPayload(makePayload({ avatarName: '' }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('avatarName')
  })

  it('rejects missing appearance', () => {
    const r = validateAvatarPayload(makePayload({ appearance: '' }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('appearance')
  })

  it('rejects unsupported style', () => {
    const r = validateAvatarPayload(makePayload({ style: 'watercolor' as AvatarPayload['style'] }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('Unsupported style')
  })

  it('accepts all allowed styles', () => {
    for (const style of ALLOWED_AVATAR_STYLES) {
      const r = validateAvatarPayload(makePayload({ style }))
      expect(r.valid, `style "${style}"`).toBe(true)
    }
  })

  it('accepts all allowed modes', () => {
    for (const mode of ALLOWED_AVATAR_MODES) {
      const r = validateAvatarPayload(makePayload({ mode }))
      expect(r.valid, `mode "${mode}"`).toBe(true)
    }
  })

  it('anime avatar accepted', () => {
    const r = validateAvatarPayload(makePayload({ style: 'anime', appearance: 'Kawaii anime character with pink hair' }))
    expect(r.valid).toBe(true)
  })

  it('3d_character accepted', () => {
    const r = validateAvatarPayload(makePayload({ style: '3d_character', appearance: '3D rendered heroic knight' }))
    expect(r.valid).toBe(true)
  })

  it('fantasy_character accepted', () => {
    const r = validateAvatarPayload(makePayload({ style: 'fantasy_character', appearance: 'Elvish forest guardian with glowing eyes' }))
    expect(r.valid).toBe(true)
  })

  it('brand_mascot accepted', () => {
    const r = validateAvatarPayload(makePayload({ style: 'brand_mascot', usage: 'brand', ageCategory: 'mascot' }))
    expect(r.valid).toBe(true)
  })

  it('child_character non-sexual content accepted', () => {
    const r = validateAvatarPayload(makePayload({
      style: 'children_cartoon',
      ageCategory: 'child_character',
      appearance: 'A friendly young fox with a backpack going to school',
      usage: 'story',
    }))
    expect(r.valid).toBe(true)
  })

  it('child_character with sexual content blocked', () => {
    const r = validateAvatarPayload(makePayload({
      style: 'children_cartoon',
      ageCategory: 'child_character',
      appearance: 'sexy school character',
    }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('child_character')
    expect(r.error).toContain('sexual')
  })

  it('child_character with explicit content blocked', () => {
    const r = validateAvatarPayload(makePayload({
      ageCategory: 'child_character',
      appearance: 'explicit child character',
    }))
    expect(r.valid).toBe(false)
  })

  it('voice clone requires consentConfirmed', () => {
    const r = validateAvatarPayload(makePayload({
      voice: { voiceMode: 'cloned_voice', consentConfirmed: false },
    }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('consent')
  })

  it('voice clone with consent allowed for fictional character', () => {
    const r = validateAvatarPayload(makePayload({
      voice: { voiceMode: 'cloned_voice', consentConfirmed: true },
    }))
    expect(r.valid).toBe(true)
  })

  it('voice clone blocks minor voice', () => {
    const r = validateAvatarPayload(makePayload({
      voice: { voiceMode: 'cloned_voice', consentConfirmed: true, voiceStyle: 'child voice' },
    }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('minor')
  })

  it('celebrity voice clone without rights blocked', () => {
    const r = validateAvatarPayload(makePayload({
      voice: { voiceMode: 'cloned_voice', consentConfirmed: true, rightsConfirmed: false, sampleText: 'celebrity voice impersonate' },
    }))
    expect(r.valid).toBe(false)
    expect(r.error).toContain('celebrity')
  })

  it('celebrity voice clone with rights allowed', () => {
    const r = validateAvatarPayload(makePayload({
      voice: { voiceMode: 'cloned_voice', consentConfirmed: true, rightsConfirmed: true, sampleText: 'celebrity voice impersonate' },
    }))
    expect(r.valid).toBe(true)
  })
})

// ── Prompt building ───────────────────────────────────────────────────────────

describe('buildAvatarPrompt', () => {
  it('includes style quality prompt', () => {
    const p = buildAvatarPrompt(makePayload({ style: 'realistic_human' }))
    expect(p.prompt.toLowerCase()).toContain('photorealistic')
  })

  it('includes anime style prompt for anime', () => {
    const p = buildAvatarPrompt(makePayload({ style: 'anime' }))
    expect(p.prompt.toLowerCase()).toContain('anime')
  })

  it('includes 3D render prompt for 3d_character', () => {
    const p = buildAvatarPrompt(makePayload({ style: '3d_character' }))
    expect(p.prompt.toLowerCase()).toContain('3d rendered')
  })

  it('includes outfit and pose', () => {
    const p = buildAvatarPrompt(makePayload({ outfit: 'red dress', pose: 'sitting' }))
    expect(p.prompt).toContain('red dress')
    expect(p.prompt).toContain('sitting')
  })

  it('children_cartoon has adult/sexual terms in negative prompt', () => {
    const p = buildAvatarPrompt(makePayload({ style: 'children_cartoon', ageCategory: 'child_character' }))
    expect(p.negativePrompt).toContain('adult')
    expect(p.negativePrompt).toContain('sexual')
  })

  it('aspect ratio 9:16 sets portrait dimensions', () => {
    const p = buildAvatarPrompt(makePayload({ aspectRatio: '9:16' }))
    expect(p.params.width).toBe(576)
    expect(p.params.height).toBe(1024)
  })

  it('consistency seed included in params', () => {
    const p = buildAvatarPrompt(makePayload({ consistencySeed: 42 }))
    expect(p.params.seed).toBe(42)
  })
})

// ── Provider catalog ──────────────────────────────────────────────────────────

describe('AVATAR_PROVIDER_CATALOG', () => {
  it('contains genx, huggingface, together', () => {
    const keys = AVATAR_PROVIDER_CATALOG.map(p => p.key)
    expect(keys).toContain('genx')
    expect(keys).toContain('huggingface')
    expect(keys).toContain('together')
  })

  it('all providers generate images', () => {
    for (const p of AVATAR_PROVIDER_CATALOG) {
      expect(p.generatesImage).toBe(true)
    }
  })

  it('only genx generates video', () => {
    const videoProviders = AVATAR_PROVIDER_CATALOG.filter(p => p.generatesVideo)
    expect(videoProviders.map(p => p.key)).toContain('genx')
    expect(videoProviders.map(p => p.key)).not.toContain('together')
    expect(videoProviders.map(p => p.key)).not.toContain('huggingface')
  })
})

describe('resolveAvatarProviderOrder', () => {
  it('cheap: together or HF is primary', () => {
    const order = resolveAvatarProviderOrder('cheap', 'portrait', 'realistic_human')
    expect(['together', 'huggingface']).toContain(order[0])
    expect(order).toContain('genx')
  })

  it('premium: genx is primary', () => {
    const order = resolveAvatarProviderOrder('premium', 'portrait', 'realistic_human')
    expect(order[0]).toBe('genx')
  })

  it('balanced: together or HF first', () => {
    const order = resolveAvatarProviderOrder('balanced', 'portrait', 'anime')
    expect(['together', 'huggingface']).toContain(order[0])
  })

  it('all three providers appear', () => {
    const order = resolveAvatarProviderOrder('balanced', 'portrait', 'realistic_human')
    expect(order).toContain('genx')
    expect(order).toContain('huggingface')
    expect(order).toContain('together')
  })
})

// ── HF avatar execution ───────────────────────────────────────────────────────

describe('executeHFAvatarImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.HF_AVATAR_IMAGE_ENDPOINT
    delete process.env.HF_AVATAR_IMAGE_ENDPOINT_FALLBACK
  })

  const prompt = buildAvatarPrompt(makePayload())

  it('binary image response → data URL', async () => {
    const fakePng = new Uint8Array([137, 80, 78, 71])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => fakePng.buffer,
      json: async () => ({}), text: async (): Promise<string> => '',
    })))

    const r = await executeHFAvatarImage(prompt, 'hf-key')
    expect(r.success).toBe(true)
    expect(r.imageDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(r.provider).toBe('huggingface')
    expect(r.error).toBeNull()
  })

  it('JSON URL response → returns imageUrl', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ url: 'https://cdn.hf.co/avatar.png' }),
      text: async (): Promise<string> => '{}',
    })))

    const r = await executeHFAvatarImage(prompt, 'hf-key')
    expect(r.success).toBe(true)
    expect(r.imageUrl).toBe('https://cdn.hf.co/avatar.png')
    expect(r.imageDataUrl).toBeNull()
  })

  it('job_id response → returns jobId', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ job_id: 'hf-avatar-job-1' }),
      text: async (): Promise<string> => '{}',
    })))

    const r = await executeHFAvatarImage(prompt, 'hf-key')
    expect(r.success).toBe(true)
    expect(r.jobId).toBe('hf-avatar-job-1')
  })

  it('503 loading → tries next candidate', async () => {
    process.env.HF_AVATAR_IMAGE_ENDPOINT = 'https://avatar.hf.co'
    process.env.HF_AVATAR_IMAGE_ENDPOINT_FALLBACK = 'https://avatar-fallback.hf.co'
    let calls = 0
    const fakePng = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++
      if (calls === 1) return { ok: false, status: 503, headers: { get: () => null }, text: async (): Promise<string> => 'loading', arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }
      return { ok: true, status: 200, headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null }, arrayBuffer: async () => fakePng.buffer, json: async () => ({}), text: async (): Promise<string> => '' }
    }))

    const r = await executeHFAvatarImage(prompt, 'hf-key')
    expect(r.success).toBe(true)
    expect(calls).toBe(2)
  })

  it('all candidates fail → success:false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 500,
      headers: { get: () => null },
      text: async (): Promise<string> => 'error',
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
    })))

    const r = await executeHFAvatarImage(prompt, 'hf-key')
    expect(r.success).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

describe('executeTogetherAvatarImage', () => {
  afterEach(() => vi.unstubAllGlobals())

  const prompt = buildAvatarPrompt(makePayload())

  it('returns imageUrl on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [{ url: 'https://cdn.together.com/avatar.png' }] }),
      text: async (): Promise<string> => '{}',
      arrayBuffer: async () => new ArrayBuffer(0),
    })))

    const r = await executeTogetherAvatarImage(prompt, 'together-key')
    expect(r.success).toBe(true)
    expect(r.imageUrl).toBe('https://cdn.together.com/avatar.png')
    expect(r.provider).toBe('together')
    expect(r.error).toBeNull()
  })

  it('returns failure on non-200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 422,
      headers: { get: () => null },
      text: async (): Promise<string> => 'blocked',
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
    })))

    const r = await executeTogetherAvatarImage(prompt, 'together-key')
    expect(r.success).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

// ── Avatar voice ──────────────────────────────────────────────────────────────

describe('executeAvatarVoice', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.HF_AVATAR_VOICE_ENDPOINT
  })

  it('voiceMode=none returns skipped', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'none' }, 'hf-key', 'description')
    expect(r.voiceStatus).toBe('skipped')
  })

  it('cloned_voice without consent returns blocked', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'cloned_voice', consentConfirmed: false }, 'hf-key', 'voice')
    expect(r.voiceStatus).toBe('blocked')
  })

  it('generated_voice without endpoint returns not_configured', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'generated_voice' }, 'hf-key', 'voice')
    expect(r.voiceStatus).toBe('not_configured')
    expect(r.error).toContain('HF_AVATAR_VOICE_ENDPOINT')
  })

  it('generated_voice with endpoint and binary audio returns generated status', async () => {
    process.env.HF_AVATAR_VOICE_ENDPOINT = 'https://voice.hf.co'
    const fakeWav = new Uint8Array([82, 73, 70, 70])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'audio/wav' : null },
      arrayBuffer: async () => fakeWav.buffer,
      json: async () => ({}), text: async (): Promise<string> => '',
    })))

    const r = await executeAvatarVoice({ voiceMode: 'generated_voice', sampleText: 'Hi there' }, 'hf-key', 'Luna assistant')
    expect(r.voiceStatus).toBe('generated')
    expect(r.voiceUrl).toMatch(/^data:audio\/wav;base64,/)
    expect(r.error).toBeNull()
  })

  it('voice does not use GenX/Together/Groq endpoints', async () => {
    process.env.HF_AVATAR_VOICE_ENDPOINT = 'https://voice.hf.co'
    let capturedUrl = ''
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      capturedUrl = url
      return { ok: false, status: 500, headers: { get: () => null }, text: async (): Promise<string> => 'err', arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }
    }))

    await executeAvatarVoice({ voiceMode: 'generated_voice' }, 'hf-key', 'voice')
    expect(capturedUrl).not.toContain('genx')
    expect(capturedUrl).not.toContain('together')
    expect(capturedUrl).not.toContain('groq')
    expect(capturedUrl).toContain('voice.hf.co')
  })
})

// ── Storage metadata ──────────────────────────────────────────────────────────

describe('buildAvatarStorageMetadata', () => {
  it('captures provider, model, style, mode, generatedAt', () => {
    const meta = buildAvatarStorageMetadata(makePayload(), 'together', 'FLUX.1-schnell-Free')
    expect(meta.provider).toBe('together')
    expect(meta.model).toBe('FLUX.1-schnell-Free')
    expect(meta.style).toBe('realistic_human')
    expect(meta.mode).toBe('portrait')
    expect(meta.generatedAt).toBeTruthy()
  })

  it('includes voice result when provided', () => {
    const meta = buildAvatarStorageMetadata(makePayload(), 'huggingface', 'model', {
      voiceStatus: 'generated', voiceUrl: 'data:audio/wav;base64,XXX', voiceJobId: null, voiceModel: 'voice-model', error: null,
    })
    expect(meta.voiceStatus).toBe('generated')
    expect(meta.voiceModel).toBe('voice-model')
  })
})

// ── Router tests ──────────────────────────────────────────────────────────────

describe('executeCapability avatar_generation — router', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.HF_AVATAR_IMAGE_ENDPOINT
    delete process.env.HF_AVATAR_VOICE_ENDPOINT
  })

  function mockCoreDeps() {
    vi.doMock('@/lib/prisma', () => ({ prisma: { aiProvider: { findMany: vi.fn(async () => []) }, appAgent: { findUnique: vi.fn(async () => null) } } }))
    vi.doMock('@/lib/runtime-registry', () => ({ getCapability: vi.fn(async () => null), getAllCapabilities: vi.fn(async () => []), getAllowedProviders: vi.fn(async () => []), getBestProvider: vi.fn(async () => null), getBudgetProfile: vi.fn(async () => null), isWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/budget-tracker', () => ({ isProviderWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/app-profiles', () => ({ getAppProfileFromDb: vi.fn(async () => null), runtimeProfileOverrides: new Map() }))
    vi.doMock('@/lib/smart-router', () => ({ recordPerformance: vi.fn(), loadSmartRouterState: vi.fn(async () => {}) }))
    vi.doMock('@/lib/model-resolver', () => ({ resolveBestModel: vi.fn(async () => null) }))
    vi.doMock('@/lib/music-capability', async () => {
      const actual = await vi.importActual<typeof import('../music-capability')>('../music-capability')
      return { ...actual, executeHFMusicGeneration: vi.fn() }
    })
    vi.doMock('@/lib/video-capability', async () => {
      const actual = await vi.importActual<typeof import('../video-capability')>('../video-capability')
      return { ...actual, executeHFVideoGeneration: vi.fn(), executeTogetherVideoGeneration: vi.fn() }
    })
  }

  async function call(metaOverrides: Record<string, unknown> = {}) {
    const { executeCapability } = await import('../capability-router')
    return executeCapability({
      input: 'Luna avatar',
      capability: 'avatar_generation',
      providerOverride: 'together', // bypass IS_TEST_RUNTIME
      metadata: {
        avatarName: 'Luna',
        style: 'realistic_human',
        mode: 'portrait',
        ageCategory: 'adult',
        appearance: 'Tall woman with dark hair',
        budget: 'balanced',
        ...metaOverrides,
      },
    })
  }

  it('Together avatar success — returns image URL', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'together' ? 'together-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return {
        ...actual,
        executeTogetherAvatarImage: vi.fn(async () => ({
          success: true, imageDataUrl: null, imageUrl: 'https://cdn.together.com/avatar.png',
          jobId: null, model: 'FLUX.1-schnell-Free', provider: 'together', error: null,
        })),
        executeHFAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'huggingface', error: 'not tried' })),
      }
    })

    const result = await call({ budget: 'balanced' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('together')
    expect(result.output).toBe('https://cdn.together.com/avatar.png')
    expect(result.outputType).toBe('image')
    expect(result.metadata?.style).toBe('realistic_human')
  })

  it('HuggingFace avatar success — returns data URL', async () => {
    process.env.HF_AVATAR_IMAGE_ENDPOINT = 'https://avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return {
        ...actual,
        executeHFAvatarImage: vi.fn(async () => ({
          success: true, imageDataUrl: 'data:image/png;base64,AAAA', imageUrl: null,
          jobId: null, model: 'stabilityai/stable-diffusion-xl-base-1.0', provider: 'huggingface', error: null,
        })),
        executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'together', error: 'not tried' })),
      }
    })

    const result = await call({ budget: 'cheap' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toMatch(/^data:image\/png;base64,/)
  })

  it('GenX premium avatar success — returns job ID', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-avatar-job-1', status: 'processing',
        model: 'gpt-image-2', latencyMs: 100, error: null,
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return { ...actual, executeHFAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'huggingface', error: 'not tried' })), executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'together', error: 'not tried' })) }
    })

    const result = await call({ budget: 'premium' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('genx')
    expect(result.jobId).toBe('genx-avatar-job-1')
  })

  it('provider fallback: Together fails → HF succeeds', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({ success: false, url: null, jobId: null, status: 'failed', model: '', latencyMs: 0, error: 'no quota' })), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => { if (p === 'together') return 'together-key'; if (p === 'huggingface') return 'hf-key'; return null }), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return {
        ...actual,
        executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'FLUX', provider: 'together', error: 'Together failed' })),
        executeHFAvatarImage: vi.fn(async () => ({ success: true, imageDataUrl: 'data:image/png;base64,BBBB', imageUrl: null, jobId: null, model: 'sdxl', provider: 'huggingface', error: null })),
      }
    })

    const result = await call({ budget: 'balanced' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(true)
  })

  it('all providers fail → success:false with clear error', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({ success: false, url: null, jobId: null, status: 'failed', model: '', latencyMs: 0, error: 'failed' })), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return {
        ...actual,
        executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'FLUX', provider: 'together', error: 'no key' })),
        executeHFAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'huggingface', error: 'no key' })),
      }
    })

    const result = await call()
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.outputType).toBe('image')
  })

  it('child_character sexual content blocked before provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call({ ageCategory: 'child_character', appearance: 'sexy child character explicit' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('child_character')
    expect(result.error_category).toBe('guardrail_block')
  })

  it('voice attached to avatar result in metadata', async () => {
    process.env.HF_AVATAR_IMAGE_ENDPOINT = 'https://avatar.hf.co'
    process.env.HF_AVATAR_VOICE_ENDPOINT = 'https://voice.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return {
        ...actual,
        executeHFAvatarImage: vi.fn(async () => ({ success: true, imageDataUrl: 'data:image/png;base64,CCCC', imageUrl: null, jobId: null, model: 'sdxl', provider: 'huggingface', error: null })),
        executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'FLUX', provider: 'together', error: 'no key' })),
        executeAvatarVoice: vi.fn(async () => ({ voiceStatus: 'generated', voiceUrl: 'data:audio/wav;base64,DDDD', voiceJobId: null, voiceModel: 'tts-model', error: null })),
      }
    })

    const result = await call({ budget: 'cheap', voice: { voiceMode: 'generated_voice', sampleText: 'Hello' } })
    expect(result.success).toBe(true)
    expect(result.metadata?.voiceStatus).toBe('generated')
    expect(result.metadata?.voiceUrl).toMatch(/^data:audio\/wav;base64,/)
  })

  it('adult avatar (adult_avatar capability) remains separate from avatar_generation', async () => {
    // This test verifies avatar_generation does NOT process adult content
    // Adult avatar is handled by a completely different capability key
    const { getCapabilityDefinition } = await import('../capability-registry')
    const avatarCap = getCapabilityDefinition('avatar_generation')
    const adultAvatarCap = getCapabilityDefinition('adult_avatar')
    expect(avatarCap).not.toBeNull()
    expect(adultAvatarCap).not.toBeNull()
    // avatar_generation does not require adult mode
    expect(avatarCap!.requiresAdultMode).toBeFalsy()
    // adult_avatar requires adult mode
    expect(adultAvatarCap!.requiresAdultMode).toBe(true)
  })

  it('no removed providers in avatar results', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({ success: true, url: 'https://genx.cdn/avatar.png', jobId: null, status: 'completed', model: 'gpt-image-2', latencyMs: 100, error: null })), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/avatar-capability', async () => {
      const actual = await vi.importActual<typeof import('../avatar-capability')>('../avatar-capability')
      return { ...actual, executeHFAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'huggingface', error: 'no key' })), executeTogetherAvatarImage: vi.fn(async () => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'together', error: 'no key' })) }
    })

    const result = await call({ budget: 'premium' })
    const removed = ['openai', 'gemini', 'anthropic', 'replicate', 'deepseek', 'mistral', 'qwen', 'minimax']
    for (const p of removed) {
      expect(result.provider).not.toBe(p)
    }
  })
})
