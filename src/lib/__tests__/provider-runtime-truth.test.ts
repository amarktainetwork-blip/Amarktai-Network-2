/**
 * Focused tests for provider-runtime-truth.ts
 *
 * Proves the required contracts:
 *  1. DB key → hasKey true
 *  2. Env fallback key → hasKey true
 *  3. No DB/env key → missing_key blocker
 *  4. GenX key uses genx-client default URL when GENX_BASE_URL/GENX_API_URL is absent
 *  5. Failed last test → lastTestStatus 'failed', not 'connected'
 *  6. System Monitoring and Settings consume the same truth
 *  7. MiMo, Groq, Together, GitHub DB key + passed test = connected
 *  8. Local Crawler partial/missing dependency state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Module-level mocks ────────────────────────────────────────────────────────

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

import {
  getProviderRuntimeTruth,
  getProviderRuntimeTruthEntry,
} from '@/lib/provider-runtime-truth'

import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)

const noNotes = {
  lastTestStatus: undefined,
  lastTestPassed: undefined,
  lastTestedAt: undefined,
  lastError: undefined,
}

const passedNotes = {
  lastTestStatus: 'passed' as const,
  lastTestPassed: true,
  lastTestedAt: '2026-06-26T10:00:00.000Z',
  lastError: '',
}

const failedNotes = {
  lastTestStatus: 'failed' as const,
  lastTestPassed: false,
  lastTestedAt: '2026-06-26T10:00:00.000Z',
  lastError: 'Connection refused',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue(noNotes)
  delete process.env.GENX_API_KEY
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
  delete process.env.HUGGINGFACE_API_KEY
  delete process.env.HUGGINGFACEHUB_API_TOKEN
  delete process.env.HF_TOKEN
  delete process.env.MIMO_API_KEY
  delete process.env.XIAOMI_API_KEY
  delete process.env.GROQ_API_KEY
  delete process.env.TOGETHER_API_KEY
  delete process.env.GITHUB_PAT
  delete process.env.GITHUB_TOKEN
})

// ── Test 1: DB key → hasKey true ─────────────────────────────────────────────

describe('Test 1: DB key makes provider show hasKey true', () => {
  it('GenX with DB key has hasKey=true and keySource=db', async () => {
    mockGetMeshCredential.mockResolvedValue('genx-db-key-abc123')
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)
    process.env.GENX_BASE_URL = 'https://query.genx.sh'

    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry).not.toBeNull()
    expect(entry!.hasKey).toBe(true)
    expect(entry!.keySource).toBe('db')
    expect(entry!.connected).toBe(true)
  })

  it('HuggingFace with DB key has hasKey=true and keySource=db', async () => {
    mockGetMeshCredential.mockResolvedValue('hf-db-key-xyz789')
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)

    const entry = await getProviderRuntimeTruthEntry('huggingface')
    expect(entry).not.toBeNull()
    expect(entry!.hasKey).toBe(true)
    expect(entry!.keySource).toBe('db')
    expect(entry!.connected).toBe(true)
  })
})

// ── Test 2: Env fallback key → hasKey true ────────────────────────────────────

describe('Test 2: Env fallback key makes provider show hasKey true', () => {
  it('GenX with GENX_API_KEY env has hasKey=true and keySource=env', async () => {
    process.env.GENX_API_KEY = 'genx-env-key-abc'
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockResolvedValue('genx-env-key-abc')
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)

    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.keySource).toBe('env')
  })

  it('HuggingFace recognises all three env alias names', async () => {
    const aliases = [
      ['HUGGINGFACE_API_KEY', 'hf-key-A'],
      ['HUGGINGFACEHUB_API_TOKEN', 'hf-key-B'],
      ['HF_TOKEN', 'hf-key-C'],
    ] as const

    for (const [envName, val] of aliases) {
      delete process.env.HUGGINGFACE_API_KEY
      delete process.env.HUGGINGFACEHUB_API_TOKEN
      delete process.env.HF_TOKEN
      process.env[envName] = val
      mockGetMeshCredential.mockResolvedValue(val)
      mockGetMeshTestNotes.mockResolvedValue(noNotes)

      const entry = await getProviderRuntimeTruthEntry('huggingface')
      expect(entry!.keySource, `expected env for ${envName}`).toBe('env')
      expect(entry!.hasKey).toBe(true)
    }
  })

  it('MiMo with MIMO_API_KEY env has keySource=env', async () => {
    process.env.MIMO_API_KEY = 'mimo-env-key'
    mockGetMeshCredential.mockResolvedValue('mimo-env-key')
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)

    const entry = await getProviderRuntimeTruthEntry('mimo')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.keySource).toBe('env')
  })

  it('MiMo recognises XIAOMI_API_KEY alias', async () => {
    process.env.XIAOMI_API_KEY = 'xiaomi-env-key'
    mockGetMeshCredential.mockResolvedValue('xiaomi-env-key')
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('mimo')
    expect(entry!.keySource).toBe('env')
    expect(entry!.hasKey).toBe(true)
  })
})

// ── Test 3: No DB/env key → missing_key ──────────────────────────────────────

describe('Test 3: No DB/env key returns missing_key blocker', () => {
  it('GenX with no key has hasKey=false and blocker starting with missing_key', async () => {
    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.keySource).toBe('none')
    expect(entry!.connected).toBe(false)
    expect(entry!.blocker).toMatch(/missing_key/)
    expect(entry!.blocker).toContain('GENX_API_KEY')
  })

  it('HuggingFace with no key has blocker listing all three env names', async () => {
    const entry = await getProviderRuntimeTruthEntry('huggingface')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.blocker).toContain('HUGGINGFACE_API_KEY')
    expect(entry!.blocker).toContain('HUGGINGFACEHUB_API_TOKEN')
    expect(entry!.blocker).toContain('HF_TOKEN')
  })

  it('MiMo with no key reports missing_key with both aliases', async () => {
    const entry = await getProviderRuntimeTruthEntry('mimo')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.blocker).toMatch(/missing_key/)
    expect(entry!.blocker).toContain('MIMO_API_KEY')
    expect(entry!.blocker).toContain('XIAOMI_API_KEY')
  })

  it('Groq with no key reports missing_key: add GROQ_API_KEY', async () => {
    const entry = await getProviderRuntimeTruthEntry('groq')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.blocker).toMatch(/missing_key/)
    expect(entry!.blocker).toContain('GROQ_API_KEY')
  })

  it('Together with no key reports missing_key: add TOGETHER_API_KEY', async () => {
    const entry = await getProviderRuntimeTruthEntry('together')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.blocker).toMatch(/missing_key/)
    expect(entry!.blocker).toContain('TOGETHER_API_KEY')
  })

  it('GitHub with no key reports missing_key: add GITHUB_PAT or GITHUB_TOKEN', async () => {
    const entry = await getProviderRuntimeTruthEntry('github')
    expect(entry!.hasKey).toBe(false)
    expect(entry!.blocker).toMatch(/missing_key/)
    expect(entry!.blocker).toContain('GITHUB_PAT')
    expect(entry!.blocker).toContain('GITHUB_TOKEN')
  })
})

// ── Test 4: Key present but endpoint missing → requires_endpoint ──────────────

describe('Test 4: GenX endpoint truth matches genx-client default URL behavior', () => {
  it('GenX with key but no URL uses the default endpoint instead of requires_endpoint', async () => {
    mockGetMeshCredential.mockResolvedValue('genx-key-xyz')
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.endpointStatus).toBe('ok')
    expect(entry!.blocker).not.toMatch(/requires_endpoint/)
    expect(entry!.blocker).toContain('live test')
  })

  it('GenX with key AND URL has endpointStatus=ok', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockResolvedValue('genx-key-xyz')
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry!.endpointStatus).toBe('ok')
  })

  it('HuggingFace does not require a separate endpoint', async () => {
    mockGetMeshCredential.mockResolvedValue('hf-key-xyz')
    const entry = await getProviderRuntimeTruthEntry('huggingface')
    expect(entry!.endpointStatus).toBe('not_required')
  })

  it('Groq does not require a separate endpoint', async () => {
    mockGetMeshCredential.mockResolvedValue('groq-key-xyz')
    const entry = await getProviderRuntimeTruthEntry('groq')
    expect(entry!.endpointStatus).toBe('not_required')
  })
})

// ── Test 5: Failed last test → shown as failed, not connected ─────────────────

describe('Test 5: Failed last test is shown as failed, not connected', () => {
  it('GenX with key and failed test shows connected=false', async () => {
    process.env.GENX_BASE_URL = 'https://query.genx.sh'
    mockGetMeshCredential.mockResolvedValue('genx-key-abc')
    mockGetMeshTestNotes.mockResolvedValue(failedNotes)

    const entry = await getProviderRuntimeTruthEntry('genx')
    expect(entry!.lastTestStatus).toBe('failed')
    expect(entry!.connected).toBe(false)
    expect(entry!.blocker).toBe('Connection refused')
  })

  it('Groq with key and failed test shows connected=false', async () => {
    mockGetMeshCredential.mockResolvedValue('groq-key')
    mockGetMeshTestNotes.mockResolvedValue(failedNotes)

    const entry = await getProviderRuntimeTruthEntry('groq')
    expect(entry!.lastTestStatus).toBe('failed')
    expect(entry!.connected).toBe(false)
  })
})

// ── Test 7: MiMo/Groq/Together/GitHub DB key + passed test = connected ─────────

describe('Test 7: MiMo/Groq/Together/GitHub DB key + passed test = connected', () => {
  const providers = [
    { id: 'mimo' as const, key: 'mimo-db-key' },
    { id: 'groq' as const, key: 'groq-db-key' },
    { id: 'together' as const, key: 'together-db-key' },
    { id: 'github' as const, key: 'github-db-key' },
  ]

  for (const { id, key } of providers) {
    it(`${id}: DB key + passed test → connected=true, keySource=db`, async () => {
      mockGetMeshCredential.mockResolvedValue(key)
      mockGetMeshTestNotes.mockResolvedValue(passedNotes)

      const entry = await getProviderRuntimeTruthEntry(id)
      expect(entry).not.toBeNull()
      expect(entry!.hasKey).toBe(true)
      expect(entry!.keySource).toBe('db')
      expect(entry!.connected).toBe(true)
      expect(entry!.lastTestStatus).toBe('passed')
      expect(entry!.blocker).toBe('')
    })

    it(`${id}: missing key → connected=false, missing_key blocker`, async () => {
      mockGetMeshCredential.mockResolvedValue(null)

      const entry = await getProviderRuntimeTruthEntry(id)
      expect(entry!.hasKey).toBe(false)
      expect(entry!.connected).toBe(false)
      expect(entry!.blocker).toMatch(/missing_key/)
    })

    it(`${id}: failed test → connected=false, lastTestStatus=failed`, async () => {
      mockGetMeshCredential.mockResolvedValue(key)
      mockGetMeshTestNotes.mockResolvedValue(failedNotes)

      const entry = await getProviderRuntimeTruthEntry(id)
      expect(entry!.connected).toBe(false)
      expect(entry!.lastTestStatus).toBe('failed')
    })
  }
})

// ── Test 8: Local Crawler partial/missing dependency state ────────────────────

describe('Test 8: Local Crawler partial/missing dependency state', () => {
  it('local-crawler has hasKey=true (no API key required)', async () => {
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('local-crawler')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.keySource).toBe('env')
  })

  it('local-crawler with no test run shows not_tested, not connected', async () => {
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('local-crawler')
    expect(entry!.connected).toBe(false)
    expect(entry!.lastTestStatus).toBe('not_tested')
  })

  it('local-crawler with passed test shows connected=true', async () => {
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)

    const entry = await getProviderRuntimeTruthEntry('local-crawler')
    expect(entry!.connected).toBe(true)
    expect(entry!.lastTestStatus).toBe('passed')
  })

  it('local-crawler failed with missing scrapy/trafilatura shows install_missing_python_packages blocker', async () => {
    mockGetMeshTestNotes.mockResolvedValue({
      lastTestStatus: 'failed',
      lastTestPassed: false,
      lastTestedAt: '2026-06-26T10:00:00.000Z',
      lastError: 'Scrapy not available',
      detail: 'Playwright available · scrapy: No module named scrapy error · trafilatura: No module named trafilatura error',
    })

    const entry = await getProviderRuntimeTruthEntry('local-crawler')
    expect(entry!.connected).toBe(false)
    expect(entry!.blocker).toMatch(/install_missing_python_packages/)
    expect(entry!.blocker).toContain('scrapy')
    expect(entry!.blocker).toContain('trafilatura')
    // Must NOT contain full tracebacks
    expect(entry!.blocker.length).toBeLessThan(200)
  })

  it('scrapy not_tested has hasKey=true (no API key needed)', async () => {
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('scrapy')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.connected).toBe(false)
    expect(entry!.lastTestStatus).toBe('not_tested')
  })

  it('trafilatura not_tested has hasKey=true', async () => {
    mockGetMeshTestNotes.mockResolvedValue(noNotes)

    const entry = await getProviderRuntimeTruthEntry('trafilatura')
    expect(entry!.hasKey).toBe(true)
    expect(entry!.connected).toBe(false)
  })

  it('local-crawler failed blocker is short (no full stack traces)', async () => {
    const longTrace = `Traceback (most recent call last):\n  File "/usr/lib/python3.11/site.py", line 1\nModuleNotFoundError: No module named 'scrapy'\n`.repeat(5)
    mockGetMeshTestNotes.mockResolvedValue({
      lastTestStatus: 'failed',
      lastTestPassed: false,
      lastTestedAt: '2026-06-26T10:00:00.000Z',
      lastError: longTrace,
      detail: `Playwright available · ${longTrace} · trafilatura: No module named trafilatura error`,
    })

    const entry = await getProviderRuntimeTruthEntry('local-crawler')
    expect(entry!.blocker.length).toBeLessThan(200)
    // Must not contain traceback header lines
    expect(entry!.blocker).not.toContain('Traceback (most recent call last)')
    expect(entry!.blocker).not.toContain('File "/usr')
  })
})

// ── Test 6: Settings and System Monitoring consume the same truth ─────────────

describe('Test 6: Settings and System Monitoring consume the same provider truth', () => {
  it('getProviderRuntimeTruth never exposes actual key values', async () => {
    const secretKey = 'super-secret-key-should-not-appear'
    mockGetMeshCredential.mockResolvedValue(secretKey)
    mockGetMeshTestNotes.mockResolvedValue(passedNotes)

    const allEntries = await getProviderRuntimeTruth()
    const json = JSON.stringify(allEntries)
    expect(json).not.toContain(secretKey)
  })

  it('A provider missing its key shows the same blocker in both truth consumers', async () => {
    const allEntries = await getProviderRuntimeTruth()
    const hfEntry = allEntries.find((e) => e.providerId === 'huggingface')
    const genxEntry = allEntries.find((e) => e.providerId === 'genx')

    expect(hfEntry!.hasKey).toBe(false)
    expect(genxEntry!.hasKey).toBe(false)
    expect(hfEntry!.blocker).toContain('HUGGINGFACE_API_KEY')
    expect(genxEntry!.blocker).toContain('GENX_API_KEY')
  })

  it('MiMo DB key + passed test: Settings entry shows Connected, Runtime entry shows configured_wired', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'mimo' ? 'mimo-db-key-live' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'mimo' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')

    const [settings, runtime] = await Promise.all([
      getPlatformSettingsTruth(),
      getRuntimeProviderStatus(),
    ])

    const settingsMimo = settings.entries.find((e) => e.key === 'mimo')!
    const runtimeMimo = runtime.find((p) => p.key === 'mimo')!

    expect(settingsMimo.connected).toBe(true)
    expect(settingsMimo.status).toBe('Connected')
    expect(runtimeMimo.connected).toBe(true)
    expect(runtimeMimo.status).toBe('configured_wired')
  })

  it('Groq DB key + passed test: both consumers show connected', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'groq-db-key-live' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'groq' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')

    const [settings, runtime] = await Promise.all([
      getPlatformSettingsTruth(),
      getRuntimeProviderStatus(),
    ])

    const sGroq = settings.entries.find((e) => e.key === 'groq')!
    const rGroq = runtime.find((p) => p.key === 'groq')!

    expect(sGroq.connected).toBe(true)
    expect(rGroq.connected).toBe(true)
    expect(rGroq.status).toBe('configured_wired')
  })

  it('Together DB key + passed test: both consumers show connected', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'together' ? 'together-db-key-live' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'together' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')

    const [settings, runtime] = await Promise.all([
      getPlatformSettingsTruth(),
      getRuntimeProviderStatus(),
    ])

    const sTogether = settings.entries.find((e) => e.key === 'together')!
    const rTogether = runtime.find((p) => p.key === 'together')!

    expect(sTogether.connected).toBe(true)
    expect(rTogether.connected).toBe(true)
  })

  it('GitHub DB key + passed test: both consumers show connected', async () => {
    mockGetMeshCredential.mockImplementation(async (id: string) =>
      id === 'github' ? 'github-db-key-live' : null,
    )
    mockGetMeshTestNotes.mockImplementation(async (id: string) =>
      id === 'github' ? passedNotes : noNotes,
    )

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')

    const [settings, runtime] = await Promise.all([
      getPlatformSettingsTruth(),
      getRuntimeProviderStatus(),
    ])

    const sGitHub = settings.entries.find((e) => e.key === 'github')!
    const rGitHub = runtime.find((p) => p.key === 'github')!

    expect(sGitHub.connected).toBe(true)
    expect(rGitHub.connected).toBe(true)
  })
})
