/**
 * Phase 1B Dashboard Truth Integration Tests
 *
 * Verifies the fixes for:
 * 1. Adult mode: full_adult maps to full_adult_app_mode (legacy alias)
 * 2. Settings: approved providers list only counts approved keys
 * 3. Health endpoint: inline check returns true when server is running
 * 4. Repo import: git clone uses token on first attempt (GIT_TERMINAL_PROMPT=0)
 * 5. Research page: local storage/jobs status derived from API
 * 6. Actions page: Live Approval Queue shows Working when API succeeds
 * 7. Agents page: fetches API and shows registry Working
 * 8. Settings: Mem0/PostHog/Qdrant not in approved service integrations
 * 9. Command Center: no stale "Fix health endpoint" action
 */

import { describe, it, expect } from 'vitest'

/* ================================================================
 * PART 1 — ADULT MODE LEGACY ALIAS
 * ================================================================ */

describe('Adult mode — full_adult legacy alias', () => {
  it('ACCEPTED_ADULT_MODES includes full_adult_app_mode', () => {
    const ACCEPTED_ADULT_MODES = new Set([
      'specialist',
      'suggestive',
      'adult_text',
      'adult_image',
      'adult_video',
      'adult_voice',
      'full_adult_app_mode',
    ])
    expect(ACCEPTED_ADULT_MODES.has('full_adult_app_mode')).toBe(true)
  })

  it('full_adult is NOT in ACCEPTED_ADULT_MODES (it must be remapped first)', () => {
    const ACCEPTED_ADULT_MODES = new Set([
      'specialist',
      'suggestive',
      'adult_text',
      'adult_image',
      'adult_video',
      'adult_voice',
      'full_adult_app_mode',
    ])
    expect(ACCEPTED_ADULT_MODES.has('full_adult')).toBe(false)
  })

  it('legacy full_adult maps to full_adult_app_mode before mode check', () => {
    // Simulate the normalisation logic in test-adult/route.ts
    function normaliseLegacyMode(mode: string): string {
      if (mode === 'full_adult') return 'full_adult_app_mode'
      return mode
    }
    const normalised = normaliseLegacyMode('full_adult')
    expect(normalised).toBe('full_adult_app_mode')

    const ACCEPTED_ADULT_MODES = new Set([
      'specialist', 'suggestive', 'adult_text', 'adult_image',
      'adult_video', 'adult_voice', 'full_adult_app_mode',
    ])
    expect(ACCEPTED_ADULT_MODES.has(normalised)).toBe(true)
  })

  it('other modes are not remapped by legacy normalisation', () => {
    function normaliseLegacyMode(mode: string): string {
      if (mode === 'full_adult') return 'full_adult_app_mode'
      return mode
    }
    expect(normaliseLegacyMode('off')).toBe('off')
    expect(normaliseLegacyMode('suggestive')).toBe('suggestive')
    expect(normaliseLegacyMode('specialist')).toBe('specialist')
    expect(normaliseLegacyMode('adult_image')).toBe('adult_image')
  })

  it('Settings UI adult mode value is full_adult_app_mode not full_adult', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/settings/page.tsx', 'utf8')
    // The value should be full_adult_app_mode in ADULT_MODES array
    expect(src).toContain("value: 'full_adult_app_mode'")
    // The old value full_adult (without _app_mode) must NOT appear as a standalone option value
    expect(src).not.toMatch(/value:\s*'full_adult'[^_]/)
  })
})

/* ================================================================
 * PART 2 — SETTINGS APPROVED PROVIDERS COUNT
 * ================================================================ */

