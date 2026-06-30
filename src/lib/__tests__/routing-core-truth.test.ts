/**
 * Tests for routing core truth fixes:
 * - Runtime does not select GenX for image when Together is suitable/cheaper
 * - Runtime does not select Veo by default for normal video
 * - Adult requests never select GenX
 * - Video route supports Together provider
 * - Capability truth does not mark non-executable providers as working
 * - HF is not shown as executable without endpoint env
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: vi.fn(),
  getMeshTestNotes: vi.fn(),
}))

vi.mock('@/lib/local-json-store', () => ({
  checkWritable: vi.fn(() => ({ writable: true, root: '/tmp', file: '/tmp/artifacts.json' })),
  listRecords: vi.fn(() => []),
  LOCAL_STORE_FILES: {
    memory: 'memory.json', approvals: 'approvals.json', artifacts: 'artifacts.json',
    research: 'research.json', apps: 'apps.json', agents: 'agents.json',
  },
  getStorageRoot: vi.fn(() => '/tmp'),
}))

import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)

const noNotes = { lastTestStatus: undefined, lastTestPassed: undefined, lastTestedAt: undefined, lastError: undefined }
const passedNotes = { lastTestStatus: 'passed' as const, lastTestPassed: true, lastTestedAt: '2026-06-26T10:00:00Z', lastError: '' }

const root = join(process.cwd())
const src = (rel: string) => readFileSync(join(root, rel), 'utf8')

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
  delete process.env.TOGETHER_ADULT_FALLBACK_ENABLED
  delete process.env.TOGETHER_ADULT_TEXT_MODEL
  delete process.env.TOGETHER_ADULT_IMAGE_MODEL
  delete process.env.TOGETHER_VIDEO_MODEL
  delete process.env.HF_ADULT_TEXT_ENDPOINT
  delete process.env.HF_ADULT_TEXT_MODEL
})

// ── Test 1: Image routing prefers Together over GenX for non-premium ──────────

describe('Image routing: Together preferred over GenX for non-premium', () => {
  it('Studio image provider order comes from capability truth', () => {
    const source = src('src/app/api/admin/studio/execute/route.ts')
    const truth = src('src/lib/capability-runtime-truth.ts')
    expect(source).not.toContain('STUDIO_EXECUTABLE_PROVIDERS')
    expect(source).toContain('truth.connectedProviderCandidates')
    expect(truth).toContain("providerCandidates: ['together', 'genx']")
  })

  it('brain/image route tries Together before GenX in non-premium auto path', () => {
    const source = src('src/app/api/brain/image/route.ts')
    // Auto routing uses a provider loop
    expect(source).toContain('for (const provider of eligibleProviders)')
    // The non-premium base order must be ['together', 'genx'] — together first
    expect(source).toContain("['together', 'genx']")
    // Must have fallback warn log when Together fails
    expect(source).toContain('Together failed, falling back')
  })

  it('brain/image route has selectGenXImageModel instead of GENX_IMAGE_MODELS[0]', () => {
    const source = src('src/app/api/brain/image/route.ts')
    // Must use quality-aware selection, not array position
    expect(source).toContain('selectGenXImageModel')
    // Must NOT use raw [0] index for default selection
    expect(source).not.toContain('GENX_IMAGE_MODELS[0]')
  })
})

// ── Test 2: Video routing does not default to veo-3.1 ────────────────────────

describe('Video routing: no Veo default', () => {
  it('video-generate route has selectGenXVideoModel with quality-tier selection', () => {
    const source = src('src/app/api/brain/video-generate/route.ts')
    expect(source).toContain('selectGenXVideoModel')
    // The raw array index must not be used for default model selection in the POST handler
    // (It may appear in comments/jsdoc, but must not be called directly)
    expect(source).not.toContain('GENX_VIDEO_MODELS[0]')
  })

  it('selectGenXVideoModel balanced default is not veo', () => {
    const source = src('src/app/api/brain/video-generate/route.ts')
    // The balanced default comment and return must not contain 'veo'
    const balancedSection = source.match(/balanced default[^\n]+\n\s*return '([^']+)'/)?.[1]
    expect(balancedSection).toBeDefined()
    expect(balancedSection).not.toContain('veo')
  })

  it('video-generate route schema accepts together as a valid provider', () => {
    const source = src('src/app/api/brain/video-generate/route.ts')
    // Schema enum must include together
    expect(source).toMatch(/z\.enum\(\s*\[.*'together'.*\]/)
  })

  it('video-generate route has a Together execution branch', () => {
    const source = src('src/app/api/brain/video-generate/route.ts')
    expect(source).toContain("provider === 'together'")
    expect(source).toContain('v1/video/generations')
    expect(source).toContain('TOGETHER_VIDEO_MODEL')
    expect(source).toContain('No default video model is assumed')
  })

  it('provider-video-policy max duration is 8s (scene-based, not one long clip)', async () => {
    const { PROVIDER_VIDEO_MAX_DURATION_SECONDS } = await import('@/lib/provider-video-policy')
    expect(PROVIDER_VIDEO_MAX_DURATION_SECONDS).toBe(8)
  })

  it('normalizeLongFormSceneDurations splits 90s into multiple 4-8s scenes', async () => {
    const { normalizeLongFormSceneDurations } = await import('@/lib/provider-video-policy')
    const scenes = normalizeLongFormSceneDurations(90)
    for (const dur of scenes) {
      expect(dur).toBeGreaterThanOrEqual(4)
      expect(dur).toBeLessThanOrEqual(8)
    }
    expect(scenes.length).toBeGreaterThanOrEqual(11)
    const total = scenes.reduce((a: number, b: number) => a + b, 0)
    expect(total).toBe(90)
  })

  it('long-form video execution does not use Gemini as an active provider or fallback', () => {
    const truth = src('src/lib/capability-runtime-truth.ts')
    const store = src('src/lib/long-form-video-store.ts')
    const longFormSpec = truth.slice(truth.indexOf("capabilityId: 'long_form_video'"), truth.indexOf("capabilityId: 'tts'"))
    expect(longFormSpec).toContain("providerCandidates: ['together', 'genx']")
    expect(longFormSpec.toLowerCase()).not.toContain('gemini')
    expect(store.toLowerCase()).not.toContain('gemini')
  })
})

// ── Test 3: Adult requests never select GenX ──────────────────────────────────

describe('Adult routing: GenX is blocked', () => {
  it('validateCapabilitySelection blocks adult_text + genx', async () => {
    const { validateCapabilitySelection } = await import('@/lib/provider-capability-governance')
    const result = validateCapabilitySelection({ capability: 'adult_text', provider: 'genx', adultPolicyAllows: true })
    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain('adult_provider_forbidden')
  })

  it('validateCapabilitySelection blocks adult_image + genx', async () => {
    const { validateCapabilitySelection } = await import('@/lib/provider-capability-governance')
    const result = validateCapabilitySelection({ capability: 'adult_image', provider: 'genx', adultPolicyAllows: true })
    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain('adult_provider_forbidden')
  })

  it('validateCapabilitySelection blocks adult_video + genx', async () => {
    const { validateCapabilitySelection } = await import('@/lib/provider-capability-governance')
    const result = validateCapabilitySelection({ capability: 'adult_video', provider: 'genx', adultPolicyAllows: true })
    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain('adult_provider_forbidden')
  })

  it('routeLiveModel for adult_text never returns genx as selectedProvider', async () => {
    const { routeLiveModel } = await import('@/lib/live-ai-routing')
    const result = routeLiveModel({ capability: 'adult_text', adultPolicy: 'full_adult' as never })
    expect(result.selectedProvider).not.toBe('genx')
  })

  it('routeLiveModel for adult_text fallback chain never includes genx', async () => {
    const { routeLiveModel } = await import('@/lib/live-ai-routing')
    const result = routeLiveModel({ capability: 'adult_text', adultPolicy: 'allowed' as never })
    for (const fb of result.fallbackChain) {
      expect(fb.provider).not.toBe('genx')
    }
  })

  it('live-ai-routing source: adult_text is deferred from active V1 runtime', () => {
    const source = src('src/lib/live-ai-routing.ts')
    expect(source).not.toContain("'genx', 'together', 'huggingface'")
    expect(source).toContain('Adult capability is deferred from active V1 runtime.')
  })
})

// ── Test 4: TTS Groq pass-through preserved ────────────────────────────────────

describe('TTS provider pass-through: Groq preserved', () => {
  it('brain/tts route contains Groq execution branch', () => {
    const source = src('src/app/api/brain/tts/route.ts')
    expect(source).toContain("entry.provider === 'groq'")
    expect(source).toContain('api.groq.com/openai/v1/audio/speech')
  })

  it('brain/tts iterates route.providers (not hardcoded to genx)', () => {
    const source = src('src/app/api/brain/tts/route.ts')
    expect(source).toContain('route.providers')
  })

  it('brain/tts does not force genx when a different provider is selected', () => {
    const source = src('src/app/api/brain/tts/route.ts')
    // The iteration must be over route.providers, not a hardcoded genx-first chain
    expect(source).not.toContain("if (provider === 'genx')")
  })
})

// ── Test 5: Capability truth: no working status without proof ─────────────────

describe('Capability truth: proof required', () => {
  it('image_generation with no connected provider is not working', async () => {
    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('image_generation')
    expect(entry!.status).not.toBe('working')
  })

  it('video_generation with genx connected (chat test only) is wired_unproven', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )
    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('video_generation')
    expect(entry!.status).toBe('wired_unproven')
    expect(entry!.proofStatus).not.toBe('passed')
  })

  it('video truth includes Together and blocks Together video without TOGETHER_VIDEO_MODEL', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'together' ? 'together-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'together' ? passedNotes : noNotes,
    )
    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('video_generation')
    expect(entry!.providerCandidates).toEqual(['together', 'genx'])
    expect(entry!.connectedProviderCandidates).not.toContain('together')
    expect(entry!.status).toBe('blocked')
    expect(entry!.blocker).toContain('TOGETHER_VIDEO_MODEL')
  })
})

// ── Test 6: HF not executable for adult without endpoint env ─────────────────

describe('Adult V1 runtime deferral', () => {
  it('adult_text with legacy HF key remains deferred', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('adult_text')
    expect(entry!.status).toBe('blocked')
    expect(entry!.providerCandidates).toEqual([])
    expect(entry!.connectedProviderCandidates).toEqual([])
    expect(entry!.blocker).toContain('deferred')
  })

  it('adult_text with legacy HF endpoint env still does not enter active V1', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://my-endpoint.hf.space'
    process.env.HF_ADULT_TEXT_MODEL = 'adult-text-model'
    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('adult_text')
    expect(entry!.status).toBe('blocked')
    expect(entry!.providerCandidates).toEqual([])
    expect(entry!.connectedProviderCandidates).toEqual([])
    expect(entry!.blocker).toContain('deferred')
  })
})
