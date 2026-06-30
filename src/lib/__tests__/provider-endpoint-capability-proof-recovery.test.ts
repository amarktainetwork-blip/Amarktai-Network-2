import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  ACTIVE_AI_PROVIDER_KEYS,
  REMOVED_AI_PROVIDER_KEYS,
  getAllProviderRuntimes,
  getEligibleProvidersForCapability,
  getProviderRuntime,
} from '@/lib/provider-runtime'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { AI_PROVIDER_MESH } from '@/lib/provider-mesh'
import { TOGETHER_VIDEO_CATALOG, resolveVideoProviderOrder } from '@/lib/video-capability'

const repoPath = (...parts: string[]) => path.join(process.cwd(), ...parts)

// ── Mocks for capability-runtime-truth tests ──────────────────────────────────

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
import { checkWritable } from '@/lib/local-json-store'

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)
const mockCheckWritable = vi.mocked(checkWritable)

const noNotes = { lastTestStatus: undefined, lastTestPassed: undefined, lastTestedAt: undefined, lastError: undefined }
const passedNotes = { lastTestStatus: 'passed' as const, lastTestPassed: true, lastTestedAt: '2026-06-26T10:00:00Z', lastError: '' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  mockCheckWritable.mockReturnValue({ writable: true, root: '/tmp', file: '/tmp/artifacts.json' })
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
  delete process.env.HF_ADULT_TEXT_ENDPOINT
  delete process.env.ADULT_MODE_ENABLED
})

// ── Original tests (no capability-proof-registry dependency) ──────────────────

describe('provider endpoint and capability proof recovery', () => {
  it('keeps the active provider set exact and excludes removed providers', () => {
    expect(ACTIVE_AI_PROVIDER_KEYS).toEqual(['genx', 'together', 'groq'])

    const runtimeKeys = getAllProviderRuntimes().map((provider) => provider.key)
    expect(runtimeKeys).toEqual([...ACTIVE_AI_PROVIDER_KEYS])

    const meshKeys = AI_PROVIDER_MESH.map((provider) => provider.id)
    expect(meshKeys).toEqual(expect.arrayContaining(['genx', 'together', 'groq', 'mimo']))
    expect(meshKeys).toHaveLength(4)
    expect(meshKeys).not.toContain('huggingface')
    for (const removed of REMOVED_AI_PROVIDER_KEYS) {
      expect(runtimeKeys).not.toContain(removed)
      expect(meshKeys).not.toContain(removed)
    }
  })

  it('documents provider endpoint shape without over-claiming media support', () => {
    const huggingFace = getProviderRuntime('huggingface')!
    expect(huggingFace.taskEndpointMap.chat?.endpoint).toContain('/chat/completions')
    expect(huggingFace.taskEndpointMap.text_to_image?.endpoint).toBe('/models/{model}')
    expect(huggingFace.taskEndpointMap.music_song?.status).toBe('requires_endpoint')
    expect(huggingFace.taskEndpointMap.adult_text?.dedicatedEndpointEnv).toBe('HF_ADULT_TEXT_ENDPOINT')

    const together = getProviderRuntime('together')!
    expect(together.taskEndpointMap.text_to_image?.notes).toContain('never video')
    expect(together.supportedCapabilityKeys).not.toContain('text_to_video')

    const groq = getProviderRuntime('groq')!
    expect(groq.unsupportedCapabilityKeys).toEqual(expect.arrayContaining(['text_to_image', 'text_to_video', 'music_song']))

    const mimo = getProviderRuntime('mimo')!
    expect(mimo.baseUrl).toContain('xiaomimimo')
    expect(mimo.envAliases).not.toContain('MINIMAX_API_KEY')
    expect(mimo.unsupportedCapabilityKeys).toEqual(expect.arrayContaining(['text_to_image', 'text_to_video', 'text_to_speech']))
  })

  it('keeps adult providers deferred from active V1 routing', () => {
    expect(getEligibleProvidersForCapability('adult_text').map((provider) => provider.key)).toEqual([])
    expect(getEligibleProvidersForCapability('adult_text', { adult: true }).map((provider) => provider.key)).toEqual([])

    for (const capability of ['adult_text', 'adult_image', 'adult_voice'] as const) {
      const route = getMediaCapabilityRoute(capability)
      expect(route?.providers).toEqual([])
    }
    expect(getMediaCapabilityRoute('adult_video')?.route).toBe('')
    expect(getMediaCapabilityRoute('adult_video')?.providers).toEqual([])
  })

  it('does not route Together FLUX image models as video', () => {
    expect(TOGETHER_VIDEO_CATALOG).toEqual([])
    const cheap = resolveVideoProviderOrder('cheap', 'text_to_video', 10)
    const balanced = resolveVideoProviderOrder('balanced', 'text_to_video', 10)
    expect([cheap.primary, ...cheap.fallbacks]).not.toContain('together')
    expect([balanced.primary, ...balanced.fallbacks]).not.toContain('together')
  })

  it('blocks app-facing provider/model overrides while preserving admin test lanes', () => {
    const requestRoute = readFileSync(repoPath('src/app/api/brain/request/route.ts'), 'utf8')
    expect(requestRoute).toContain('App requests cannot override provider routing')
    expect(requestRoute).not.toContain('providerOverride: typeof body.metadata')
    expect(requestRoute).not.toContain('modelOverride: typeof body.metadata')

    const executeRoute = readFileSync(repoPath('src/app/api/brain/execute/route.ts'), 'utf8')
    const normaliseSegment = executeRoute.slice(
      executeRoute.indexOf('function normaliseToStandard'),
      executeRoute.indexOf('function applyResolvedTaskType'),
    )
    expect(normaliseSegment).not.toContain('provider_override')
    expect(normaliseSegment).not.toContain('model_override')
    expect(executeRoute).toContain('__admin_test__')
  })

  it('uses provider-runtime for admin provider tests and reports non-working states', () => {
    const adminRoute = readFileSync(repoPath('src/app/api/admin/providers/[id]/test/route.ts'), 'utf8')
    expect(adminRoute).toContain("from '@/lib/provider-runtime'")
    expect(adminRoute).toContain('requires_endpoint')
    expect(adminRoute).toContain('requires live verification')
    expect(adminRoute).toContain('/api/admin/settings/test-provider')
  })
})

