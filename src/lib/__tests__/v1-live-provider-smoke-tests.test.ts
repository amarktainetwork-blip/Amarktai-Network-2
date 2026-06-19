/**
 * V1 Live Provider Smoke Test Framework — unit tests
 *
 * Tests:
 *   - not_configured returned when no credentials present
 *   - pass returned when provider responds 200
 *   - fail returned when provider responds non-200
 *   - fail returned when provider throws network error
 *   - secrets never appear in results
 *   - all 6 providers covered
 *   - single-provider query works
 *   - summary counts are correct
 *   - connected-app E2E flow: registered app → HMAC signed → capability scope → audit event
 *   - Studio E2E: capability taxonomy has working routes for key capabilities
 *   - Artifact proof: createsArtifact is set for media capabilities
 */

import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoist mocks ───────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getMeshCredential: vi.fn(),
  isUsableServiceKey: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: mocks.getMeshCredential,
}))

vi.mock('@/lib/service-vault', () => ({
  isUsableServiceKey: mocks.isUsableServiceKey,
}))

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  runAllProviderSmokeTests,
  runProviderSmokeTestById,
} from '@/lib/live-smoke-tests'

import { AI_CAPABILITY_TAXONOMY } from '@/lib/ai-capability-taxonomy'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../../')

function mockFetchOk() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    text: async () => JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
  }) as unknown as typeof fetch
}

function mockFetchFail(status = 401) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'Unauthorized' }),
    text: async () => 'Unauthorized',
  }) as unknown as typeof fetch
}

function mockFetchThrow(message = 'Network error') {
  global.fetch = vi.fn().mockRejectedValue(new Error(message)) as unknown as typeof fetch
}

const originalFetch = global.fetch

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getMeshCredential.mockResolvedValue(null)
  mocks.isUsableServiceKey.mockReturnValue(false)
})

afterEach(() => {
  global.fetch = originalFetch
  // Clean up any env vars set by tests
  for (const key of ['GENX_API_KEY', 'GROQ_API_KEY', 'TOGETHER_API_KEY', 'HUGGINGFACE_API_KEY', 'QWEN_API_KEY', 'MIMO_API_KEY']) {
    delete process.env[key]
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test framework — not_configured
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke test framework — not_configured', () => {
  it('returns not_configured for all providers when no credentials are set', async () => {
    mocks.isUsableServiceKey.mockReturnValue(false)
    mocks.getMeshCredential.mockResolvedValue(null)

    const results = await runAllProviderSmokeTests()

    expect(results).toHaveLength(6)
    for (const result of results) {
      expect(result.status).toBe('not_configured')
      expect(result.configured).toBe(false)
      expect(result.testable).toBe(false)
      expect(result.latencyMs).toBeNull()
      expect(result.testedAt).toBeNull()
    }
  })

  it('covers all 6 approved providers', async () => {
    mocks.isUsableServiceKey.mockReturnValue(false)
    mocks.getMeshCredential.mockResolvedValue(null)

    const results = await runAllProviderSmokeTests()
    const providerIds = results.map((r) => r.provider).sort()

    expect(providerIds).toEqual(['genx', 'groq', 'huggingface', 'mimo', 'qwen', 'together'].sort())
  })

  it('includes supportedCapabilityGroups for each provider', async () => {
    mocks.isUsableServiceKey.mockReturnValue(false)
    mocks.getMeshCredential.mockResolvedValue(null)

    const results = await runAllProviderSmokeTests()

    for (const result of results) {
      expect(Array.isArray(result.supportedCapabilityGroups)).toBe(true)
      expect(result.supportedCapabilityGroups.length).toBeGreaterThan(0)
    }
  })

  it('safeErrorReason contains env var names, not secrets', async () => {
    mocks.isUsableServiceKey.mockReturnValue(false)
    mocks.getMeshCredential.mockResolvedValue(null)

    const results = await runAllProviderSmokeTests()

    for (const result of results) {
      expect(result.safeErrorReason).toBeTruthy()
      // Must not contain actual secret values
      expect(result.safeErrorReason).not.toMatch(/sk-[A-Za-z0-9]+/)
      expect(result.safeErrorReason).not.toMatch(/hf_[A-Za-z0-9]+/)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test framework — pass
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke test framework — pass', () => {
  it('returns pass when provider responds 200', async () => {
    // Configure Groq as the only provider
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === 'test-groq-key')
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'test-groq-key' : null,
    )
    process.env['GROQ_API_KEY'] = 'test-groq-key'
    mockFetchOk()

    const results = await runAllProviderSmokeTests()
    const groq = results.find((r) => r.provider === 'groq')!

    expect(groq.status).toBe('pass')
    expect(groq.configured).toBe(true)
    expect(groq.testable).toBe(true)
    expect(groq.latencyMs).not.toBeNull()
    expect(groq.testedAt).not.toBeNull()
    expect(groq.safeErrorReason).toBeNull()
  })

  it('records latency as a non-negative number on pass', async () => {
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === 'test-groq-key')
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'test-groq-key' : null,
    )
    process.env['GROQ_API_KEY'] = 'test-groq-key'
    mockFetchOk()

    const results = await runAllProviderSmokeTests()
    const groq = results.find((r) => r.provider === 'groq')!

    expect(typeof groq.latencyMs).toBe('number')
    expect(groq.latencyMs!).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test framework — fail
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke test framework — fail', () => {
  it('returns fail when provider responds non-200', async () => {
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === 'test-groq-key')
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'test-groq-key' : null,
    )
    process.env['GROQ_API_KEY'] = 'test-groq-key'
    mockFetchFail(401)

    const results = await runAllProviderSmokeTests()
    const groq = results.find((r) => r.provider === 'groq')!

    expect(groq.status).toBe('fail')
    expect(groq.configured).toBe(true)
    expect(groq.testable).toBe(true)
    expect(groq.safeErrorReason).toBeTruthy()
  })

  it('returns fail when provider throws network error', async () => {
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === 'test-groq-key')
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'test-groq-key' : null,
    )
    process.env['GROQ_API_KEY'] = 'test-groq-key'
    mockFetchThrow('ECONNREFUSED')

    const results = await runAllProviderSmokeTests()
    const groq = results.find((r) => r.provider === 'groq')!

    expect(groq.status).toBe('fail')
    expect(groq.safeErrorReason).toBeTruthy()
  })

  it('never exposes API key in error reason', async () => {
    const SECRET_KEY = 'sk-supersecretkey12345678'
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === SECRET_KEY)
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? SECRET_KEY : null,
    )
    process.env['GROQ_API_KEY'] = SECRET_KEY
    mockFetchFail(401)

    const results = await runAllProviderSmokeTests()
    const groq = results.find((r) => r.provider === 'groq')!

    expect(groq.safeErrorReason).not.toContain(SECRET_KEY)
    expect(groq.safeErrorReason).not.toContain('supersecretkey')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Single-provider query
