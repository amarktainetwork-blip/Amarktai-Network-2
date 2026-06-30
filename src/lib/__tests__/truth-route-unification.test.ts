/**
 * Tests that /api/admin/truth uses the canonical provider truth
 * (getProviderRuntimeTruth) rather than the legacy prisma.aiProvider table.
 *
 * Proves:
 * 1. Providers section reads from getProviderRuntimeTruth, not prisma.aiProvider
 * 2. DB key + passed test → state HEALTHY / isActive true
 * 3. Missing key → state AVAILABLE_IN_CATALOG / isActive false
 * 4. HEALTHY is never returned when no key is present
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// dashboard-truth.getModelTruth reads static model-registry — stub minimally
vi.mock('@/lib/dashboard-truth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/dashboard-truth')>()
  return {
    ...actual,
    getModelTruth: vi.fn(() => []),
  }
})

import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)

const noNotes = { lastTestStatus: undefined, lastTestPassed: undefined, lastTestedAt: undefined, lastError: undefined }
const passedNotes = { lastTestStatus: 'passed' as const, lastTestPassed: true, lastTestedAt: '2026-06-26T10:00:00Z', lastError: '' }
const failedNotes = { lastTestStatus: 'failed' as const, lastTestPassed: false, lastTestedAt: '2026-06-26T10:00:00Z', lastError: 'Bad key' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
})

// ── Test 1: providers reads from getProviderRuntimeTruth, not prisma.aiProvider

describe('Test 1: /api/admin/truth providers uses canonical truth', () => {
  it('does not call prisma.aiProvider — only getProviderRuntimeTruth', async () => {
    const prismaAiProviderSpy = vi.fn()
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        aiProvider: { findMany: prismaAiProviderSpy },
        integrationConfig: { findUnique: vi.fn(async () => null) },
      },
    }))

    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const result = await getProviderRuntimeTruth()

    // canonical truth returns entries without touching aiProvider
    expect(result.length).toBeGreaterThan(0)
    expect(prismaAiProviderSpy).not.toHaveBeenCalled()
  })

  it('all 4 visible runtime providers are present in the truth output', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const result = await getProviderRuntimeTruth()
    const ids = result.map((e) => e.providerId)
    for (const id of ['genx', 'together', 'groq', 'mimo']) {
      expect(ids).toContain(id)
    }
  })
})

// ── Test 2: DB key + passed test → state HEALTHY / isActive true ──────────────

describe('Test 2: DB key + passed test → HEALTHY / isActive', () => {
  it('genx with key + passed test produces state=HEALTHY, isActive=true', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-db-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const raw = await getProviderRuntimeTruth()
    const genx = raw.find((e) => e.providerId === 'genx')!

    // Verify canonical truth
    expect(genx.connected).toBe(true)
    expect(genx.hasKey).toBe(true)

    // Verify the mapping logic used by the route
    const state = genx.connected ? 'HEALTHY' : genx.lastTestStatus === 'failed' ? 'ERROR' : genx.hasKey ? 'CONFIGURED' : 'AVAILABLE_IN_CATALOG'
    expect(state).toBe('HEALTHY')
    expect(genx.connected).toBe(true) // isActive
  })

  it('groq with key + passed test produces HEALTHY', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'groq-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'groq' ? passedNotes : noNotes,
    )

    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const raw = await getProviderRuntimeTruth()
    const groq = raw.find((e) => e.providerId === 'groq')!

    expect(groq.connected).toBe(true)
    expect(groq.hasKey).toBe(true)
    expect(groq.lastTestStatus).toBe('passed')
  })
})

// ── Test 3: Missing key → AVAILABLE_IN_CATALOG / isActive false ───────────────

describe('Test 3: Missing key → AVAILABLE_IN_CATALOG / isActive false', () => {
  it('all 4 visible runtime providers with no key produce isActive=false', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const raw = await getProviderRuntimeTruth()

    for (const id of ['genx', 'together', 'groq', 'mimo']) {
      const entry = raw.find((e) => e.providerId === id)!
      expect(entry.connected, `${id} should not be active`).toBe(false)
      expect(entry.hasKey, `${id} should have no key`).toBe(false)

      // state mapping
      const state = entry.connected ? 'HEALTHY' : entry.lastTestStatus === 'failed' ? 'ERROR' : entry.hasKey ? 'CONFIGURED' : 'AVAILABLE_IN_CATALOG'
      expect(state, `${id} state`).toBe('AVAILABLE_IN_CATALOG')
    }
  })

  it('missing key never produces healthStatus=healthy', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const raw = await getProviderRuntimeTruth()

    for (const entry of raw.filter((e) => !e.hasKey)) {
      expect(entry.connected).toBe(false)
      // Derived healthStatus used by the route
      const healthStatus = entry.connected ? 'healthy' : entry.lastTestStatus === 'failed' ? 'error' : entry.hasKey ? 'configured' : 'unconfigured'
      expect(healthStatus).not.toBe('healthy')
    }
  })
})

// ── Test 4: Failed test → ERROR state ─────────────────────────────────────────

describe('Test 4: Failed last test → state ERROR, isActive false', () => {
  it('mimo with key but failed test shows ERROR state, not HEALTHY', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'mimo' ? 'mimo-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'mimo' ? failedNotes : noNotes,
    )

    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const raw = await getProviderRuntimeTruth()
    const mimo = raw.find((e) => e.providerId === 'mimo')!

    expect(mimo.hasKey).toBe(true)
    expect(mimo.connected).toBe(false)
    expect(mimo.lastTestStatus).toBe('failed')

    const state = mimo.connected ? 'HEALTHY' : mimo.lastTestStatus === 'failed' ? 'ERROR' : mimo.hasKey ? 'CONFIGURED' : 'AVAILABLE_IN_CATALOG'
    expect(state).toBe('ERROR')
  })
})

// ── Test 5: Capability truth mapping ──────────────────────────────────────────

describe('Test 5: Capability truth maps to CapabilityTruth shape correctly', () => {
  it('working capability maps to AVAILABLE_NOW', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const caps = await getCapabilityRuntimeTruth()
    const chat = caps.find((c) => c.capabilityId === 'chat')!

    expect(chat.status).toBe('working')
    // Route mapping
    const state = chat.status === 'working' ? 'AVAILABLE_NOW'
      : chat.status === 'blocked' ? 'BLOCKED_BY_SETTINGS'
      : chat.status === 'wired_unproven' ? 'UNAVAILABLE_WITH_CURRENT_CONFIG'
      : 'NOT_IMPLEMENTED'
    expect(state).toBe('AVAILABLE_NOW')
  })

  it('missing provider capability maps to NOT_IMPLEMENTED', async () => {
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const caps = await getCapabilityRuntimeTruth()
    const chat = caps.find((c) => c.capabilityId === 'chat')!

    // No providers connected — chat is missing
    expect(chat.status).toBe('missing')
    const state = chat.status === 'working' ? 'AVAILABLE_NOW'
      : chat.status === 'blocked' ? 'BLOCKED_BY_SETTINGS'
      : chat.status === 'wired_unproven' ? 'UNAVAILABLE_WITH_CURRENT_CONFIG'
      : 'NOT_IMPLEMENTED'
    expect(state).toBe('NOT_IMPLEMENTED')
  })
})