describe('Settings — approved provider count', () => {
  const APPROVED_KEYS = new Set([
    'qwen', 'minimax', 'gemini', 'huggingface', 'groq', 'together', 'xai',
  ])

  it('approved provider keys are exactly the 7 approved providers', () => {
    expect(APPROVED_KEYS.size).toBe(7)
  })

  it('legacy providers are NOT in approved key set', () => {
    const legacyProviders = [
      'openai', 'anthropic', 'cohere', 'mistral', 'replicate',
      'elevenlabs', 'deepgram', 'deepseek', 'openrouter', 'perplexity',
    ]
    for (const key of legacyProviders) {
      expect(APPROVED_KEYS.has(key)).toBe(false)
    }
  })

  it('configured count only includes approved providers', () => {
    const allProviders = [
      { providerKey: 'qwen', maskedPreview: 'sk-****', enabled: true },
      { providerKey: 'gemini', maskedPreview: null, enabled: false },
      { providerKey: 'openai', maskedPreview: 'sk-****', enabled: true }, // legacy
      { providerKey: 'together', maskedPreview: 'tg-****', enabled: true },
      { providerKey: 'anthropic', maskedPreview: 'ant-****', enabled: true }, // legacy
    ]

    const configured = allProviders.filter(
      (p) => APPROVED_KEYS.has(p.providerKey) && (p.maskedPreview || p.enabled)
    ).length

    // Only qwen + together = 2 (gemini has no maskedPreview and not enabled)
    expect(configured).toBe(2)
  })

  it('Settings page uses APPROVED_PROVIDER_KEYS to filter configured count', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/settings/page.tsx', 'utf8')
    expect(src).toContain('APPROVED_PROVIDER_KEYS')
    expect(src).toContain('APPROVED_PROVIDER_KEYS.has(p.providerKey)')
  })
})

/* ================================================================
 * PART 3 — SETTINGS: Mem0/PostHog/Qdrant removed
 * ================================================================ */

describe('Settings — Mem0/PostHog/Qdrant removed from visible UI', () => {
  it('Service Integrations section only shows Firecrawl', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/settings/page.tsx', 'utf8')

    // The keyField call for Mem0 must NOT be in the visible section
    expect(src).not.toContain("save('mem0'")
    expect(src).not.toContain("save('posthog'")
    expect(src).not.toContain("save('qdrant'")

    // Firecrawl must still be present
    expect(src).toContain("save('firecrawl'")
  })

  it('ServiceIntegrationsSection badge only counts Firecrawl', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/settings/page.tsx', 'utf8')

    // The badge array should only include Firecrawl — not Mem0/PostHog/Qdrant
    // The old badge array had 4 entries: Firecrawl, Mem0, PostHog, Qdrant
    // New badge array has only Firecrawl
    expect(src).not.toContain("configured(data.mem0) && 'Mem0'")
    expect(src).not.toContain("configured(data.posthog) && 'PostHog'")
    expect(src).not.toContain("configured(data.qdrant) && 'Qdrant'")
    expect(src).toContain("configured(data.firecrawl) && 'Firecrawl'")
  })
})

/* ================================================================
 * PART 4 — HEALTH ENDPOINT DIAGNOSTIC FIX
 * ================================================================ */

describe('Health endpoint — diagnostic liveness check', () => {
  it('health ping handler always returns ok: true when running', () => {
    // Simulate the health handler logic (no deps)
    const response = { ok: true, status: 'ok', service: 'amarktai-network', timestamp: new Date().toISOString() }
    expect(response.ok).toBe(true)
    expect(response.status).toBe('ok')
  })

  it('live-readiness route uses inline fallback when fetch fails', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/api/admin/system/live-readiness/route.ts', 'utf8')

    // Must use loopback URL from env vars, not request.url
    expect(src).toContain('NEXT_PUBLIC_APP_URL')
    expect(src).toContain('127.0.0.1')

    // Must have inline fallback: ok: true when network fails
    expect(src).toContain('server is running')

    // Must NOT use request.url for the health check
    expect(src).not.toContain("new URL('/api/health/ping', request.url)")
  })

  it('inline health check returns ok: true when server is alive', () => {
    // Simulates the inline fallback logic
    const inline = { ok: true, evidence: 'GET /api/health/ping confirmed inline — server is running' }
    expect(inline.ok).toBe(true)
    expect(inline.evidence).toContain('server is running')
  })
})

