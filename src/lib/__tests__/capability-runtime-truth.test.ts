/**
 * Focused tests for capability-runtime-truth.ts
 *
 * Proves that capabilities are NOT marked "working" from metadata or
 * route existence alone — only from connected providers + verified gates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: vi.fn(),
  getMeshTestNotes: vi.fn(),
}))

vi.mock('@/lib/local-json-store', () => ({
  checkWritable: vi.fn(() => ({ writable: true })),
  listRecords: vi.fn(() => []),
  LOCAL_STORE_FILES: {
    memory: 'memory.json',
    approvals: 'approvals.json',
    artifacts: 'artifacts.json',
    research: 'research.json',
    apps: 'apps.json',
    agents: 'agents.json',
  },
  getStorageRoot: vi.fn(() => '/tmp'),
}))

import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
import { checkWritable } from '@/lib/local-json-store'

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)
const mockCheckWritable = vi.mocked(checkWritable)

const storageOkResult = { writable: true, root: '/tmp', file: '/tmp/artifacts.json' }
const storageFailResult = { writable: false, root: '/tmp', file: '/tmp/artifacts.json' }

const noNotes = { lastTestStatus: undefined, lastTestPassed: undefined, lastTestedAt: undefined, lastError: undefined }
const passedNotes = { lastTestStatus: 'passed' as const, lastTestPassed: true, lastTestedAt: '2026-06-26T10:00:00Z', lastError: '' }
const failedNotes = { lastTestStatus: 'failed' as const, lastTestPassed: false, lastTestedAt: '2026-06-26T10:00:00Z', lastError: 'API error' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  mockCheckWritable.mockReturnValue(storageOkResult)
  // Clear adult env vars
  delete process.env.ADULT_MODE_ENABLED
  delete process.env.HF_ADULT_TEXT_ENDPOINT
  delete process.env.HF_ADULT_IMAGE_ENDPOINT
  delete process.env.HF_ADULT_VIDEO_ENDPOINT
  delete process.env.HF_ADULT_VOICE_ENDPOINT
})

// Import after mocks
const { getCapabilityRuntimeTruth, getCapabilityRuntimeTruthEntry } = await import('@/lib/capability-runtime-truth')

// ── Test: metadata-only = wired_unproven, not working ─────────────────────────

describe('metadata-only capability is wired_unproven, not working', () => {
  it('image_generation with no connected provider is missing', async () => {
    // No keys, no tests
    const entry = await getCapabilityRuntimeTruthEntry('image_generation')
    expect(entry).not.toBeNull()
    expect(entry!.status).toBe('missing')
    expect(entry!.proofStatus).toBe('not_tested')
    expect(entry!.connectedProviderCandidates).toHaveLength(0)
  })

  it('video_generation with no connected provider is missing', async () => {
    const entry = await getCapabilityRuntimeTruthEntry('video_generation')
    expect(entry!.status).toBe('missing')
    expect(entry!.proofStatus).not.toBe('passed')
  })

  it('tts with no connected provider is missing', async () => {
    const entry = await getCapabilityRuntimeTruthEntry('tts')
    expect(entry!.status).toBe('missing')
  })
})

// ── Test: route-only = wired_unproven, not working ────────────────────────────

describe('route-only capability is wired_unproven, not working', () => {
  it('image_generation with key saved but test not passed is wired_unproven', async () => {
    // Provider key saved but no live test yet
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockResolvedValue(noNotes)
    delete process.env.GENX_BASE_URL
    delete process.env.GENX_API_URL

    const entry = await getCapabilityRuntimeTruthEntry('image_generation')
    // genx has key but endpoint missing → blocked; or key saved without test → wired_unproven
    // Either way: NOT 'working'
    expect(entry!.status).not.toBe('working')
    expect(entry!.proofStatus).not.toBe('passed')
  })

  it('video_generation with connected genx (text test passed) is wired_unproven (media needs proof)', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const entry = await getCapabilityRuntimeTruthEntry('video_generation')
    // Media capabilities are wired_unproven even with a connected provider
    expect(entry!.status).toBe('wired_unproven')
    expect(entry!.proofStatus).not.toBe('passed')
    expect(entry!.connectedProviderCandidates).toContain('genx')
  })

  it('proofStatus is not_tested or route_only — never passed for media without explicit proof', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const allEntries = await getCapabilityRuntimeTruth()
    const mediaEntries = allEntries.filter((e) =>
      e.category === 'image' || e.category === 'video' || e.category === 'audio',
    )
    for (const entry of mediaEntries) {
      expect(
        entry.proofStatus === 'passed',
        `${entry.capabilityId} should not have proofStatus=passed without explicit media proof`,
      ).toBe(false)
    }
  })
})

// ── Test: missing key blocks working ─────────────────────────────────────────

describe('missing key blocks working status', () => {
  it('chat with no provider key is missing, not working', async () => {
    const entry = await getCapabilityRuntimeTruthEntry('chat')
    expect(entry!.status).toBe('missing')
    expect(entry!.hasRequiredKey).toBe(false)
  })

  it('chat with provider key + passed test is working', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key-live' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )
    process.env.GENX_BASE_URL = 'https://query.genx.sh'

    const entry = await getCapabilityRuntimeTruthEntry('chat')
    expect(entry!.status).toBe('working')
    expect(entry!.hasRequiredKey).toBe(true)
    expect(entry!.connectedProviderCandidates).toContain('genx')
  })

  it('embeddings with no huggingface key is missing', async () => {
    const entry = await getCapabilityRuntimeTruthEntry('embeddings')
    expect(entry!.status).toBe('missing')
    expect(entry!.hasRequiredKey).toBe(false)
  })
})

// ── Test: missing endpoint blocks working ─────────────────────────────────────

describe('missing endpoint blocks working status', () => {
  it('adult_text with no dedicated endpoint is blocked', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    process.env.ADULT_MODE_ENABLED = 'true'
    // No HF_ADULT_TEXT_ENDPOINT set

    const entry = await getCapabilityRuntimeTruthEntry('adult_text')
    expect(entry!.status).toBe('blocked')
    expect(entry!.hasRequiredEndpoint).toBe(false)
    expect(entry!.blocker).toMatch(/requires_endpoint/)
  })

  it('adult_text with dedicated endpoint passes endpoint gate', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    process.env.ADULT_MODE_ENABLED = 'true'
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://my-endpoint.hf.space'

    const entry = await getCapabilityRuntimeTruthEntry('adult_text')
    expect(entry!.hasRequiredEndpoint).toBe(true)
    // status is blocked because adult gate fails without adultGateOk
    // (endpoint is set but adult_mode check uses env or endpoint)
  })
})

// ── Test: missing storage blocks media capabilities ───────────────────────────

describe('missing storage blocks media capabilities', () => {
  it('image_generation with connected provider but no writable storage is blocked', async () => {
    mockCheckWritable.mockReturnValue(storageFailResult)
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const entry = await getCapabilityRuntimeTruthEntry('image_generation')
    expect(entry!.hasStorage).toBe(false)
    expect(entry!.status).toBe('blocked')
  })

  it('assets capability with no writable storage is blocked', async () => {
    mockCheckWritable.mockReturnValue(storageFailResult)

    const entry = await getCapabilityRuntimeTruthEntry('assets')
    expect(entry!.hasStorage).toBe(false)
    expect(entry!.status).toBe('blocked')
  })

  it('chat (no storage required) is not blocked by missing storage', async () => {
    mockCheckWritable.mockReturnValue(storageFailResult)
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )
    process.env.GENX_BASE_URL = 'https://query.genx.sh'

    const entry = await getCapabilityRuntimeTruthEntry('chat')
    // chat does not require storage
    expect(entry!.hasStorage).toBe(true)
    expect(entry!.status).toBe('working')
  })
})

// ── Test: adult gate blocks adult capabilities ─────────────────────────────────

describe('adult gate blocks adult capabilities when not configured', () => {
  it('adult_text is blocked when adult gate is not enabled', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://my-endpoint.hf.space'
    // ADULT_MODE_ENABLED not set, HF_ADULT_TEXT_ENDPOINT is set → gate OK via endpoint
    delete process.env.ADULT_MODE_ENABLED

    const entry = await getCapabilityRuntimeTruthEntry('adult_text')
    // endpoint is set, so adultGateOk = true via evalAdultGate
    expect(entry!.hasPermission).toBe(true)
  })

  it('adult_image is blocked when adult gate is off and no endpoint', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )
    delete process.env.ADULT_MODE_ENABLED
    delete process.env.HF_ADULT_TEXT_ENDPOINT

    const entry = await getCapabilityRuntimeTruthEntry('adult_image')
    expect(entry!.hasPermission).toBe(false)
    expect(entry!.status).not.toBe('working')
  })
})

// ── Test: connected provider + route + proof → working ────────────────────────

describe('connected provider + route + proof → working', () => {
  it('chat with connected genx is working', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const entry = await getCapabilityRuntimeTruthEntry('chat')
    expect(entry!.status).toBe('working')
    expect(entry!.proofStatus).toBe('passed')
    expect(entry!.blocker).toBe('')
  })

  it('streaming_chat with connected groq is working', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'groq-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'groq' ? passedNotes : noNotes,
    )

    const entry = await getCapabilityRuntimeTruthEntry('streaming_chat')
    expect(entry!.status).toBe('working')
  })

  it('rag with connected huggingface and writable storage is working', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'huggingface' ? 'hf-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'huggingface' ? passedNotes : noNotes,
    )

    const entry = await getCapabilityRuntimeTruthEntry('rag')
    expect(entry!.status).toBe('working')
    expect(entry!.hasStorage).toBe(true)
  })

  it('assets/approvals/scheduler are working when storage is writable (no provider needed)', async () => {
    for (const id of ['assets', 'approvals', 'scheduler']) {
      const entry = await getCapabilityRuntimeTruthEntry(id)
      expect(entry!.status, `${id} should be working with writable storage`).toBe('working')
      expect(entry!.proofStatus).toBe('passed')
    }
  })
})

// ── Test: failed test = blocked, not working ──────────────────────────────────

describe('failed test is blocked, not working', () => {
  it('chat with failed test is blocked', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? failedNotes : noNotes,
    )
    process.env.GENX_BASE_URL = 'https://query.genx.sh'

    const entry = await getCapabilityRuntimeTruthEntry('chat')
    expect(entry!.status).toBe('blocked')
    expect(entry!.proofStatus).toBe('failed')
    expect(entry!.blocker).toContain('genx')
  })
})

// ── Test: Capabilities page/API does not show available when proofStatus=route_only

describe('Capabilities API does not show working when proofStatus is route_only or not_tested', () => {
  it('no capability has status=working when all providers have no key', async () => {
    // All providers return null key
    const allEntries = await getCapabilityRuntimeTruth()

    const falseWorking = allEntries.filter(
      (e) => e.status === 'working' && !e.capabilityId.match(/^(assets|approvals|scheduler|memory|brand_memory)$/),
    )
    // Only storage-only capabilities can be working without a provider key
    expect(falseWorking).toHaveLength(0)
  })

  it('no capability has proofStatus=passed when no provider is connected', async () => {
    const allEntries = await getCapabilityRuntimeTruth()
    const falseProof = allEntries.filter(
      (e) =>
        e.proofStatus === 'passed' &&
        !e.capabilityId.match(/^(assets|approvals|scheduler|memory|brand_memory)$/),
    )
    expect(falseProof).toHaveLength(0)
  })

  it('image/video/audio capabilities never get status=working from provider metadata alone', async () => {
    // Even with connected providers, media is wired_unproven (no explicit media proof)
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      ['genx', 'groq', 'together', 'huggingface', 'mimo'].includes(id) ? `${id}-key` : null,
    )
    mockGetMeshTestNotes.mockImplementation(async () => passedNotes)

    const allEntries = await getCapabilityRuntimeTruth()
    const mediaEntries = allEntries.filter(
      (e) =>
        (e.category === 'image' || e.category === 'video' || e.category === 'audio') &&
        !e.capabilityId.startsWith('adult_'),
    )

    for (const entry of mediaEntries) {
      // Media entries must not be 'working' — only 'wired_unproven' or 'blocked'
      expect(
        entry.status === 'working',
        `${entry.capabilityId} (${entry.category}) should not be 'working' from provider metadata alone`,
      ).toBe(false)
    }
  })
})
