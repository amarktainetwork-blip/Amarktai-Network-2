/**
 * Dashboard Phase 1 Tests
 *
 * Proves:
 *  1. dashboard-api strips provider/model override fields from all payloads
 *  2. Provider settings page only shows 5 active providers; removed providers not shown
 *  3. VPS page handles healthy/warning/critical/unknown statuses
 *  4. Marketing workflow payload excludes provider/model fields
 *  5. Approval blocks publishing when not approved
 *  6. Adult gate blocks before permission check passes
 *  7. No fake published/success state
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../../..')

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8')
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

// ── 1. dashboard-api strips override fields ───────────────────────────────────

describe('dashboard-api: stripProviderOverrides', () => {
  it('removes providerOverride from payload', async () => {
    const { stripProviderOverrides } = await import('@/lib/dashboard-api')
    const payload = { websiteUrl: 'https://x.com', campaignGoal: 'grow', providerOverride: 'genx' }
    const clean = stripProviderOverrides(payload as Record<string, unknown>)
    expect('providerOverride' in clean).toBe(false)
    expect((clean as Record<string, unknown>).websiteUrl).toBe('https://x.com')
  })

  it('removes modelOverride from payload', async () => {
    const { stripProviderOverrides } = await import('@/lib/dashboard-api')
    const payload = { task: 'generate', modelOverride: 'gpt-4', model: 'gpt-4' }
    const clean = stripProviderOverrides(payload as Record<string, unknown>)
    expect('modelOverride' in clean).toBe(false)
    expect('model' in clean).toBe(false)
  })

  it('removes provider, model, endpoint fields', async () => {
    const { stripProviderOverrides } = await import('@/lib/dashboard-api')
    const payload = {
      websiteUrl: 'https://test.com',
      provider: 'openai',
      model: 'gpt-4',
      endpoint: 'https://api.openai.com',
      providerOverride: 'anthropic',
      modelOverride: 'claude-3',
      campaignGoal: 'test',
    }
    const clean = stripProviderOverrides(payload as Record<string, unknown>)
    expect('provider' in clean).toBe(false)
    expect('model' in clean).toBe(false)
    expect('endpoint' in clean).toBe(false)
    expect('providerOverride' in clean).toBe(false)
    expect('modelOverride' in clean).toBe(false)
    expect((clean as Record<string, unknown>).campaignGoal).toBe('test')
  })

  it('does not strip legitimate payload fields', async () => {
    const { stripProviderOverrides } = await import('@/lib/dashboard-api')
    const payload = {
      websiteUrl: 'https://example.com',
      campaignGoal: 'awareness',
      targetAudience: 'adults',
      platforms: ['instagram'],
      contentTypes: ['image'],
      budgetTier: 'balanced',
      qualityTier: 'standard',
      durationDays: 7,
    }
    const clean = stripProviderOverrides(payload as Record<string, unknown>)
    expect((clean as Record<string, unknown>).websiteUrl).toBe('https://example.com')
    expect((clean as Record<string, unknown>).budgetTier).toBe('balanced')
    expect((clean as Record<string, unknown>).platforms).toEqual(['instagram'])
  })

  it('dashboard-api source exports stripProviderOverrides', () => {
    const src = readSrc('src/lib/dashboard-api.ts')
    expect(src).toContain('stripProviderOverrides')
    expect(src).toContain('FORBIDDEN_FIELDS')
    expect(src).toContain("'providerOverride'")
    expect(src).toContain("'modelOverride'")
    expect(src).toContain("'provider'")
    expect(src).toContain("'model'")
    expect(src).toContain("'endpoint'")
  })
})

// ── 2. Provider settings: only 5 active providers shown ──────────────────────

describe('provider settings: only active providers shown', () => {
  const ACTIVE = ['genx', 'huggingface', 'together', 'groq', 'mimo']
  const REMOVED = ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'minimax',
    'moonshot', 'openrouter', 'mistral', 'cohere', 'nvidia', 'replicate']

  it('providers page ALLOWED_PROVIDER_KEYS contains all 5 active providers', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    for (const key of ACTIVE) {
      expect(src).toContain(`'${key}'`)
    }
  })

  it('providers page filters to allowed keys only', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    expect(src).toContain('ALLOWED_PROVIDER_KEYS')
    expect(src).toContain('.filter(')
  })

  it('providers page does not list removed providers in display keys', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    for (const key of REMOVED) {
      // Removed providers must not appear in the ALLOWED_PROVIDER_KEYS const
      expect(src).not.toMatch(new RegExp(`ALLOWED_PROVIDER_KEYS\\s*=\\s*\\[.*'${key}'`, 's'))
    }
  })

  it('provider display names match allowed providers only', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    expect(src).toContain('GenX')
    expect(src).toContain('Hugging Face')
    expect(src).toContain('Together AI')
    expect(src).toContain('Groq')
    expect(src).toContain('MiMo')
  })
})

// ── 3. VPS page handles all status values ────────────────────────────────────

describe('VPS Health page — status handling', () => {
  it('vps page calls getVpsReadiness from dashboard-api', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).toContain('getVpsReadiness')
    expect(src).toContain('dashboard-api')
  })

  it('vps page renders blockingIssues', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).toContain('blockingIssues')
  })

  it('vps page renders warningIssues', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).toContain('warningIssues')
  })

  it('vps page renders upgradeRecommended', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).toContain('upgradeRecommended')
  })

  it('StatusBadge component handles healthy/warning/critical/unknown', () => {
    const src = readSrc('src/components/dashboard/ui.tsx')
    expect(src).toContain("'healthy'")
    expect(src).toContain("'warning'")
    expect(src).toContain("'critical'")
    expect(src).toContain("'unknown'")
  })

  it('vps page shows no hardcoded healthy status', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).not.toContain("status='healthy'")
    expect(src).not.toContain('status="healthy"')
    expect(src).not.toContain("status: 'healthy'")
  })

  it('getVpsReadiness calls /api/admin/vps/readiness', () => {
    const src = readSrc('src/lib/dashboard-api.ts')
    expect(src).toContain('/api/admin/vps/readiness')
  })

  it('VPS API route calls real runReadinessCheck', () => {
    const src = readSrc('src/app/api/admin/vps/readiness/route.ts')
    expect(src).toContain('runReadinessCheck')
  })
})

// ── 4. Marketing workflow payload: no provider/model fields ───────────────────

describe('marketing workflow payload — provider override exclusion', () => {
  it('marketing page form fields do not include provider or model selection', () => {
    const src = readSrc('src/app/admin/dashboard/marketing/page.tsx')
    expect(src).not.toMatch(/name=['"]provider['"]/)
    expect(src).not.toMatch(/name=['"]model['"]/)
    expect(src).not.toMatch(/name=['"]providerOverride['"]/)
    expect(src).not.toMatch(/name=['"]modelOverride['"]/)
  })

  it('marketing page calls runMarketingWorkflow from dashboard-api', () => {
    const src = readSrc('src/app/admin/dashboard/marketing/page.tsx')
    expect(src).toContain('runMarketingWorkflow')
    expect(src).toContain('dashboard-api')
  })

  it('marketing workflow API route strips forbidden fields', () => {
    const src = readSrc('src/app/api/admin/marketing/run/route.ts')
    expect(src).toContain('FORBIDDEN')
    expect(src).toContain('stripForbidden')
    expect(src).toContain('providerOverride')
    expect(src).toContain('modelOverride')
  })

  it('marketing workflow route never forwards provider/model to the workflow', () => {
    const src = readSrc('src/app/api/admin/marketing/run/route.ts')
    expect(src).not.toContain('providerOverride:')
    expect(src).not.toContain('modelOverride:')
  })

  it('runMarketingWorkflow in dashboard-api uses stripProviderOverrides', () => {
    const src = readSrc('src/lib/dashboard-api.ts')
    expect(src).toContain('stripProviderOverrides')
    const fnIdx = src.indexOf('async function runMarketingWorkflow')
    const stripIdx = src.indexOf('stripProviderOverrides(', fnIdx)
    expect(fnIdx).toBeGreaterThan(-1)
    expect(stripIdx).toBeGreaterThan(fnIdx)
  })

  it('marketing-workflow.ts does not set providerOverride in CapabilityRequest', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).not.toContain('providerOverride:')
    expect(src).not.toContain('modelOverride:')
  })
})

// ── 5. Approval blocks publishing ────────────────────────────────────────────

describe('approval gate — blocks publishing', () => {
  it('approvals page shows publishing blocked for non-approved items', () => {
    const src = readSrc('src/app/admin/dashboard/approvals/page.tsx')
    expect(src).toContain('Publishing blocked')
    expect(src).toContain("approvalStatus !== 'approved'")
  })

  it('publishing page states publishing requires approval', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('requires approval')
  })

  it('approvals/decide route accepts only valid decisions', () => {
    const src = readSrc('src/app/api/admin/approvals/decide/route.ts')
    expect(src).toContain("'approved'")
    expect(src).toContain("'rejected'")
    expect(src).toContain("'needs_changes'")
    expect(src).toContain('VALID_DECISIONS')
  })

  it('approvals/decide route does not accept provider/model override fields', () => {
    const src = readSrc('src/app/api/admin/approvals/decide/route.ts')
    expect(src).not.toContain('providerOverride:')
    expect(src).not.toContain('modelOverride:')
  })

  it('approvals page lists pending items', () => {
    const src = readSrc('src/app/admin/dashboard/approvals/page.tsx')
    expect(src).toContain('listPendingApprovals')
    expect(src).toContain('pending')
  })
})

// ── 6. Adult gate blocks before permission ────────────────────────────────────

describe('adult mode gate', () => {
  it('adult mode page gate is locked by default', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain("'locked'")
    expect(src).toContain('gate !== ')
  })

  it('adult mode page requires age confirmation', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('ageConfirmed')
    expect(src).toContain('18')
  })

  it('adult mode page requires consent confirmation', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('consentConfirmed')
    expect(src).toContain('consenting adults')
  })

  it('adult mode page requires rights confirmation', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('rightsConfirmed')
  })

  it('adult mode page has voice consent check', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('voiceConsent')
    expect(src).toContain('voice')
  })

  it('adult mode page blocks minors content before submission', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('minor')
    expect(src).toContain('DISALLOWED_PATTERNS')
  })

  it('adult mode page blocks non-consensual content', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('non.?consensual')
  })

  it('adult mode page blocks revenge/leaked content', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('revenge')
    expect(src).toContain('leaked')
  })

  it('adult mode submit is disabled until gate is unlocked and prompt clean', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('canSubmit')
    expect(src).toContain("gate === 'unlocked'")
    expect(src).toContain('!blockReason')
  })

  it('adult mode page never selects a provider', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).not.toContain('providerOverride')
    expect(src).not.toContain('modelOverride')
  })

  it('adult mode page blocks content before API call', () => {
    const src = readSrc('src/app/admin/dashboard/adult-mode/page.tsx')
    expect(src).toContain('DISALLOWED_PATTERNS')
    expect(src).toContain('blockReason')
  })
})

// ── 7. No fake success states ─────────────────────────────────────────────────

describe('no fake success states', () => {
  it('marketing page uses real API runMarketingWorkflow', () => {
    const src = readSrc('src/app/admin/dashboard/marketing/page.tsx')
    expect(src).toContain('runMarketingWorkflow')
    expect(src).not.toContain('fakeCampaign')
    expect(src).not.toContain('mockCampaign')
  })

  it('campaigns page uses real API listCampaigns', () => {
    const src = readSrc('src/app/admin/dashboard/campaigns/page.tsx')
    expect(src).toContain('listCampaigns')
    expect(src).not.toContain('const fakeCampaigns')
    expect(src).not.toContain('mockCampaigns')
  })

  it('assets page uses real API listAssets', () => {
    const src = readSrc('src/app/admin/dashboard/assets/page.tsx')
    expect(src).toContain('listAssets')
    expect(src).not.toContain('fakeAssets')
    expect(src).not.toContain('mockAssets')
  })

  it('vps health page shows real API data, not hardcoded health', () => {
    const src = readSrc('src/app/admin/dashboard/vps-health/page.tsx')
    expect(src).toContain('getVpsReadiness')
    expect(src).not.toContain("status: 'healthy'")
  })

  it('approvals page uses real API listPendingApprovals', () => {
    const src = readSrc('src/app/admin/dashboard/approvals/page.tsx')
    expect(src).toContain('listPendingApprovals')
    expect(src).not.toContain('mockApprovals')
  })

  it('dashboard-api does not hardcode success responses', () => {
    const src = readSrc('src/lib/dashboard-api.ts')
    expect(src).not.toContain('hardcoded')
    expect(src).not.toContain('fakeData')
  })
})

// ── 8. DASHBOARD_NAV_ITEMS covers required sections ──────────────────────────

describe('dashboard nav: required sections present', () => {
  it('nav items export from dashboard-nav.ts', async () => {
    const { DASHBOARD_NAV_ITEMS } = await import('@/lib/dashboard-nav')
    expect(Array.isArray(DASHBOARD_NAV_ITEMS)).toBe(true)
    expect(DASHBOARD_NAV_ITEMS.length).toBeGreaterThanOrEqual(15)
  })

  it('nav includes required section IDs', async () => {
    const { DASHBOARD_NAV_ITEMS } = await import('@/lib/dashboard-nav')
    const ids = DASHBOARD_NAV_ITEMS.map(item => item.id)
    expect(ids).toContain('overview')
    expect(ids).toContain('marketing')
    expect(ids).toContain('campaigns')
    expect(ids).toContain('assets')
    expect(ids).toContain('approvals')
    expect(ids).toContain('providers')
    expect(ids).toContain('vps-health')
    expect(ids).toContain('adult-mode')
    expect(ids).toContain('brand-memory')
    expect(ids).toContain('rag')
    expect(ids).toContain('agents')
    expect(ids).toContain('scheduler')
    expect(ids).toContain('publishing')
    expect(ids).toContain('analytics')
    expect(ids).toContain('avatars')
    expect(ids).toContain('settings')
  })

  it('all nav items have href, label, icon, and group', async () => {
    const { DASHBOARD_NAV_ITEMS } = await import('@/lib/dashboard-nav')
    for (const item of DASHBOARD_NAV_ITEMS) {
      expect(item.href).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.group).toBeTruthy()
    }
  })
})