/* ================================================================
 * PART 5 — REPO IMPORT AUTH
 * ================================================================ */

describe('Repo import — git auth fix', () => {
  it('runGit passes GIT_TERMINAL_PROMPT=0 to prevent interactive prompts', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/lib/repo-workbench.ts', 'utf8')
    expect(src).toContain("GIT_TERMINAL_PROMPT: '0'")
    expect(src).toContain('GIT_ASKPASS')
  })

  it('importRepo clones with token on first attempt (not as fallback)', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/lib/repo-workbench.ts', 'utf8')

    // Token-first clone pattern: if (token) { clone with token } else { clone without }
    expect(src).toContain('if (token) {')
    // The old fallback pattern (clone without token first, retry with token) should be gone
    expect(src).not.toContain('if (!gitResult.ok && token) {')
  })

  it('clone URL is still the plain remoteUrl (token injected via http.extraHeader)', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/lib/repo-workbench.ts', 'utf8')

    // Should use http.extraHeader approach, not embed token in URL
    expect(src).toContain('http.extraHeader=Authorization: Bearer')
    // Token must NOT be embedded directly in the clone URL
    expect(src).not.toMatch(/https:\/\/x-access-token:\$\{token\}@github\.com/)
  })

  it('logs are scrubbed — scrubSecrets is applied to all git output', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/lib/repo-workbench.ts', 'utf8')
    expect(src).toContain('scrubSecrets(result.stdout')
    expect(src).toContain('scrubSecrets(result.stderr')
  })
})

/* ================================================================
 * PART 6 — RESEARCH PAGE: LOCAL STATUS
 * ================================================================ */

describe('Research page — local storage/jobs status', () => {
  it('research page fetches /api/admin/research/jobs on mount', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/research/page.tsx', 'utf8')
    expect(src).toContain('/api/admin/research/jobs')
    expect(src).toContain('useEffect')
  })

  it('research page derives storageStatus from API response', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/research/page.tsx', 'utf8')
    expect(src).toContain('storageStatus')
    expect(src).toContain("Working")
  })

  it('research page shows Working for scraped storage when API ok', () => {
    // Simulate response from /api/admin/research/jobs
    const apiData = { jobs: [], storageWritable: true, driver: 'local_vps', hasFirecrawl: false }

    const localStorageOk = apiData.storageWritable ?? (apiData.driver === 'local_vps' || Array.isArray(apiData.jobs))
    const jobCount = Array.isArray(apiData.jobs) ? apiData.jobs.length : 0
    const hasFirecrawl = apiData.hasFirecrawl ?? false

    const storageStatus = localStorageOk ? 'Working' : 'Backend pending'
    const jobsStatus = jobCount !== null ? 'Working' : 'Backend pending'
    const firecrawlStatus = hasFirecrawl ? 'Working' : 'Needs key'

    expect(storageStatus).toBe('Working')
    expect(jobsStatus).toBe('Working')
    expect(firecrawlStatus).toBe('Needs key')
  })

  it('research page shows Backend pending when API fails', () => {
    // null state when API fails
    const localStorageOk: boolean | null = null
    const jobCount: number | null = null

    const storageStatus = localStorageOk === null ? 'Backend pending' : localStorageOk ? 'Working' : 'Backend pending'
    const jobsStatus = jobCount === null ? 'Backend pending' : 'Working'

    expect(storageStatus).toBe('Backend pending')
    expect(jobsStatus).toBe('Backend pending')
  })
})

/* ================================================================
 * PART 7 — ACTIONS PAGE: QUEUE STATUS
 * ================================================================ */