// ── Migrated from capability-proof-registry — now uses canonical truth ─────────

describe('capability runtime truth: proof-based status (replaces hardcoded proof registry)', () => {
  // 1. Provider-backed media never marked working from static metadata alone
  it('provider-backed media capabilities are never working from metadata alone', async () => {
    // No providers connected
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    const mediaEntries = entries.filter((e) =>
      (e.category === 'image' || e.category === 'video' || e.category === 'audio') &&
      !e.capabilityId.startsWith('adult_'),
    )

    for (const entry of mediaEntries) {
      expect(
        entry.status,
        `${entry.capabilityId} must not be working with no connected providers`,
      ).not.toBe('working')
      expect(entry.proofStatus).not.toBe('passed')
    }
  })

  // 2. Connected provider but no live media proof → wired_unproven
  it('media capability with connected provider but no live proof is wired_unproven', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    // video_generation requires genx (connected) — but media needs live proof beyond chat test
    const video = entries.find((e) => e.capabilityId === 'video_generation')!
    expect(video.connectedProviderCandidates).toContain('genx')
    expect(video.status).toBe('wired_unproven')
    expect(video.proofStatus).not.toBe('passed')

    // image_generation similarly wired_unproven even with connected genx
    const image = entries.find((e) => e.capabilityId === 'image_generation')!
    expect(image.connectedProviderCandidates.length).toBeGreaterThan(0)
    expect(image.status).toBe('wired_unproven')
  })

  // 3. No provider key → missing, not working
  it('capabilities with no provider key are missing, not working', async () => {
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    const providerBacked = entries.filter((e) =>
      e.providerCandidates.length > 0 && !e.capabilityId.startsWith('adult_'),
    )

    for (const entry of providerBacked) {
      expect(
        entry.status === 'working',
        `${entry.capabilityId} must not be working with no keys`,
      ).toBe(false)
    }
  })

  // 4. Storage-only capabilities work only when storage passes
  it('storage-only capabilities are working when storage is writable', async () => {
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    for (const id of ['assets', 'approvals', 'scheduler']) {
      const entry = entries.find((e) => e.capabilityId === id)!
      expect(entry.status).toBe('working')
      expect(entry.proofStatus).toBe('passed')
    }
  })

  it('storage-only capabilities are blocked when storage is not writable', async () => {
    mockCheckWritable.mockReturnValue({ writable: false, root: '/tmp', file: '/tmp/artifacts.json' })

    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    for (const id of ['assets', 'approvals', 'scheduler']) {
      const entry = entries.find((e) => e.capabilityId === id)!
      expect(entry.status).toBe('blocked')
      expect(entry.hasStorage).toBe(false)
    }
  })

  // 5. Adult capabilities are deferred from active V1 runtime
  it('adult capabilities are deferred from active V1 runtime', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    // No adult endpoints set, adult mode off

    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const entries = await getCapabilityRuntimeTruth()

    for (const id of ['adult_text', 'adult_image', 'adult_video', 'adult_voice']) {
      const entry = entries.find((e) => e.capabilityId === id)!
      expect(entry.status).toBe('blocked')
      expect(entry.providerCandidates).toEqual([])
      expect(entry.connectedProviderCandidates).toEqual([])
      expect(entry.blocker).toContain('deferred')
    }
  })

  it('adult_text stays deferred even when legacy HF adult endpoint config exists', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    process.env.ADULT_MODE_ENABLED = 'true'
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://legacy-hf.example/adult-text'

    const { getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')
    const entry = await getCapabilityRuntimeTruthEntry('adult_text')

    expect(entry!.status).toBe('blocked')
    expect(entry!.providerCandidates).toEqual([])
    expect(entry!.connectedProviderCandidates).toEqual([])
    expect(entry!.blocker).toContain('deferred')
  })
})
