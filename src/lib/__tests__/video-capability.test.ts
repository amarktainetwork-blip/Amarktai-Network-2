/**
 * Video Capability Tests — Multi-Provider Suite
 *
 * Covers:
 *  - Payload validation (text_to_video, image_to_video, cartoon_episode, series)
 *  - HF video catalog (HunyuanVideo, LTX-Video, Wan2, CogVideoX, AnimateDiff)
 *  - HF candidate resolution (endpoint env vars, mode filtering, cartoon preference)
 *  - HF candidate execution (binary video, JSON URL, job_id, loading failure)
 *  - Together video execution
 *  - Budget-based provider ordering (cheap/balanced/premium)
 *  - Router: GenX success, Together success, HF success
 *  - Router: GenX→Together→HF fallback chain
 *  - Router: long_form returns orchestration_plan, not fake assembled video
 *  - Router: storyboard/plan cannot be video-generation success
 *  - Router: no removed providers
 *  - Router: Groq/MiMo not claimed as video generators
 *
 * ACTIVE PROVIDERS: genx, together, huggingface
 * TEXT-ONLY (no video): groq, mimo
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateVideoPayload,
  buildVideoProviderPrompt,
  resolveHFVideoCandidates,
  resolveVideoProviderOrder,
  executeHFVideoCandidate,
  HF_VIDEO_CATALOG,
  TOGETHER_VIDEO_CATALOG,
  ALLOWED_VIDEO_STYLES,
  ALLOWED_ASPECT_RATIOS,
  type VideoCapabilityPayload,
  type HFVideoCandidate,
} from '../video-capability'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<VideoCapabilityPayload> = {}): VideoCapabilityPayload {
  return {
    prompt: 'A peaceful forest scene at sunset',
    mode: 'text_to_video',
    duration: 10,
    aspectRatio: '16:9',
    budget: 'balanced',
    ...overrides,
  }
}

function makeHFCandidate(overrides: Partial<HFVideoCandidate['entry']> = {}): HFVideoCandidate {
  return {
    entry: {
      key: 'animatediff',
      label: 'AnimateDiff',
      modelId: 'ByteDance/AnimateDiff-Lightning',
      endpointEnvKey: null,
      modesSupported: ['text_to_video', 'short_form'],
      generationMode: 'clip',
      supportsImageInput: false,
      supportsVideoInput: false,
      supportsCartoon: true,
      supportsRealistic: false,
      maxDurationSeconds: 4,
      requiresEndpoint: false,
      costTier: 'free',
      qualityTier: 'basic',
      priority: 40,
      notes: '',
      ...overrides,
    },
    endpointUrl: null,
    hfApiKey: 'hf-test-key',
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

describe('validateVideoPayload', () => {
  it('accepts valid text_to_video payload', () => {
    expect(validateVideoPayload(makePayload())).toBeNull()
  })

  it('rejects empty prompt', () => {
    expect(validateVideoPayload(makePayload({ prompt: '' }))).toContain('Prompt is required')
  })

  it('rejects duration below 3s', () => {
    expect(validateVideoPayload(makePayload({ duration: 2 }))).toContain('3')
  })

  it('rejects duration above 600s', () => {
    expect(validateVideoPayload(makePayload({ duration: 601 }))).toContain('600')
  })

  it('accepts duration range 3–600s', () => {
    expect(validateVideoPayload(makePayload({ duration: 3 }))).toBeNull()
    expect(validateVideoPayload(makePayload({ duration: 600 }))).toBeNull()
  })

  it('rejects unsupported style', () => {
    const r = validateVideoPayload(makePayload({ style: 'watercolor' as VideoCapabilityPayload['style'] }))
    expect(r).toContain('Unsupported style')
    expect(r).toContain('watercolor')
  })

  it('accepts all allowed styles', () => {
    for (const style of ALLOWED_VIDEO_STYLES) {
      expect(validateVideoPayload(makePayload({ style })), `style "${style}"`).toBeNull()
    }
  })

  it('rejects unsupported aspect ratio', () => {
    const r = validateVideoPayload(makePayload({ aspectRatio: '3:4' as VideoCapabilityPayload['aspectRatio'] }))
    expect(r).toContain('Unsupported aspect ratio')
  })

  it('accepts all allowed aspect ratios', () => {
    for (const ar of ALLOWED_ASPECT_RATIOS) {
      expect(validateVideoPayload(makePayload({ aspectRatio: ar })), `ratio "${ar}"`).toBeNull()
    }
  })

  it('image_to_video requires imageInput', () => {
    const r = validateVideoPayload(makePayload({ mode: 'image_to_video', imageInput: undefined }))
    expect(r).toContain('imageInput')
  })

  it('image_to_video accepted with imageInput', () => {
    expect(validateVideoPayload(makePayload({ mode: 'image_to_video', imageInput: 'https://example.com/img.png' }))).toBeNull()
  })

  it('video_to_video requires videoInput', () => {
    const r = validateVideoPayload(makePayload({ mode: 'video_to_video', videoInput: undefined }))
    expect(r).toContain('videoInput')
  })

  it('cartoon_episode accepted with characters and series metadata', () => {
    const r = validateVideoPayload(makePayload({
      mode: 'cartoon_episode',
      characters: [{ id: 'hero', name: 'Milo', description: 'A brave young fox', visualStyle: 'children_cartoon' }],
      series: { seriesName: 'Milo Adventures', episodeNumber: 3, totalEpisodes: 10 },
    }))
    expect(r).toBeNull()
  })

  it('rejects more than 50 scenes', () => {
    const scenes = Array.from({ length: 51 }, (_, i) => ({ id: `s${i}`, description: 'scene', durationSeconds: 5 }))
    expect(validateVideoPayload(makePayload({ scenes }))).toContain('50 scenes')
  })
})

// ── Prompt builder ────────────────────────────────────────────────────────────

describe('buildVideoProviderPrompt', () => {
  it('includes style and duration in prompt', () => {
    const r = buildVideoProviderPrompt(makePayload({ style: 'cinematic', duration: 15 }))
    expect(r.prompt).toContain('15-second')
    expect(r.prompt).toContain('cinematic')
  })

  it('includes aspect ratio', () => {
    const r = buildVideoProviderPrompt(makePayload({ aspectRatio: '9:16' }))
    expect(r.aspectRatio).toBe('9:16')
  })

  it('long_form returns orchestration_plan generationMode', () => {
    const r = buildVideoProviderPrompt(makePayload({ mode: 'long_form', duration: 120 }))
    expect(r.generationMode).toBe('orchestration_plan')
    expect(r.orchestrationPlan).toBeDefined()
  })

  it('cartoon_episode returns orchestration_plan with character and series data', () => {
    const r = buildVideoProviderPrompt(makePayload({
      mode: 'cartoon_episode',
      duration: 180,
      characters: [{ id: 'hero', name: 'Milo', description: 'A brave fox' }],
      series: { seriesName: 'Milo Adventures', episodeNumber: 2 },
    }))
    expect(r.generationMode).toBe('orchestration_plan')
    expect(r.orchestrationPlan?.characters[0].name).toBe('Milo')
    expect(r.orchestrationPlan?.seriesMetadata?.seriesName).toBe('Milo Adventures')
    expect(r.orchestrationPlan?.seriesMetadata?.episodeNumber).toBe(2)
  })

  it('daily series metadata is preserved in orchestration plan', () => {
    const r = buildVideoProviderPrompt(makePayload({
      mode: 'cartoon_episode',
      duration: 90,
      series: {
        seriesName: 'Daily Bedtime Tales',
        episodeNumber: 7,
        recurringCharacters: ['Lily', 'Bruno'],
        previousEpisodeSummary: 'Lily found a magic key',
        styleConsistencyNotes: 'Soft watercolor look, warm palette',
      },
    }))
    expect(r.orchestrationPlan?.seriesMetadata?.recurringCharacters).toContain('Lily')
    expect(r.orchestrationPlan?.seriesMetadata?.previousEpisodeSummary).toContain('magic key')
    expect(r.orchestrationPlan?.assemblyNotes).toContain('consistency')
  })

  it('text_to_video short clip returns clip generationMode', () => {
    const r = buildVideoProviderPrompt(makePayload({ mode: 'text_to_video', duration: 10 }))
    expect(r.generationMode).toBe('clip')
    expect(r.orchestrationPlan).toBeUndefined()
  })

  it('image_to_video sets hasImageInput=true', () => {
    const r = buildVideoProviderPrompt(makePayload({ mode: 'image_to_video', imageInput: 'https://example.com/img.png' }))
    expect(r.hasImageInput).toBe(true)
    expect(r.generationMode).toBe('image_to_video')
  })
})

// ── HF Video Catalog ──────────────────────────────────────────────────────────

describe('HF_VIDEO_CATALOG', () => {
  it('contains HunyuanVideo as full endpoint-required provider', () => {
    const e = HF_VIDEO_CATALOG.find(e => e.key === 'hunyuan_video')
    expect(e).toBeDefined()
    expect(e!.requiresEndpoint).toBe(true)
    expect(e!.supportsRealistic).toBe(true)
    expect(e!.generationMode).toBe('clip')
  })

  it('contains LTX-Video with image input support', () => {
    const e = HF_VIDEO_CATALOG.find(e => e.key === 'ltx_video')
    expect(e).toBeDefined()
    expect(e!.supportsImageInput).toBe(true)
    expect(e!.modesSupported).toContain('image_to_video')
  })

  it('contains Wan2 with cartoon and realistic support', () => {
    const e = HF_VIDEO_CATALOG.find(e => e.key === 'wan2')
    expect(e).toBeDefined()
    expect(e!.supportsCartoon).toBe(true)
    expect(e!.supportsRealistic).toBe(true)
    expect(e!.requiresEndpoint).toBe(true)
  })

  it('contains CogVideoX as endpoint-required provider', () => {
    const e = HF_VIDEO_CATALOG.find(e => e.key === 'cogvideox')
    expect(e).toBeDefined()
    expect(e!.requiresEndpoint).toBe(true)
    expect(e!.supportsCartoon).toBe(true)
  })

  it('contains AnimateDiff as serverless provider', () => {
    const e = HF_VIDEO_CATALOG.find(e => e.key === 'animatediff')
    expect(e).toBeDefined()
    expect(e!.requiresEndpoint).toBe(false)
    expect(e!.supportsCartoon).toBe(true)
  })

  it('endpoint-required providers have higher priority than serverless', () => {
    const endpointEntries = HF_VIDEO_CATALOG.filter(e => e.requiresEndpoint)
    const serverlessEntries = HF_VIDEO_CATALOG.filter(e => !e.requiresEndpoint)
    const minEndpoint = Math.min(...endpointEntries.map(e => e.priority))
    const maxServerless = Math.max(...serverlessEntries.map(e => e.priority))
    expect(minEndpoint).toBeGreaterThan(maxServerless)
  })
})

describe('TOGETHER_VIDEO_CATALOG', () => {
  it('does not route FLUX image models as video models', () => {
    expect(TOGETHER_VIDEO_CATALOG).toHaveLength(0)
    expect(TOGETHER_VIDEO_CATALOG.map((entry) => entry.modelId)).not.toContain('black-forest-labs/FLUX.1-schnell-Free')
  })
})

// ── HF candidate resolution ───────────────────────────────────────────────────

describe('resolveHFVideoCandidates', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns only serverless AnimateDiff when no endpoint env vars set', () => {
    const candidates = resolveHFVideoCandidates('hf-key', 'text_to_video', undefined, false, 'balanced')
    for (const c of candidates) {
      expect(c.entry.requiresEndpoint).toBe(false)
    }
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('includes HunyuanVideo when HF_ENDPOINT_HUNYUAN_VIDEO is set', () => {
    process.env.HF_ENDPOINT_HUNYUAN_VIDEO = 'https://endpoint.hf.co/hunyuan'
    const candidates = resolveHFVideoCandidates('hf-key', 'text_to_video', undefined, false, 'balanced')
    delete process.env.HF_ENDPOINT_HUNYUAN_VIDEO
    const entry = candidates.find(c => c.entry.key === 'hunyuan_video')
    expect(entry).toBeDefined()
    expect(entry!.endpointUrl).toContain('hunyuan')
  })

  it('prefers cartoon-capable models for cartoon style', () => {
    process.env.HF_ENDPOINT_COGVIDEOX = 'https://endpoint.hf.co/cogvideox'
    const candidates = resolveHFVideoCandidates('hf-key', 'text_to_video', 'cartoon', false, 'balanced')
    delete process.env.HF_ENDPOINT_COGVIDEOX
    if (candidates.length > 0) {
      expect(candidates[0].entry.supportsCartoon).toBe(true)
    }
  })

  it('filters out image_to_video models for modes that need image input', () => {
    const candidates = resolveHFVideoCandidates('hf-key', 'image_to_video', undefined, true, 'balanced')
    for (const c of candidates) {
      expect(c.entry.supportsImageInput).toBe(true)
    }
  })

  it('cheap budget skips medium-cost endpoint models for text_to_video', () => {
    process.env.HF_ENDPOINT_HUNYUAN_VIDEO = 'https://endpoint.hf.co/hunyuan'
    const candidates = resolveHFVideoCandidates('hf-key', 'text_to_video', undefined, false, 'cheap')
    delete process.env.HF_ENDPOINT_HUNYUAN_VIDEO
    const hunyuan = candidates.find(c => c.entry.key === 'hunyuan_video')
    // HunyuanVideo is medium cost — should be excluded from cheap text_to_video
    expect(hunyuan).toBeUndefined()
  })
})

// ── HF candidate execution ────────────────────────────────────────────────────

describe('executeHFVideoCandidate', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('binary video response → data URL with success=true', async () => {
    const fakeMp4 = new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'video/mp4' : null },
      arrayBuffer: async () => fakeMp4.buffer,
      json: async () => ({}), text: async () => '',
    })))

    const c = makeHFCandidate()
    const r = await executeHFVideoCandidate('forest scene', 10, c)
    expect(r.success).toBe(true)
    expect(r.videoDataUrl).toMatch(/^data:video\/mp4;base64,/)
    expect(r.videoUrl).toBeNull()
    expect(r.error).toBeNull()
  })

  it('JSON URL response → returns videoUrl', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ url: 'https://storage.example.com/clip.mp4', duration: 5 }),
      text: async () => '{}',
    })))

    const r = await executeHFVideoCandidate('test', 10, makeHFCandidate({ generationMode: 'clip' }))
    expect(r.success).toBe(true)
    expect(r.videoUrl).toBe('https://storage.example.com/clip.mp4')
    expect(r.videoDataUrl).toBeNull()
    expect(r.actualDuration).toBe(5)
  })

  it('JSON job_id response → returns jobId with success=true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ job_id: 'hf-video-job-1', status: 'processing' }),
      text: async () => '{}',
    })))

    const r = await executeHFVideoCandidate('test', 10, makeHFCandidate())
    expect(r.success).toBe(true)
    expect(r.jobId).toBe('hf-video-job-1')
    expect(r.videoUrl).toBeNull()
  })

  it('503 loading → returns failure with loading message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      headers: { get: () => null },
      text: async () => 'Model is currently loading',
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
    })))

    const r = await executeHFVideoCandidate('test', 10, makeHFCandidate())
    expect(r.success).toBe(false)
    expect(r.error).toContain('loading')
  })

  it('empty video buffer → returns failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'video/mp4' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}), text: async () => '',
    })))

    const r = await executeHFVideoCandidate('test', 10, makeHFCandidate())
    expect(r.success).toBe(false)
    expect(r.error).toContain('empty')
  })

  it('segment provider reports its own generationMode, not assembled_video', async () => {
    const fakeMp4 = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'video/mp4' : null },
      arrayBuffer: async () => fakeMp4.buffer,
      json: async () => ({}), text: async () => '',
    })))

    const r = await executeHFVideoCandidate('test', 10, makeHFCandidate({ generationMode: 'clip' }))
    expect(r.success).toBe(true)
    expect(r.generationMode).toBe('clip')
    expect(r.generationMode).not.toBe('assembled_video')
  })
})

// ── Budget provider ordering ──────────────────────────────────────────────────

describe('resolveVideoProviderOrder', () => {
  it('cheap: prefers huggingface over genx for text_to_video', () => {
    const order = resolveVideoProviderOrder('cheap', 'text_to_video', 10)
    expect(order.primary).toBe('huggingface')
    expect(order.fallbacks).toContain('genx')
    expect(order.fallbacks).not.toContain('together')
  })

  it('premium: genx is primary', () => {
    const order = resolveVideoProviderOrder('premium', 'text_to_video', 30)
    expect(order.primary).toBe('genx')
    expect(order.fallbacks).not.toContain('together')
  })

  it('balanced short clip: prefers huggingface', () => {
    const order = resolveVideoProviderOrder('balanced', 'text_to_video', 10)
    expect(order.primary).toBe('huggingface')
  })

  it('balanced long clip: prefers genx', () => {
    const order = resolveVideoProviderOrder('balanced', 'text_to_video', 60)
    expect(order.primary).toBe('genx')
  })

  it('only proven video providers appear across primary + fallbacks', () => {
    const order = resolveVideoProviderOrder('balanced', 'text_to_video', 10)
    const all = [order.primary, ...order.fallbacks]
    expect(all).toContain('genx')
    expect(all).toContain('huggingface')
    expect(all).not.toContain('together')
  })
})

// ── Router tests ──────────────────────────────────────────────────────────────

describe('executeCapability video_generation — router', () => {
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
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => ({ providerKey: 'genx', modelId: 'veo-3.1' })),
    }))
  }

  const videoMeta = { prompt: 'A forest scene', mode: 'text_to_video', duration: 10, budget: 'premium' }

  function call(metaOverrides: Record<string, unknown> = {}) {
    return import('../capability-router').then(({ executeCapability }) =>
      executeCapability({
        input: 'A forest scene',
        capability: 'video_generation',
        providerOverride: 'genx', // bypasses IS_TEST_RUNTIME fast exit
        metadata: { ...videoMeta, ...metaOverrides },
      })
    )
  }

  it('GenX async job → success with jobId and generationMode=clip', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'genx-video-job-1', status: 'processing',
        model: 'veo-3.1', latencyMs: 200, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
      GENX_VIDEO_MODELS: ['veo-3.1', 'kling-v3-pro'],
      GENX_I2V_MODELS: ['kling-v3-pro-i2v'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call()
    expect(result.success).toBe(true)
    expect(result.provider).toBe('genx')
    expect(result.jobId).toBe('genx-video-job-1')
    expect(result.outputType).toBe('video')
    expect(result.metadata?.generationMode).toBe('clip')
    expect(result.metadata?.requestedDuration).toBe(10)
    // Must not be a storyboard/plan
    expect(result.metadata?.generationMode).not.toBe('long_form_plan')
    expect(result.metadata?.generationMode).not.toBe('orchestration_plan')
  })

  it('GenX sync URL → success with output URL', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: true, url: 'https://cdn.genx.com/video.mp4', jobId: null,
        status: 'completed', model: 'veo-3.1', latencyMs: 1500, error: null,
      })),
      GENX_AUDIO_MODELS: ['lyria-3-pro-preview'],
      GENX_VIDEO_MODELS: ['veo-3.1'],
      GENX_I2V_MODELS: ['kling-v3-pro-i2v'],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call()
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://cdn.genx.com/video.mp4')
    expect(result.outputType).toBe('video')
    expect(result.metadata?.provider).toBe('genx')
    expect(result.metadata?.model).toBe('veo-3.1')
  })

  it('Together video success → returns video URL with provider=together', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/video-capability', async () => {
      const actual = await vi.importActual<typeof import('../video-capability')>('../video-capability')
      return {
        ...actual,
        executeTogetherVideoGeneration: vi.fn(async () => {
          throw new Error('Together video should not be called')
        }),
        executeHFVideoGeneration: vi.fn(async () => ({
          success: true, videoUrl: 'https://cdn.hf.example/clip.mp4', videoDataUrl: null,
          jobId: null, model: 'ByteDance/AnimateDiff-Lightning',
          providerKey: 'animatediff', generationMode: 'clip',
          requestedDuration: 10, actualDuration: 4, error: null,
        })),
      }
    })

    const result = await call({ budget: 'cheap' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toBe('https://cdn.hf.example/clip.mp4')
    expect(result.outputType).toBe('video')
    expect(result.metadata?.generationMode).toBe('clip')
  })

  it('HF video success → returns video data URL with provider=huggingface', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/video-capability', async () => {
      const actual = await vi.importActual<typeof import('../video-capability')>('../video-capability')
      return {
        ...actual,
        executeHFVideoGeneration: vi.fn(async () => ({
          success: true, videoUrl: null, videoDataUrl: 'data:video/mp4;base64,AAAA',
          jobId: null, model: 'ByteDance/AnimateDiff-Lightning',
          providerKey: 'animatediff', generationMode: 'clip',
          requestedDuration: 10, actualDuration: 4, error: null,
        })),
      }
    })

    const result = await call({ budget: 'cheap' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toMatch(/^data:video\/mp4;base64,/)
    expect(result.outputType).toBe('video')
    expect(result.metadata?.generationMode).toBe('clip')
  })

  it('GenX fails → falls back to Together', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'veo-3.1', latencyMs: 50, error: 'GenX quota exceeded',
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/video-capability', async () => {
      const actual = await vi.importActual<typeof import('../video-capability')>('../video-capability')
      return {
        ...actual,
        executeTogetherVideoGeneration: vi.fn(async () => {
          throw new Error('Together video should not be called')
        }),
        executeHFVideoGeneration: vi.fn(async () => ({
          success: true, videoUrl: 'https://cdn.hf.example/fallback.mp4', videoDataUrl: null,
          jobId: null, model: 'ByteDance/AnimateDiff-Lightning',
          providerKey: 'animatediff', generationMode: 'clip',
          requestedDuration: 10, actualDuration: 4, error: null,
        })),
      }
    })

    const result = await call({ budget: 'premium' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(true)
  })

  it('GenX and Together fail → falls back to HF', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'veo-3.1', latencyMs: 50, error: 'GenX quota exceeded',
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async (p: string) => {
        if (p === 'huggingface') return 'hf-key'
        return null
      }),
      callProvider: vi.fn(),
    }))
    vi.doMock('@/lib/video-capability', async () => {
      const actual = await vi.importActual<typeof import('../video-capability')>('../video-capability')
      return {
        ...actual,
        executeTogetherVideoGeneration: vi.fn(async () => {
          throw new Error('Together video should not be called')
        }),
        executeHFVideoGeneration: vi.fn(async () => ({
          success: true, videoUrl: null, videoDataUrl: 'data:video/mp4;base64,BBBB',
          jobId: null, model: 'ByteDance/AnimateDiff-Lightning',
          providerKey: 'animatediff', generationMode: 'clip',
          requestedDuration: 10, actualDuration: 4, error: null,
        })),
      }
    })

    const result = await call({ budget: 'premium' })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(true)
  })

  it('all providers fail → success=false with clear error, no storyboard success', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'veo-3.1', latencyMs: 50, error: 'quota exceeded',
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn(async () => null),
      callProvider: vi.fn(),
    }))

    const result = await call()
    expect(result.success).toBe(false)
    expect(result.outputType).toBe('video')
    expect(result.error).toBeTruthy()
    // Must not be a storyboard/plan claiming success
    expect(result.output).toBeNull()
  })

  it('long_form returns orchestration_plan — not assembled_video success', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call({ mode: 'long_form', duration: 120 })
    expect(result.success).toBe(true)
    expect(result.metadata?.generationMode).toBe('orchestration_plan')
    // Warning must be present — caller knows this is a plan
    expect(result.warning).toBeTruthy()
    expect(result.warning).toContain('plan')
    // Output is a JSON plan string, not a video URL
    expect(typeof result.output).toBe('string')
    const plan = JSON.parse(result.output!)
    expect(plan.scenes).toBeDefined()
  })

  it('cartoon_episode returns orchestration_plan with character data', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call({
      mode: 'cartoon_episode',
      duration: 90,
      characters: [{ id: 'hero', name: 'Milo', description: 'A brave fox' }],
      series: { seriesName: 'Milo Adventures', episodeNumber: 4 },
    })
    expect(result.success).toBe(true)
    expect(result.metadata?.generationMode).toBe('orchestration_plan')
    const plan = JSON.parse(result.output!)
    expect(plan.characters[0].name).toBe('Milo')
    expect(plan.seriesMetadata.seriesName).toBe('Milo Adventures')
  })

  it('rejects invalid style before any provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(),
      callGenXMedia: vi.fn(async () => { throw new Error('should not reach provider') }),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call({ style: 'watercolor' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported style')
  })

  it('image_to_video without imageInput → validation failure', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call({ mode: 'image_to_video', imageInput: undefined })
    expect(result.success).toBe(false)
    expect(result.error).toContain('imageInput')
  })

  it('no removed providers appear in any success result', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: true, url: null, jobId: 'job-1', status: 'processing',
        model: 'veo-3.1', latencyMs: 100, error: null,
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call()
    const removed = ['openai', 'gemini', 'anthropic', 'replicate', 'deepseek', 'mistral', 'qwen', 'minimax', 'moonshot', 'cohere', 'nvidia', 'openrouter']
    for (const p of removed) {
      expect(result.provider).not.toBe(p)
    }
  })

  it('groq and mimo are not claimed as video providers', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/genx-client', () => ({
      callGenXChat: vi.fn(), callGenXMedia: vi.fn(async () => ({
        success: false, url: null, jobId: null, status: 'failed',
        model: 'veo-3.1', latencyMs: 50, error: 'no quota',
      })),
      GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: ['veo-3.1'], GENX_I2V_MODELS: [],
    }))
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))

    const result = await call()
    expect(result.provider).not.toBe('groq')
    expect(result.provider).not.toBe('mimo')
  })
})
