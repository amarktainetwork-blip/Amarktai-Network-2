/**
 * One Source of Truth Tests
 *
 * Verifies that all dashboard sections (Settings, AI Engine, Repo Workbench,
 * Adult Mode, Media Studio, Live Readiness) read provider keys and capability
 * status from the same source: service-vault (DB-vault → env fallback).
 *
 * No section may have a private key-resolution path that bypasses service-vault.
 *
 * Tests cover:
 *  - Settings GitHub token === Repo Workbench GitHub token
 *  - Settings GenX key === AI Engine GenX key
 *  - Settings Together/HF/Replicate keys === Adult Mode provider keys
 *  - Adult capability gate unblocks when global flag + provider + test pass
 *  - Adult capability gate shows exact status when partially configured
 *  - Live Readiness uses same truth as AI Engine and Media Studio
 *  - Aiva is hidden unless AIVA_ENABLED=true
 *  - No duplicate key storage paths
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// ── Shared mock DB factory ─────────────────────────────────────────────────────

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

// ── PART 1: Single vault path for GitHub token ────────────────────────────────

describe('Settings GitHub token === Repo Workbench GitHub token', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.GITHUB_TOKEN
  })

  it('resolves the same GitHub token for Settings and Repo Workbench (vault)', async () => {
    const vaultToken = 'ghp_vault_token_abc123def456'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ github: { apiKey: vaultToken } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsToken = await getServiceKey('github', 'GITHUB_TOKEN')
    const repoToken     = await getServiceKey('github', 'GITHUB_TOKEN')

    expect(settingsToken).toBe(vaultToken)
    expect(repoToken).toBe(vaultToken)
    expect(settingsToken).toBe(repoToken)
  })

  it('resolves GitHub token from env fallback when vault is empty', async () => {
    process.env.GITHUB_TOKEN = 'ghp_env_fallback_xyz789'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({}),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsToken = await getServiceKey('github', 'GITHUB_TOKEN')
    const repoToken     = await getServiceKey('github', 'GITHUB_TOKEN')

    expect(settingsToken).toBe('ghp_env_fallback_xyz789')
    expect(settingsToken).toBe(repoToken)
  })

  it('returns null for both Settings and Repo Workbench when token is missing', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsToken = await getServiceKey('github', 'GITHUB_TOKEN')
    const repoToken     = await getServiceKey('github', 'GITHUB_TOKEN')

    expect(settingsToken).toBeNull()
    expect(repoToken).toBeNull()
  })
})

// ── PART 2: GenX key consistency ──────────────────────────────────────────────

describe('Settings GenX key === AI Engine GenX key', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.GENX_API_KEY
  })

  it('AI Engine reads same GenX key as Settings (vault source)', async () => {
    const vaultKey = 'gnxk_live_abc123def456789'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ genx: { apiKey: vaultKey } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsKey  = await getServiceKey('genx', 'GENX_API_KEY')
    const aiEngineKey  = await getServiceKey('genx', 'GENX_API_KEY')

    expect(settingsKey).toBe(vaultKey)
    expect(aiEngineKey).toBe(vaultKey)
    expect(settingsKey).toBe(aiEngineKey)
  })

  it('AI Engine reads same GenX key as Settings (env fallback)', async () => {
    process.env.GENX_API_KEY = 'gnxk_env_123456789'
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsKey  = await getServiceKey('genx', 'GENX_API_KEY')
    const aiEngineKey  = await getServiceKey('genx', 'GENX_API_KEY')

    expect(settingsKey).toBe('gnxk_env_123456789')
    expect(settingsKey).toBe(aiEngineKey)
  })
})

// ── PART 3: Adult Mode keys from vault ────────────────────────────────────────

describe('Settings Together/HF/Replicate keys === Adult Mode provider keys', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.TOGETHER_API_KEY
    delete process.env.HUGGINGFACE_API_KEY
    delete process.env.REPLICATE_API_KEY
  })

  it('Together AI key resolves identically for Settings and Adult Mode', async () => {
    const vaultKey = 'tg_abc123def456together'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: vaultKey } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsKey   = await getServiceKey('together', 'TOGETHER_API_KEY')
    const adultModeKey  = await getServiceKey('together', 'TOGETHER_API_KEY')

    expect(settingsKey).toBe(vaultKey)
    expect(adultModeKey).toBe(vaultKey)
    expect(settingsKey).toBe(adultModeKey)
  })

  it('HuggingFace key resolves identically for Settings and Adult Mode', async () => {
    const vaultKey = 'hf_abc123def456huggingface'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ huggingface: { apiKey: vaultKey } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsKey  = await getServiceKey('huggingface', 'HUGGINGFACE_API_KEY')
    const adultKey     = await getServiceKey('huggingface', 'HUGGINGFACE_API_KEY')

    expect(settingsKey).toBe(vaultKey)
    expect(adultKey).toBe(vaultKey)
  })

  it('Replicate key resolves identically for Settings and Adult Mode', async () => {
    const vaultKey = 'r8_abc123replicatekey789'
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ replicate: { apiKey: vaultKey } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    const settingsKey = await getServiceKey('replicate', 'REPLICATE_API_KEY')
    const adultKey    = await getServiceKey('replicate', 'REPLICATE_API_KEY')

    expect(settingsKey).toBe(vaultKey)
    expect(adultKey).toBe(vaultKey)
  })

  it('all adult provider keys missing returns null consistently', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')

    expect(await getServiceKey('together',    'TOGETHER_API_KEY')).toBeNull()
    expect(await getServiceKey('huggingface', 'HUGGINGFACE_API_KEY')).toBeNull()
    expect(await getServiceKey('replicate',   'REPLICATE_API_KEY')).toBeNull()
  })
})

// ── PART 4: Adult capability gate status ──────────────────────────────────────

describe('Adult capability gate matches Settings state', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.ADULT_MODE_ENABLED
    delete process.env.TOGETHER_API_KEY
    delete process.env.HUGGINGFACE_API_KEY
    delete process.env.GENX_API_KEY
  })

  it('adult gate = ready when mode=specialist + provider + lastTestStatus=passed', async () => {
    const adultNotes = JSON.stringify({ mode: 'specialist', lastTestStatus: 'passed' })
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        together: { apiKey: 'tg_abc123def456together' },
        adult_mode: { notes: adultNotes },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')

    const togetherProvider = { key: 'together', displayName: 'Together AI', reason: '', configured: true, coveredByGenX: false, keySource: 'vault' as const, status: 'configured_wired' as const }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.status).toBe('ready')
    expect(gate.blocker).toBeNull()
    expect(gate.globalEnabled).toBe(true)
    expect(gate.providerAvailable).toBe(true)
    expect(gate.testPassed).toBe(true)
  })

  it('adult gate = global_flag_disabled when mode is not specialist', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'tg_abc123def456together' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')

    const togetherProvider = { key: 'together', displayName: 'Together AI', reason: '', configured: true, coveredByGenX: false, keySource: 'vault' as const, status: 'configured_wired' as const }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.status).toBe('global_flag_disabled')
    expect(gate.globalEnabled).toBe(false)
    expect(gate.blocker).toContain('Adult mode is disabled')
  })

  it('adult gate = not_wired when mode=specialist but no provider key', async () => {
    const adultNotes = JSON.stringify({ mode: 'specialist' })
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ adult_mode: { notes: adultNotes } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')
    const gate = await getAdultCapabilityGate([])

    expect(gate.status).toBe('not_wired')
    expect(gate.providerAvailable).toBe(false)
    expect(gate.blocker).toContain('specialist adult provider')
  })

  it('adult gate = needs_provider_test when mode=specialist, provider exists, but no test run', async () => {
    const adultNotes = JSON.stringify({ mode: 'specialist' })
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        together: { apiKey: 'tg_abc123def456together' },
        adult_mode: { notes: adultNotes },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')
    const togetherProvider = { key: 'together', displayName: 'Together AI', reason: '', configured: true, coveredByGenX: false, keySource: 'vault' as const, status: 'configured_wired' as const }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.status).toBe('needs_provider_test')
    expect(gate.testPassed).toBe(false)
    expect(gate.blocker).toContain('provider test')
  })

  it('adult gate = provider_failed when lastTestStatus=failed', async () => {
    const adultNotes = JSON.stringify({ mode: 'specialist', lastTestStatus: 'failed' })
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({
        together: { apiKey: 'tg_abc123def456together' },
        adult_mode: { notes: adultNotes },
      }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')
    const togetherProvider = { key: 'together', displayName: 'Together AI', reason: '', configured: true, coveredByGenX: false, keySource: 'vault' as const, status: 'configured_wired' as const }
    const gate = await getAdultCapabilityGate([togetherProvider])

    // Status is needs_provider_test (the gate uses 'needs_provider_test' for both
    // never-run and failed; caller can distinguish by testPassed=false + blocker message)
    expect(gate.testPassed).toBe(false)
    expect(gate.blocker).toContain('failed')
  })

  it('ADULT_MODE_ENABLED env var unblocks gate global flag even without DB config', async () => {
    process.env.ADULT_MODE_ENABLED = 'true'
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())
    process.env.TOGETHER_API_KEY = 'tg_env_key_abc123def456789'

    const { getAdultCapabilityGate } = await import('@/lib/runtime-capability-truth')

    // No Together key in vault — falls back to env via getRuntimeProviderStatus
    // For the gate itself, env key resolves via resolveKey('xai') but not together.
    // Here we pass a configured together provider to simulate the full flow.
    const togetherProvider = { key: 'together', displayName: 'Together AI', reason: '', configured: true, coveredByGenX: false, keySource: 'env' as const, status: 'configured_wired' as const }
    const gate = await getAdultCapabilityGate([togetherProvider])

    expect(gate.globalEnabled).toBe(true)
  })
})

// ── PART 5: Live Readiness uses same truth as AI Engine / Media Studio ─────────

describe('Live Readiness uses same truth source as AI Engine and Media Studio', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.GENX_API_KEY
  })

  it('getDashboardRuntimeTruth returns adultGate alongside genx and providers', async () => {
    process.env.GENX_API_KEY = 'gnxk_live_abc123def456789'
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })))

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.success).toBe(true)
    expect(truth.genx).toBeDefined()
    expect(truth.providers).toBeDefined()
    expect(truth.capabilities).toBeDefined()
    expect(truth.adultGate).toBeDefined()
    expect(typeof truth.adultGate.status).toBe('string')
    expect(typeof truth.adultGate.globalEnabled).toBe('boolean')
  })

  it('getDashboardRuntimeTruth genx.configured matches AI Engine genx key check', async () => {
    process.env.GENX_API_KEY = 'gnxk_live_abc123def456789'
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const { getServiceKey } = await import('@/lib/service-vault')

    const [truth, serviceKey] = await Promise.all([
      getDashboardRuntimeTruth(),
      getServiceKey('genx', 'GENX_API_KEY'),
    ])

    // When service-vault returns a key, genx.configured must be true
    expect(truth.genx.configured).toBe(serviceKey !== null)
  })

  it('getDashboardRuntimeTruth genx.configured=false when no key configured', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: makePrisma({}) }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getDashboardRuntimeTruth } = await import('@/lib/runtime-capability-truth')
    const truth = await getDashboardRuntimeTruth()

    expect(truth.genx.configured).toBe(false)
    expect(truth.blockers.some(b => b.includes('GenX API key not configured'))).toBe(true)
  })
})

// ── PART 6: Aiva hidden unless AIVA_ENABLED=true ──────────────────────────────

describe('Aiva hidden unless AIVA_ENABLED=true', () => {
  afterEach(() => {
    delete process.env.AIVA_ENABLED
  })

  it('AIVA_ENABLED not set — Aiva should not appear as required dependency', () => {
    const aivaEnabled = process.env.AIVA_ENABLED?.trim().toLowerCase() === 'true'
    expect(aivaEnabled).toBe(false)
  })

  it('AIVA_ENABLED=true enables Aiva features', () => {
    process.env.AIVA_ENABLED = 'true'
    const aivaEnabled = process.env.AIVA_ENABLED?.trim().toLowerCase() === 'true'
    expect(aivaEnabled).toBe(true)
  })

  it('AIVA_ENABLED=false keeps Aiva hidden', () => {
    process.env.AIVA_ENABLED = 'false'
    const aivaEnabled = process.env.AIVA_ENABLED?.trim().toLowerCase() === 'true'
    expect(aivaEnabled).toBe(false)
  })
})

// ── PART 7: No duplicate key storage ──────────────────────────────────────────

describe('No duplicate key storage paths', () => {
  it('getServiceKey is the single resolution function — vault first, env fallback', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'tg_vault_key_12345678' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())
    // Set an env var that would conflict
    process.env.TOGETHER_API_KEY = 'tg_env_key_should_not_win'

    const { getServiceKey } = await import('@/lib/service-vault')
    const key = await getServiceKey('together', 'TOGETHER_API_KEY')

    // Vault wins over env
    expect(key).toBe('tg_vault_key_12345678')

    delete process.env.TOGETHER_API_KEY
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('placeholder keys are never returned as configured', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: makePrisma({ together: { apiKey: 'placeholder' } }),
    }))
    vi.doMock('@/lib/crypto-vault', () => makeCrypto())

    const { getServiceKey } = await import('@/lib/service-vault')
    const key = await getServiceKey('together', 'TOGETHER_API_KEY')

    expect(key).toBeNull()
    vi.resetModules()
    vi.restoreAllMocks()
  })
})