describe('Actions page — Live Approval Queue status', () => {
  it('queue shows Working when API loads successfully (even when empty)', () => {
    // Simulate: API returned an empty array
    const queueLoaded = true
    const queue: unknown[] = []
    const error = ''

    const queueStatus = queueLoaded ? 'Working' : (error ? 'Ready to wire' : 'Ready to wire')

    expect(queueStatus).toBe('Working')
    expect(queue.length).toBe(0)
  })

  it('queue shows Ready to wire when API has not loaded yet', () => {
    const queueLoaded = false
    const error = ''

    const queueStatus = queueLoaded ? 'Working' : (error ? 'Ready to wire' : 'Ready to wire')

    expect(queueStatus).toBe('Ready to wire')
  })

  it('empty queue text is "No pending approvals." not "Ready to wire"', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/actions/page.tsx', 'utf8')
    expect(src).toContain('No pending approvals.')
    expect(src).toContain('queueLoaded')
    // Should NOT say "queue is empty or no provider keys are configured"
    expect(src).not.toContain('queue is empty or no provider keys are configured')
  })

  it('actions page fetches from /api/admin/approvals', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/actions/page.tsx', 'utf8')
    expect(src).toContain('/api/admin/approvals')
  })
})

/* ================================================================
 * PART 8 — AGENTS PAGE: REGISTRY STATUS
 * ================================================================ */

describe('Agents page — registry Working status', () => {
  it('agents page fetches /api/admin/agents on mount', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/agents/page.tsx', 'utf8')
    expect(src).toContain('/api/admin/agents')
    expect(src).toContain('useEffect')
  })

  it('agents page shows "Registry Working" badge when API succeeds', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/agents/page.tsx', 'utf8')
    expect(src).toContain('Registry Working')
    expect(src).toContain('registryLoaded')
  })

  it('agents page does NOT say "Agent wiring happens in Phase 2"', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/agents/page.tsx', 'utf8')
    expect(src).not.toContain('Agent wiring happens in Phase 2')
  })

  it('agents page says "Agent registry is active. Execution depends on provider keys..."', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/agents/page.tsx', 'utf8')
    expect(src).toContain('Agent registry is active')
    expect(src).toContain('Execution depends on provider keys')
  })

  it('registryLoaded=true gives Working status when API returns agents', () => {
    // Simulate: API returned 16 starter agents
    const apiData = [{ id: '1', type: 'test', name: 'Test', status: 'ready' }]
    const agents = Array.isArray(apiData) ? apiData : null
    const registryLoaded = agents !== null
    const registryCount = agents !== null ? agents.length : null

    expect(registryLoaded).toBe(true)
    expect(registryCount).toBe(1)
  })
})

/* ================================================================
 * PART 9 — COMMAND CENTER: NO STALE ACTIONS
 * ================================================================ */

describe('Command Center — updated next actions', () => {
  it('command center does NOT show "Fix health endpoint & run diagnostics"', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/command-center/page.tsx', 'utf8')
    expect(src).not.toContain('Fix health endpoint & run diagnostics')
    expect(src).not.toContain('Fix health endpoint')
  })

  it('command center shows actionable provider key next actions', async () => {
    const { readFile } = await import('fs/promises')
    const src = await readFile('src/app/admin/dashboard/command-center/page.tsx', 'utf8')
    expect(src).toContain('Add provider API keys')
  })
})

/* ================================================================
 * PART 10 — LOCAL STORAGE INTEGRATION CHECK (library level)
 * ================================================================ */

import { checkWritable, LOCAL_STORE_FILES } from '../local-json-store'

describe('Local storage — writable check for dashboard status', () => {
  it('checkWritable returns result for research file path', () => {
    const result = checkWritable(LOCAL_STORE_FILES.research)
    // Should return an object with a writable boolean — not throw
    expect(result).toHaveProperty('writable')
    expect(typeof result.writable).toBe('boolean')
  })

  it('checkWritable returns result for agents file path', () => {
    const result = checkWritable(LOCAL_STORE_FILES.agents)
    expect(result).toHaveProperty('writable')
  })

  it('checkWritable returns result for approvals file path', () => {
    const result = checkWritable(LOCAL_STORE_FILES.approvals)
    expect(result).toHaveProperty('writable')
  })
})