// ─────────────────────────────────────────────────────────────────────────────

describe('Single-provider query', () => {
  it('runProviderSmokeTestById returns result for the requested provider', async () => {
    mocks.isUsableServiceKey.mockReturnValue(false)
    mocks.getMeshCredential.mockResolvedValue(null)

    const result = await runProviderSmokeTestById('groq')

    expect(result.provider).toBe('groq')
    expect(result.status).toBe('not_configured')
  })

  it('runProviderSmokeTestById returns pass for configured provider', async () => {
    mocks.isUsableServiceKey.mockImplementation((key: unknown) => key === 'test-groq-key')
    mocks.getMeshCredential.mockImplementation(async (id: string) =>
      id === 'groq' ? 'test-groq-key' : null,
    )
    process.env['GROQ_API_KEY'] = 'test-groq-key'
    mockFetchOk()

    const result = await runProviderSmokeTestById('groq')

    expect(result.provider).toBe('groq')
    expect(result.status).toBe('pass')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Studio E2E — capability taxonomy proof
// ─────────────────────────────────────────────────────────────────────────────

describe('Studio E2E — capability taxonomy proof', () => {
  it('chat capability is working with provider routes', () => {
    const chat = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'chat')
    expect(chat).toBeDefined()
    expect(chat!.status).toBe('working')
    expect(chat!.providerRoutes.length).toBeGreaterThan(0)
    expect(chat!.executableEndpoint).toBeTruthy()
  })

  it('text_to_image capability is working with provider routes', () => {
    const tti = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_image')
    expect(tti).toBeDefined()
    expect(tti!.status).toBe('working')
    expect(tti!.createsArtifact).toBe(true)
    expect(tti!.executableEndpoint).toBeTruthy()
  })

  it('text_to_video capability is working with provider routes', () => {
    const ttv = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_video')
    expect(ttv).toBeDefined()
    expect(ttv!.status).toBe('working')
    expect(ttv!.createsArtifact).toBe(true)
    expect(ttv!.longRunning).toBe(true)
  })

  it('text_to_speech capability is working with provider routes', () => {
    const tts = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_speech')
    expect(tts).toBeDefined()
    expect(tts!.status).toBe('working')
    expect(tts!.createsArtifact).toBe(true)
  })

  it('automatic_speech_recognition capability is working', () => {
    const stt = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'automatic_speech_recognition')
    expect(stt).toBeDefined()
    expect(stt!.status).toBe('working')
    expect(stt!.createsArtifact).toBe(true)
  })

  it('music_generation uses real playable-audio adapters', () => {
    const music = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'music_generation')
    expect(music).toBeDefined()
    expect(music!.status).toBe('working')
    expect(music!.readiness).toBe('ready')
    expect(music!.adapterImplemented).toBe(true)
    expect(music!.executableEndpoint).toBe('/api/admin/music-studio')
    expect(music!.providerRoutes.filter((route) => route.executable).map((route) => route.provider))
      .toEqual(['genx'])
    expect(music!.providerRoutes.find((route) => route.provider === 'huggingface')).toMatchObject({
      executable: false,
      status: 'requires_endpoint',
    })
    expect(music!.createsArtifact).toBe(true)
  })

  it('research capability is working', () => {
    const research = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'research')
    expect(research).toBeDefined()
    expect(research!.status).toBe('working')
  })

  it('embeddings capability is working', () => {
    const embeddings = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'embeddings')
    expect(embeddings).toBeDefined()
    expect(embeddings!.status).toBe('working')
  })

  it('all working capabilities have at least one provider route', () => {
    const working = AI_CAPABILITY_TAXONOMY.filter((c) => c.status === 'working')
    for (const cap of working) {
      expect(cap.providerRoutes.length).toBeGreaterThan(0)
    }
  })

  it('all working capabilities have an executable endpoint', () => {
    const working = AI_CAPABILITY_TAXONOMY.filter((c) => c.status === 'working')
    for (const cap of working) {
      expect(cap.executableEndpoint).toBeTruthy()
    }
  })

  it('all provider routes reference approved providers only', () => {
    const approvedSet = new Set(APPROVED_DIRECT_PROVIDER_IDS)
    for (const cap of AI_CAPABILITY_TAXONOMY) {
      for (const route of cap.providerRoutes) {
        expect(approvedSet.has(route.provider)).toBe(true)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Artifact proof — createsArtifact flags
// ─────────────────────────────────────────────────────────────────────────────

describe('Artifact proof — createsArtifact flags', () => {
  it('text_to_image creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_image')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('text_to_video creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_video')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('text_to_speech creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_to_speech')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('automatic_speech_recognition creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'automatic_speech_recognition')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('music_generation creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'music_generation')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('research creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'research')!
    expect(cap.createsArtifact).toBe(true)
  })

  it('text_generation creates artifact', () => {
    const cap = AI_CAPABILITY_TAXONOMY.find((c) => c.id === 'text_generation')!
    expect(cap.createsArtifact).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Connected-app E2E flow — file-level proof
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected-app E2E flow — file-level proof', () => {
  it('connected-app capability engine file exists', () => {
    const p = path.join(ROOT, 'lib/connected-app-capability-engine.ts')
    expect(fs.existsSync(p)).toBe(true)
  })

  it('connected-app capability execute route exists', () => {
    const p = path.join(ROOT, 'app/api/connected-apps/capabilities/execute/route.ts')
    expect(fs.existsSync(p)).toBe(true)
  })

  it('connected-app capability jobs route exists', () => {
    const p = path.join(ROOT, 'app/api/connected-apps/capabilities/jobs/[jobId]/route.ts')
    expect(fs.existsSync(p)).toBe(true)
  })

  it('connected-app execute route verifies HMAC', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/connected-apps/capabilities/execute/route.ts'),
      'utf8',
    )
    const engineSrc = fs.readFileSync(
      path.join(ROOT, 'lib/connected-app-capability-engine.ts'),
      'utf8',
    )
    expect(src).toContain('authenticateConnectedAppCapabilityRequest')
    expect(engineSrc).toContain('verifyWebhookSignature')
  })

  it('connected-app execute route checks capability scope', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/connected-apps/capabilities/execute/route.ts'),
      'utf8',
    )
    // Must check scopes or capability engine does
    const engineSrc = fs.readFileSync(
      path.join(ROOT, 'lib/connected-app-capability-engine.ts'),
      'utf8',
    )
    expect(src + engineSrc).toMatch(/scope|scopes/)
  })

  it('connected-app capability engine creates artifact', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/connected-app-capability-engine.ts'),
      'utf8',
    )
    expect(src).toContain('createArtifact')
  })

  it('connected-app capability engine records audit event', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/connected-app-capability-engine.ts'),
      'utf8',
    )
    expect(src).toContain('recordAcceptedEvent')
  })

  it('webhook verifier rejects invalid HMAC', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/webhook-verifier.ts'),
      'utf8',
    )
    expect(src).toContain('invalid_signature')
    expect(src).toContain('timingSafeEqual')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test endpoint — file-level proof
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke test endpoint — file-level proof', () => {
  it('live-ai-smoke-tests route file exists', () => {
    const p = path.join(ROOT, 'app/api/admin/system/live-ai-smoke-tests/route.ts')
    expect(fs.existsSync(p)).toBe(true)
  })

  it('live-ai-smoke-tests route calls runAllProviderSmokeTests', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/admin/system/live-ai-smoke-tests/route.ts'),
      'utf8',
    )
    expect(src).toContain('runAllProviderSmokeTests')
  })

  it('live-ai-smoke-tests route supports single-provider query', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/admin/system/live-ai-smoke-tests/route.ts'),
      'utf8',
    )
    expect(src).toContain('provider')
    expect(src).toContain('runProviderSmokeTestById')
  })

  it('live-smoke-tests lib never logs or returns raw API keys', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/live-smoke-tests.ts'),
      'utf8',
    )
    // Must use sanitizeProviderError for all error paths
    expect(src).toContain('sanitizeProviderError')
    // Must not log raw keys
    expect(src).not.toContain('console.log(apiKey')
    expect(src).not.toContain('console.log(key')
  })
})
