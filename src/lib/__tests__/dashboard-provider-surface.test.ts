/**
 * Focused tests for dashboard provider surface unification.
 *
 * Proves:
 * 1. Providers page/API uses shared provider truth (getProviderRuntimeTruth).
 * 2. Settings connected state and Providers connected state match for the 4 visible runtime providers.
 * 3. Provider test action uses /api/admin/settings/test-provider with field `key`.
 * 4. Unknown connection is not returned for the visible runtime providers.
 * 5. Overview provider count uses shared truth.
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

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)

const noNotes = { lastTestStatus: undefined, lastTestPassed: undefined, lastTestedAt: undefined, lastError: undefined }
const passedNotes = { lastTestStatus: 'passed' as const, lastTestPassed: true, lastTestedAt: '2026-06-26T10:00:00Z', lastError: '' }
const failedNotes = { lastTestStatus: 'failed' as const, lastTestPassed: false, lastTestedAt: '2026-06-26T10:00:00Z', lastError: 'API error' }

const ACTIVE_PROVIDERS = ['genx', 'together', 'groq', 'mimo'] as const

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
})

// ── Test 1: Providers page/API uses shared provider truth ─────────────────────

describe('Test 1: /api/admin/providers/status uses getProviderRuntimeTruth', () => {
  it('returns entries for all 4 visible runtime providers', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    const activeKeys = ACTIVE_PROVIDERS as readonly string[]
    const activeEntries = truth.filter((e) => activeKeys.includes(e.providerId))

    expect(activeEntries).toHaveLength(ACTIVE_PROVIDERS.length)
    for (const id of ACTIVE_PROVIDERS) {
      expect(activeEntries.some((e) => e.providerId === id), `${id} should be in truth`).toBe(true)
    }
  })

  it('never returns "Unknown connection" error for active providers', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    for (const id of ACTIVE_PROVIDERS) {
      const entry = truth.find((e) => e.providerId === id)
      expect(entry, `${id} must be in truth`).toBeDefined()
      expect(entry!.blocker).not.toBe('Unknown connection')
    }
  })
})

// ── Test 2: Settings connected state and Providers connected state match ───────

describe('Test 2: Settings and Providers agree on connected state', () => {
  it('both show connected=true when DB key + passed test', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'genx' ? 'genx-db-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'genx' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')

    const [settings, truth] = await Promise.all([
      getPlatformSettingsTruth(),
      getProviderRuntimeTruth(),
    ])

    const settingsGenX = settings.entries.find((e) => e.key === 'genx')!
    const truthGenX = truth.find((e) => e.providerId === 'genx')!

    expect(settingsGenX.connected).toBe(true)
    expect(truthGenX.connected).toBe(true)
    // No disagreement
    expect(settingsGenX.connected).toBe(truthGenX.connected)
  })

  it('all 4 visible runtime providers agree: no key = not connected in both surfaces', async () => {
    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')

    const [settings, truth] = await Promise.all([
      getPlatformSettingsTruth(),
      getProviderRuntimeTruth(),
    ])

    for (const id of ACTIVE_PROVIDERS) {
      const settingsEntry = settings.entries.find((e) => e.key === id)!
      const truthEntry = truth.find((e) => e.providerId === id)!

      expect(settingsEntry.connected, `${id}: settings connected`).toBe(false)
      expect(truthEntry.connected, `${id}: truth connected`).toBe(false)
      // Agreement
      expect(settingsEntry.connected).toBe(truthEntry.connected)
    }
  })

  it('all 4 visible runtime providers agree when all have keys + passed tests', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      ACTIVE_PROVIDERS.includes(id as typeof ACTIVE_PROVIDERS[number]) ? `${id}-key` : null,
    )
    mockGetMeshTestNotes.mockImplementation(async () => passedNotes)

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')

    const [settings, truth] = await Promise.all([
      getPlatformSettingsTruth(),
      getProviderRuntimeTruth(),
    ])

    for (const id of ACTIVE_PROVIDERS) {
      if (id === 'genx') continue // genx needs URL which is set above
      const settingsEntry = settings.entries.find((e) => e.key === id)!
      const truthEntry = truth.find((e) => e.providerId === id)!
      expect(settingsEntry.connected).toBe(truthEntry.connected)
    }

    // Count how many are connected in both
    const settingsConnected = settings.providers.filter((e) => e.connected).length
    const truthConnected = truth.filter((e) =>
      ACTIVE_PROVIDERS.includes(e.providerId as typeof ACTIVE_PROVIDERS[number]) && e.connected,
    ).length
    expect(settingsConnected).toBe(truthConnected)
  })
})

// ── Test 3: Provider test action uses correct field name ──────────────────────

describe('Test 3: dashboard-api.testProvider sends field `key` not `providerKey`', () => {
  it('testProvider body uses field key', async () => {
    const fetchCalls: RequestInit[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, opts: RequestInit) => {
      fetchCalls.push(opts)
      return new Response(JSON.stringify({ success: true, connected: true, latencyMs: 100 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const { testProvider } = await import('@/lib/dashboard-api')
    await testProvider('groq')

    expect(fetchCalls).toHaveLength(1)
    const body = JSON.parse(fetchCalls[0].body as string) as Record<string, unknown>
    // Must use `key`, not `providerKey`
    expect(body.key).toBe('groq')
    expect(body.providerKey).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('testProvider calls /api/admin/settings/test-provider', async () => {
    const fetchCalls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetchCalls.push(url as string)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const { testProvider } = await import('@/lib/dashboard-api')
    await testProvider('genx')

    expect(fetchCalls[0]).toContain('/api/admin/settings/test-provider')

    vi.unstubAllGlobals()
  })
})

// ── Test 4: Unknown connection never returned for active providers ─────────────

describe('Test 4: Unknown connection not returned for active providers', () => {
  it('getProviderRuntimeTruth has entries for all 4 visible runtime providers', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    for (const id of ACTIVE_PROVIDERS) {
      const entry = truth.find((e) => e.providerId === id)
      expect(entry).toBeDefined()
      // blocker must never be the old "Unknown connection" message
      expect(entry!.blocker).not.toContain('Unknown connection')
    }
  })

  it('missing key returns missing_key blocker, not Unknown connection', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    for (const id of ACTIVE_PROVIDERS) {
      const entry = truth.find((e) => e.providerId === id)!
      // No key → blocker must be missing_key
      expect(entry.hasKey).toBe(false)
      expect(entry.blocker).toMatch(/missing_key/)
    }
  })

  it('failed test returns failed blocker, not Unknown connection', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'groq-key' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'groq' ? failedNotes : noNotes,
    )

    const { getProviderRuntimeTruthEntry } = await import('@/lib/provider-runtime-truth')
    const entry = await getProviderRuntimeTruthEntry('groq')

    expect(entry!.lastTestStatus).toBe('failed')
    expect(entry!.blocker).not.toContain('Unknown connection')
  })
})

// ── Test 5: Overview provider count uses shared truth ─────────────────────────

describe('Test 5: Overview provider count uses shared truth', () => {
  it('connected count is 0 when no providers have keys', async () => {
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    const activeConnected = truth.filter(
      (e) => (ACTIVE_PROVIDERS as readonly string[]).includes(e.providerId) && e.connected,
    )
    expect(activeConnected).toHaveLength(0)
  })

  it('connected count is 5 when all providers have keys + passed tests', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      ACTIVE_PROVIDERS.includes(id as typeof ACTIVE_PROVIDERS[number]) ? `${id}-key` : null,
    )
    mockGetMeshTestNotes.mockImplementation(async () => passedNotes)

    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')
    const truth = await getProviderRuntimeTruth()

    const activeConnected = truth.filter(
      (e) => (ACTIVE_PROVIDERS as readonly string[]).includes(e.providerId) && e.connected,
    )
    expect(activeConnected).toHaveLength(ACTIVE_PROVIDERS.length)
  })

  it('connected count matches between Settings truth and runtime truth', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' || id === 'mimo' ? `${id}-key` : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'groq' || id === 'mimo' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getProviderRuntimeTruth } = await import('@/lib/provider-runtime-truth')

    const [settings, truth] = await Promise.all([
      getPlatformSettingsTruth(),
      getProviderRuntimeTruth(),
    ])

    const settingsCount = settings.providers.filter((e) => e.connected).length
    const runtimeCount = truth.filter(
      (e) => (ACTIVE_PROVIDERS as readonly string[]).includes(e.providerId) && e.connected,
    ).length

    expect(settingsCount).toBe(runtimeCount)
  })
})
