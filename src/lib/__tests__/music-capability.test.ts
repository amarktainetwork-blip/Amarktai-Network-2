/**
 * Music Capability Tests — multi-provider suite
 *
 * Covers:
 *  - Validation: genre count, unsupported genres, vocal types, duration
 *  - Lyrics: generated (no placeholders), custom, instrumental
 *  - Style inspiration: descriptive trait conversion, not voice clone text
 *  - HF provider catalog: candidate selection logic
 *  - HF execution: binary audio, URL response, job response, failure
 *  - Router: GenX success, HF success, GenX→HF fallback, HF→GenX fallback,
 *             both fail, blueprint cannot be success, metadata fields
 *
 * ACTIVE PROVIDERS: genx, huggingface
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateMusicPayload,
  buildMusicProviderPrompt,
  generateFullLyrics,
  resolveStyleInspiration,
  resolveHFMusicCandidates,
  executeHFMusicCandidate,
  ALLOWED_GENRES,
  ALLOWED_VOCAL_TYPES,
  HF_MUSIC_CATALOG,
  type MusicCapabilityPayload,
  type HFMusicProviderCandidate,
} from '../music-capability'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<MusicCapabilityPayload> = {}): MusicCapabilityPayload {
  return {
    theme: 'rising above adversity',
    genres: ['pop'],
    vocalType: 'female',
    moods: ['uplifting'],
    duration: 180,
    ...overrides,
  }
}

// ── Genre validation ──────────────────────────────────────────────────────────

describe('validateMusicPayload — genre count', () => {
  it('accepts 1 genre', () => {
    expect(validateMusicPayload(makePayload({ genres: ['pop'] }))).toBeNull()
  })
  it('accepts 5 genres', () => {
    expect(validateMusicPayload(makePayload({ genres: ['pop', 'rnb', 'soul', 'gospel', 'hiphop'] }))).toBeNull()
  })
  it('rejects 6 genres with count in message', () => {
    const r = validateMusicPayload(makePayload({ genres: ['pop', 'rnb', 'soul', 'gospel', 'hiphop', 'jazz'] }))
    expect(r).toContain('Maximum 5 genres')
    expect(r).toContain('6')
  })
  it('rejects empty genres array', () => {
    expect(validateMusicPayload(makePayload({ genres: [] }))).toContain('At least one genre')
  })
})

describe('validateMusicPayload — unsupported genres', () => {
  it('rejects unknown genre', () => {
    const r = validateMusicPayload(makePayload({ genres: ['dubstep'] as unknown as MusicCapabilityPayload['genres'] }))
    expect(r).toContain('Unsupported genre')
    expect(r).toContain('dubstep')
  })
  it('rejects "custom" removed from list', () => {
    const r = validateMusicPayload(makePayload({ genres: ['custom'] as unknown as MusicCapabilityPayload['genres'] }))
    expect(r).toContain('Unsupported genre')
  })
  it('accepts all 24 allowed genres', () => {
    for (const genre of ALLOWED_GENRES) {
      expect(validateMusicPayload(makePayload({ genres: [genre] })), `genre "${genre}"`).toBeNull()
    }
  })
})

describe('validateMusicPayload — vocal types', () => {
  it('accepts all allowed vocal types', () => {
    for (const vt of ALLOWED_VOCAL_TYPES) {
      expect(validateMusicPayload(makePayload({ vocalType: vt })), `vocalType "${vt}"`).toBeNull()
    }
  })
  it('rejects unsupported vocal type', () => {
    const r = validateMusicPayload(makePayload({ vocalType: 'falsetto' as MusicCapabilityPayload['vocalType'] }))
    expect(r).toContain('Unsupported vocal type')
    expect(r).toContain('falsetto')
  })
  it('accepts instrumental without lyrics', () => {
    expect(validateMusicPayload(makePayload({ vocalType: 'instrumental', lyrics: undefined }))).toBeNull()
  })
})

describe('validateMusicPayload — duration', () => {
  it('accepts 30s (minimum)', () => expect(validateMusicPayload(makePayload({ duration: 30 }))).toBeNull())
  it('accepts 180s (default)', () => expect(validateMusicPayload(makePayload({ duration: 180 }))).toBeNull())
  it('accepts 240s (4-minute)', () => expect(validateMusicPayload(makePayload({ duration: 240 }))).toBeNull())
  it('accepts 300s (maximum)', () => expect(validateMusicPayload(makePayload({ duration: 300 }))).toBeNull())
  it('rejects 29s', () => expect(validateMusicPayload(makePayload({ duration: 29 }))).toContain('30'))
  it('rejects 301s', () => expect(validateMusicPayload(makePayload({ duration: 301 }))).toContain('300'))
  it('defaults to 180 when omitted', () => {
    const built = buildMusicProviderPrompt(makePayload({ duration: undefined }))
    expect(built.duration).toBe(180)
  })
})

// ── Lyrics modes ──────────────────────────────────────────────────────────────

describe('buildMusicProviderPrompt — lyrics modes', () => {
  it('generated when no custom lyrics', () => {
    const r = buildMusicProviderPrompt(makePayload({ lyrics: undefined }))
    expect(r.lyricsMode).toBe('generated')
    expect(r.generatedLyrics).toBeDefined()
    expect(r.generatedLyrics!.length).toBeGreaterThan(100)
  })
  it('custom when lyrics supplied', () => {
    const custom = '[Verse 1]\nCustom song line\n[Chorus]\nCustom chorus'
    const r = buildMusicProviderPrompt(makePayload({ lyrics: custom }))
    expect(r.lyricsMode).toBe('custom')
    expect(r.generatedLyrics).toBeUndefined()
    expect(r.prompt).toContain(custom)
  })
  it('instrumental mode skips lyrics', () => {
    const r = buildMusicProviderPrompt(makePayload({ vocalType: 'instrumental' }))
    expect(r.lyricsMode).toBe('instrumental')
    expect(r.generatedLyrics).toBeUndefined()
    expect(r.prompt).not.toContain('[Verse')
    expect(r.prompt).toContain('instrumental')
  })
  it('includes requested duration in prompt', () => {
    expect(buildMusicProviderPrompt(makePayload({ duration: 240 })).prompt).toContain('240-second')
  })
})

// ── No placeholder text ───────────────────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  'inspired lyrics...', 'Catchy pop chorus...', '[insert lyrics]',
  'Continuing the theme...', 'Repeat chorus...', 'Bridge section...',
  'catchy chorus', 'theme-inspired',
]

describe('generateFullLyrics — no placeholders', () => {
  const genres: MusicCapabilityPayload['genres'][] = [['pop'], ['gospel'], ['reggae'], ['rock'], ['rnb']]
  for (const g of genres) {
    it(`no placeholders for ${g[0]}`, () => {
      const lyrics = generateFullLyrics(makePayload({ genres: g, theme: 'freedom' }))
      for (const p of PLACEHOLDER_PATTERNS) {
        expect(lyrics.toLowerCase()).not.toContain(p.toLowerCase())
      }
    })
  }
  it('rap has no placeholders', () => {
    const lyrics = generateFullLyrics(makePayload({ vocalType: 'rap', genres: ['hiphop'], theme: 'dream' }))
    for (const p of PLACEHOLDER_PATTERNS) expect(lyrics.toLowerCase()).not.toContain(p.toLowerCase())
    expect(lyrics).toContain('[Verse 1]')
    expect(lyrics).toContain('[Chorus]')
  })
  it('spoken word has no placeholders', () => {
    const lyrics = generateFullLyrics(makePayload({ vocalType: 'spoken_word', genres: ['folk'], theme: 'hope' }))
    for (const p of PLACEHOLDER_PATTERNS) expect(lyrics.toLowerCase()).not.toContain(p.toLowerCase())
    expect(lyrics).toContain('[Spoken')
  })
  it('standard vocals have full structure', () => {
    const lyrics = generateFullLyrics(makePayload({ genres: ['pop'], theme: 'journey' }))
    expect(lyrics).toContain('[Verse 1]')
    expect(lyrics).toContain('[Chorus]')
    expect(lyrics).toContain('[Bridge]')
    expect(lyrics).toContain('[Outro]')
  })
  it('theme word appears in lyrics', () => {
    const theme = 'moonlight'
    expect(generateFullLyrics(makePayload({ theme, genres: ['pop'] })).toLowerCase()).toContain(theme)
  })
})

// ── Style inspiration ─────────────────────────────────────────────────────────

describe('resolveStyleInspiration', () => {
  it('Michael Jackson → descriptive traits, not voice clone text', () => {
    const r = resolveStyleInspiration('Michael Jackson')
    expect(r).not.toContain('Michael Jackson')
    expect(r.toLowerCase()).toMatch(/pop|funk|groove|vocal|production/)
  })
  it('Bob Marley → reggae traits', () => {
    expect(resolveStyleInspiration('Bob Marley').toLowerCase()).toMatch(/reggae|bass|groove|spiritual/)
  })
  it('Metallica → metal traits', () => {
    expect(resolveStyleInspiration('Metallica').toLowerCase()).toMatch(/metal|guitar|drum/)
  })
  it('Boyz II Men → harmony/R&B traits', () => {
    expect(resolveStyleInspiration('Boyz II Men').toLowerCase()).toMatch(/harmony|r&b|ballad|soul/)
  })
  it('unknown artist → generic fallback with no voice clone claim', () => {
    const r = resolveStyleInspiration('Unknown Artist XYZ')
    expect(r).toContain('Unknown Artist XYZ')
    expect(r).toContain('inspired by')
    // Must not claim the output IS the artist's voice or that it clones the voice
    expect(r).not.toContain('clone')
    expect(r).not.toContain('impers')
  })
  it('style traits appear in provider prompt, not raw artist name', () => {
    const r = buildMusicProviderPrompt(makePayload({ referenceStyle: 'Bob Marley' }))
    expect(r.prompt).toContain('Style inspiration:')
    expect(r.prompt).not.toContain('Bob Marley')
    expect(r.prompt.toLowerCase()).toMatch(/reggae|bass/)
  })
})

// ── HF provider catalog ───────────────────────────────────────────────────────

describe('HF_MUSIC_CATALOG', () => {
  it('contains ACE-Step as full_song provider', () => {
    const ace = HF_MUSIC_CATALOG.find(e => e.key === 'ace_step')
    expect(ace).toBeDefined()
    expect(ace!.generationMode).toBe('full_song')
    expect(ace!.requiresEndpoint).toBe(true)
    expect(ace!.supportsVocals).toBe(true)
    expect(ace!.supportsLyrics).toBe(true)
  })
  it('contains YuE as lyrics_to_song provider', () => {
    const yue = HF_MUSIC_CATALOG.find(e => e.key === 'yue')
    expect(yue).toBeDefined()
    expect(yue!.generationMode).toBe('lyrics_to_song')
    expect(yue!.requiresEndpoint).toBe(true)
  })
  it('contains DiffRhythm as full_song provider', () => {
    const dr = HF_MUSIC_CATALOG.find(e => e.key === 'diffrhythm')
    expect(dr).toBeDefined()
    expect(dr!.generationMode).toBe('full_song')
    expect(dr!.requiresEndpoint).toBe(true)
  })
  it('contains MusicGen models as segment providers', () => {
    const mg = HF_MUSIC_CATALOG.filter(e => e.key.startsWith('musicgen'))
    expect(mg.length).toBeGreaterThanOrEqual(3)
    for (const m of mg) {
      expect(m.generationMode).toBe('segment')
      expect(m.requiresEndpoint).toBe(false)
    }
  })
  it('full_song providers have higher priority than segment', () => {
    const fullSong = HF_MUSIC_CATALOG.filter(e => e.generationMode === 'full_song')
    const segment = HF_MUSIC_CATALOG.filter(e => e.generationMode === 'segment')
    const minFull = Math.min(...fullSong.map(e => e.priority))
    const maxSeg = Math.max(...segment.map(e => e.priority))
    expect(minFull).toBeGreaterThan(maxSeg)
  })
})

describe('resolveHFMusicCandidates', () => {
  const hfKey = 'hf-test-key'

  it('returns only serverless MusicGen when no endpoint env vars set', () => {
    // No HF_ENDPOINT_* env vars set in test environment
    const candidates = resolveHFMusicCandidates(hfKey, 180, true, true)
    for (const c of candidates) {
      expect(c.entry.requiresEndpoint).toBe(false)
    }
    // Should contain at least one MusicGen entry
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].hfApiKey).toBe(hfKey)
  })

  it('includes ACE-Step when HF_ENDPOINT_ACE_STEP is set', () => {
    process.env.HF_ENDPOINT_ACE_STEP = 'https://my-endpoint.huggingface.co/models/ace-step'
    const candidates = resolveHFMusicCandidates(hfKey, 180, true, true)
    process.env.HF_ENDPOINT_ACE_STEP = ''
    const ace = candidates.find(c => c.entry.key === 'ace_step')
    expect(ace).toBeDefined()
    expect(ace!.endpointUrl).toContain('ace-step')
  })

  it('prefers full_song candidates for long requests when preferFullSong=true', () => {
    process.env.HF_ENDPOINT_ACE_STEP = 'https://my-endpoint.huggingface.co/models/ace-step'
    const candidates = resolveHFMusicCandidates(hfKey, 180, true, true)
    process.env.HF_ENDPOINT_ACE_STEP = ''
    if (candidates.length > 1) {
      const first = candidates[0].entry.generationMode
      expect(['full_song', 'lyrics_to_song']).toContain(first)
    }
  })

  it('returns segment candidates for short requests (preferFullSong=false)', () => {
    const candidates = resolveHFMusicCandidates(hfKey, 30, false, false)
    expect(candidates.length).toBeGreaterThan(0)
  })
})

// ── HF candidate execution ────────────────────────────────────────────────────

describe('executeHFMusicCandidate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function makeCandidate(overrides: Partial<HFMusicProviderCandidate['entry']> = {}): HFMusicProviderCandidate {
    return {
      entry: {
        key: 'musicgen_small',
        label: 'MusicGen Small',
        modelId: 'facebook/musicgen-small',
        endpointEnvKey: null,
        generationMode: 'segment',
        supportsVocals: false,
        supportsInstrumental: true,
        supportsLyrics: false,
        maxDurationSeconds: 30,
        requiresEndpoint: false,
        priority: 40,
        notes: '',
        ...overrides,
      },
      endpointUrl: null,
      hfApiKey: 'hf-test-key',
    }
  }

  it('binary audio response → returns data URL with generationMode=segment', async () => {
    const fakeWav = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'audio/wav' : null },
      arrayBuffer: async () => fakeWav.buffer,
      json: async () => ({}),
      text: async () => '',
    })))

    const c = makeCandidate()
    const r = await executeHFMusicCandidate('pop song about freedom', 30, c)
    expect(r.success).toBe(true)
    expect(r.audioDataUrl).toMatch(/^data:audio\/wav;base64,/)
    expect(r.audioUrl).toBeNull()
    expect(r.generationMode).toBe('segment')
    expect(r.requestedDuration).toBe(30)
    expect(r.error).toBeNull()
  })

  it('JSON URL response → returns audioUrl', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ url: 'https://storage.example.com/audio.mp3', duration: 185 }),
      text: async () => '{"url":"https://storage.example.com/audio.mp3"}',
    })))

    const c = makeCandidate({ generationMode: 'full_song' })
    const r = await executeHFMusicCandidate('full song test', 180, c)
    expect(r.success).toBe(true)
    expect(r.audioUrl).toBe('https://storage.example.com/audio.mp3')
    expect(r.audioDataUrl).toBeNull()
    expect(r.actualDuration).toBe(185)
  })

  it('JSON job_id response → returns jobId with success=true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ job_id: 'hf-job-xyz', status: 'processing' }),
      text: async () => '{}',
    })))

    const c = makeCandidate({ generationMode: 'full_song' })
    const r = await executeHFMusicCandidate('song', 180, c)
    expect(r.success).toBe(true)
    expect(r.jobId).toBe('hf-job-xyz')
    expect(r.audioDataUrl).toBeNull()
  })

  it('503 loading response → returns failure with loading message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      headers: { get: () => 'text/plain' },
      text: async () => 'Model is currently loading',
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
    })))

    const r = await executeHFMusicCandidate('song', 30, makeCandidate())
    expect(r.success).toBe(false)
    expect(r.error).toContain('loading')
    expect(r.generationMode).toBe('segment')
  })

  it('empty audio buffer → returns failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'audio/wav' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
      text: async () => '',
    })))

    const r = await executeHFMusicCandidate('song', 30, makeCandidate())
    expect(r.success).toBe(false)
    expect(r.error).toContain('empty')
  })

  it('segment-only provider reports generationMode=segment, not full_song', async () => {
    const fakeWav = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'audio/wav' : null },
      arrayBuffer: async () => fakeWav.buffer,
      json: async () => ({}),
      text: async () => '',
    })))

    const r = await executeHFMusicCandidate('song', 180, makeCandidate({ generationMode: 'segment' }))
    expect(r.success).toBe(true)
    expect(r.generationMode).toBe('segment')
    // Must NOT claim full_song
    expect(r.generationMode).not.toBe('full_song')
  })
})

// ── Router multi-provider tests ───────────────────────────────────────────────

describe('executeCapability music_generation — router', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mockCoreDeps() {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        aiProvider: { findMany: vi.fn(async () => []) },
        appAgent: { findUnique: vi.fn(async () => null) },
      },
    }))
    vi.doMock('@/lib/runtime-registry', () => ({
      getCapability: vi.fn(async () => null),
      getAllCapabilities: vi.fn(async () => []),
      getAllowedProviders: vi.fn(async () => []),
      getBestProvider: vi.fn(async () => null),
      getBudgetProfile: vi.fn(async () => null),
      isWithinBudget: vi.fn(async () => true),
    }))
    vi.doMock('@/lib/budget-tracker', () => ({ isProviderWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/app-profiles', () => ({
      getAppProfileFromDb: vi.fn(async () => null),
      runtimeProfileOverrides: new Map(),
    }))
    vi.doMock('@/lib/smart-router', () => ({
      recordPerformance: vi.fn(),
      loadSmartRouterState: vi.fn(async () => {}),
    }))
  }

  const musicMeta = { theme: 'freedom', genres: ['pop'], vocalType: 'female', duration: 180 }

  // providerOverride is required to bypass IS_TEST_RUNTIME fast-exit
  function call(providerOverride: string, metaOverrides: Record<string, unknown> = {}) {
    return import('../capability-router').then(({ executeCapability }) =>
      executeCapability({
        input: 'a song about freedom',
        capability: 'music_generation',
        providerOverride,
        metadata: { ...musicMeta, ...metaOverrides },
      })
    )
  }

  it('GenX async job → success with jobId, generationMode=full_song', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-job-001', status: 'processing',
        model: 'lyria-3-pro-preview', latencyMs: 200, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview', 'lyria-3-clip-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async () => null),
      callProvider: vi.fn(),
    }))

    const result = await call('genx')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('genx')
    expect(result.jobId).toBe('genx-job-001')
    expect(result.outputType).toBe('audio')
    expect(result.metadata?.generationMode).toBe('full_song')
    expect(result.metadata?.requestedDuration).toBe(180)
    expect(result.metadata?.provider).toBe('genx')
    expect(result.outputType).not.toBe('music_blueprint')
  })

  it('GenX sync URL → success with output URL, generationMode=full_song', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: 'https://cdn.genx.com/audio.mp3', jobId: null,
        status: 'completed', model: 'lyria-3-pro-preview', latencyMs: 1500, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async () => null),
      callProvider: vi.fn(),
    }))

    const result = await call('genx', { genres: ['pop', 'soul'], vocalType: 'duet', duration: 210 })
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://cdn.genx.com/audio.mp3')
    expect(result.metadata?.generationMode).toBe('full_song')
    expect(result.metadata?.genres).toEqual(['pop', 'soul'])
    expect(result.metadata?.vocalType).toBe('duet')
    expect(result.metadata?.requestedDuration).toBe(210)
    expect(result.metadata?.model).toBe('lyria-3-pro-preview')
  })

  it('HF audio → success with data URL, generationMode from HF result', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'huggingface', modelId: 'facebook/musicgen-small' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/music-capability', async () => {
      const actual = await vi.importActual<typeof import('../music-capability')>('../music-capability')
      return {
        ...actual,
        executeHFMusicGeneration: vi.fn(async () => ({
          success: true,
          audioDataUrl: 'data:audio/wav;base64,UklGRg==',
          audioUrl: null,
          jobId: null,
          model: 'facebook/musicgen-small',
          providerKey: 'musicgen_small',
          generationMode: 'segment',
          requestedDuration: 180,
          actualDuration: null,
          error: null,
        })),
      }
    })

    const result = await call('huggingface')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toMatch(/^data:audio\/wav;base64,/)
    expect(result.outputType).toBe('audio')
    expect(result.metadata?.generationMode).toBe('segment')
    expect(result.metadata?.requestedDuration).toBe(180)
  })

  it('GenX fails → falls back to HF successfully', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'lyria-3-pro-preview', latencyMs: 100, error: 'GenX quota exceeded',
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/music-capability', async () => {
      const actual = await vi.importActual<typeof import('../music-capability')>('../music-capability')
      return {
        ...actual,
        executeHFMusicGeneration: vi.fn(async () => ({
          success: true,
          audioDataUrl: 'data:audio/wav;base64,UklGRg==',
          audioUrl: null,
          jobId: null,
          model: 'facebook/musicgen-small',
          providerKey: 'musicgen_small',
          generationMode: 'segment',
          requestedDuration: 180,
          actualDuration: null,
          error: null,
        })),
      }
    })

    const result = await call('genx')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(true)
    expect(result.fallbackReason).toContain('GenX')
    expect(result.outputType).toBe('audio')
    expect(result.metadata?.generationMode).toBe('segment')
  })

  it('HF primary fails → falls back to GenX', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'huggingface', modelId: 'facebook/musicgen-small' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'fallback-genx-job',
        status: 'processing', model: 'lyria-3-pro-preview', latencyMs: 200, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/music-capability', async () => {
      const actual = await vi.importActual<typeof import('../music-capability')>('../music-capability')
      return {
        ...actual,
        executeHFMusicGeneration: vi.fn(async () => ({
          success: false,
          audioDataUrl: null, audioUrl: null, jobId: null,
          model: 'facebook/musicgen-small', providerKey: 'musicgen_small',
          generationMode: 'segment', requestedDuration: 180, actualDuration: null,
          error: 'Model loading timeout',
        })),
      }
    })

    const result = await call('huggingface')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('genx')
    expect(result.fallbackUsed).toBe(true)
    expect(result.jobId).toBe('fallback-genx-job')
    expect(result.metadata?.generationMode).toBe('full_song')
  })

  it('both providers fail → success=false, no blueprint', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'lyria-3-pro-preview', latencyMs: 50, error: 'quota exceeded',
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/music-capability', async () => {
      const actual = await vi.importActual<typeof import('../music-capability')>('../music-capability')
      return {
        ...actual,
        executeHFMusicGeneration: vi.fn(async () => ({
          success: false,
          audioDataUrl: null, audioUrl: null, jobId: null,
          model: 'facebook/musicgen-small', providerKey: 'musicgen_small',
          generationMode: 'segment', requestedDuration: 180, actualDuration: null,
          error: 'HF failed',
        })),
      }
    })

    const result = await call('genx')
    expect(result.success).toBe(false)
    expect(result.output).toBeNull()
    expect(result.outputType).toBe('audio')
    expect(result.outputType).not.toBe('music_blueprint')
    expect(result.error).toBeTruthy()
  })

  it('no providers available → success=false with clear error', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => null),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'lyria-3-pro-preview', latencyMs: 50, error: 'GenX not configured',
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async () => null),
      callProvider: vi.fn(),
    }))

    const result = await call('genx')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.outputType).not.toBe('music_blueprint')
  })

  it('rejects 6 genres before any provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => { throw new Error('should not reach provider') }),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call('genx', {
      genres: ['pop', 'rock', 'jazz', 'soul', 'rnb', 'reggae'],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Maximum 5 genres')
  })

  it('rejects unsupported genre before any provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => { throw new Error('should not reach provider') }),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call('genx', { genres: ['dubstep'] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported genre')
    expect(result.error).toContain('dubstep')
  })

  it('full 180s request routes to full_song metadata on GenX', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-full-song', status: 'processing',
        model: 'lyria-3-pro-preview', latencyMs: 100, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call('genx', { duration: 180 })
    expect(result.success).toBe(true)
    expect(result.metadata?.generationMode).toBe('full_song')
    expect(result.metadata?.requestedDuration).toBe(180)
  })

  it('custom lyrics route includes lyricsMode=custom in metadata', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-custom-lyrics', status: 'processing',
        model: 'lyria-3-pro-preview', latencyMs: 100, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call('genx', {
      lyrics: '[Verse 1]\nMy custom lyrics here\n[Chorus]\nThis is the chorus',
    })
    expect(result.success).toBe(true)
    expect(result.metadata?.lyricsMode).toBe('custom')
  })

  it('instrumental request includes lyricsMode=instrumental in metadata', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'lyria-3-pro-preview' })),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-instrumental', status: 'processing',
        model: 'lyria-3-pro-preview', latencyMs: 100, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call('genx', { vocalType: 'instrumental' })
    expect(result.success).toBe(true)
    expect(result.metadata?.lyricsMode).toBe('instrumental')
    expect(result.metadata?.vocalType).toBe('instrumental')
  })
})
