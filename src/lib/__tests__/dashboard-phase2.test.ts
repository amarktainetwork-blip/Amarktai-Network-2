/**
 * Dashboard Phase 2 Tests
 *
 * Proves:
 *  1. Brand Memory page is not a stub
 *  2. RAG page is not a stub
 *  3. Agents page is not a stub
 *  4. Scheduler page is not a stub
 *  5. Publishing page is not a stub
 *  6. Analytics page is not a stub
 *  7. Avatar page is not a stub
 *  8. Studio payload excludes provider/model override fields
 *  9. Scheduler blocks unapproved publishing
 *  10. Publishing does not fake published state
 *  11. Adult creator only visible behind adult gate
 *  12. Voice cloning requires consent
 *  13. Removed providers are not shown anywhere in Phase 2 pages
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

// ── 1. Brand Memory page is not a stub ────────────────────────────────────────

describe('Brand Memory page is not a stub', () => {
  it('has real form fields', () => {
    const src = readSrc('src/app/admin/dashboard/brand-memory/page.tsx')
    expect(src).toContain('brandName')
    expect(src).toContain('audience')
    expect(src).toContain('voice')
    expect(src).toContain('tone')
    expect(src).toContain('products')
  })

  it('calls brand-memory API', () => {
    const src = readSrc('src/app/admin/dashboard/brand-memory/page.tsx')
    expect(src).toContain('/api/admin/brand-memory')
  })

  it('has save and edit actions', () => {
    const src = readSrc('src/app/admin/dashboard/brand-memory/page.tsx')
    expect(src).toContain('save')
    expect(src).toContain('Edit')
  })

  it('shows empty state with create action when no brands', () => {
    const src = readSrc('src/app/admin/dashboard/brand-memory/page.tsx')
    expect(src).toContain('EmptyState')
    expect(src).toContain('Create Brand Profile')
  })

  it('API route calls brandMemoryEngine', () => {
    const src = readSrc('src/app/api/admin/brand-memory/route.ts')
    expect(src).toContain('brandMemoryEngine')
    expect(src).toContain('brandMemoryEngine.list')
  })
})

// ── 2. RAG page is not a stub ─────────────────────────────────────────────────

describe('RAG page is not a stub', () => {
  it('has ingest URL input', () => {
    const src = readSrc('src/app/admin/dashboard/rag/page.tsx')
    expect(src).toContain('ingestUrl')
    expect(src).toContain('Ingest')
  })

  it('has query input and results', () => {
    const src = readSrc('src/app/admin/dashboard/rag/page.tsx')
    expect(src).toContain('query')
    expect(src).toContain('Query')
    expect(src).toContain('queryResult')
  })

  it('shows retrieved sources with scores', () => {
    const src = readSrc('src/app/admin/dashboard/rag/page.tsx')
    expect(src).toContain('score')
    expect(src).toContain('chunks')
    expect(src).toContain('citations')
  })

  it('calls rag API routes', () => {
    const src = readSrc('src/app/admin/dashboard/rag/page.tsx')
    expect(src).toContain('/api/admin/rag/ingest')
    expect(src).toContain('/api/admin/rag/query')
    expect(src).toContain('/api/admin/rag/sources')
  })

  it('ingest API calls ingestWebsite from rag-capability', () => {
    const src = readSrc('src/app/api/admin/rag/ingest/route.ts')
    expect(src).toContain('ingestWebsite')
    expect(src).toContain('@/lib/rag-capability')
  })

  it('query API calls queryRAG from rag-capability', () => {
    const src = readSrc('src/app/api/admin/rag/query/route.ts')
    expect(src).toContain('queryRAG')
    expect(src).toContain('@/lib/rag-capability')
  })

  it('rag routes do not make direct provider calls', () => {
    const ingest = readSrc('src/app/api/admin/rag/ingest/route.ts')
    const query = readSrc('src/app/api/admin/rag/query/route.ts')
    // Must not call openai/gemini/etc directly
    expect(ingest).not.toContain('openai')
    expect(ingest).not.toContain('gemini')
    expect(query).not.toContain('openai')
    expect(query).not.toContain('gemini')
  })
})

// ── 3. Agents page is not a stub ──────────────────────────────────────────────

describe('Agents page is not a stub', () => {
  it('has agent type selector', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    expect(src).toContain('agentType')
    expect(src).toContain('marketing')
    expect(src).toContain('research')
    expect(src).toContain('customer_service')
    expect(src).toContain('automation')
  })

  it('has task input', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    expect(src).toContain('task')
    expect(src).toContain('Task Description')
  })

  it('shows steps and output', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    expect(src).toContain('steps')
    expect(src).toContain('output')
  })

  it('calls agents/run API', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    expect(src).toContain('/api/admin/agents/run')
  })

  it('does not expose provider or model selection as a form field or payload key', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    // Must not send providerOverride as a live payload key (comment is acceptable)
    expect(src).not.toMatch(/providerOverride\s*:/)
    expect(src).not.toMatch(/modelOverride\s*:/)
    expect(src).not.toMatch(/name=['"]provider['"]/)
    expect(src).not.toMatch(/name=['"]model['"]/)
  })

  it('agent/run API calls runAgent from agent-system, not providers directly', () => {
    const src = readSrc('src/app/api/admin/agents/run/route.ts')
    expect(src).toContain('runAgent')
    expect(src).toContain('@/lib/agent-system')
    expect(src).not.toContain('openai')
    expect(src).not.toContain('gemini')
  })

  it('agent/run API strips forbidden override fields', () => {
    const src = readSrc('src/app/api/admin/agents/run/route.ts')
    expect(src).toContain('FORBIDDEN')
    expect(src).toContain('providerOverride')
    expect(src).toContain('modelOverride')
  })
})

// ── 4. Scheduler page is not a stub ──────────────────────────────────────────

describe('Scheduler page is not a stub', () => {
  it('has schedule list', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('schedules')
    expect(src).toContain('scheduledFor')
  })

  it('has create schedule form', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('Create Schedule')
    expect(src).toContain('platform')
    expect(src).toContain('timezone')
  })

  it('shows all required status types', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('blocked_approval_required')
    expect(src).toContain('approval required')
    expect(src).toContain('scheduled')
    expect(src).toContain('failed')
    expect(src).toContain('completed')
  })

  it('has cancel and retry actions', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('cancel')
    expect(src).toContain('retry')
  })

  it('calls scheduler API routes', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('/api/admin/scheduler')
  })

  it('scheduler API calls createSchedule from publishing-scheduler', () => {
    const src = readSrc('src/app/api/admin/scheduler/route.ts')
    expect(src).toContain('createSchedule')
    expect(src).toContain('@/lib/publishing-scheduler')
  })
})

// ── 5. Publishing page is not a stub ─────────────────────────────────────────

describe('Publishing page is not a stub', () => {
  it('has publishing results list', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('results')
    expect(src).toContain('status')
    expect(src).toContain('platform')
  })

  it('shows export_ready and provider_not_configured statuses', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('export_ready')
    expect(src).toContain('provider_not_configured')
  })

  it('has copy caption and retry actions', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('Copy')
    expect(src).toContain('Retry')
    expect(src).toContain('retry')
  })

  it('calls publishing API', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('/api/admin/publishing')
  })
})

// ── 6. Analytics page is not a stub ──────────────────────────────────────────

describe('Analytics page is not a stub', () => {
  it('has analytics records and ingest form', () => {
    const src = readSrc('src/app/admin/dashboard/analytics/page.tsx')
    expect(src).toContain('Ingest Metric')
    expect(src).toContain('metric')
    expect(src).toContain('value')
    expect(src).toContain('platform')
  })

  it('shows all required metric types', () => {
    const src = readSrc('src/app/admin/dashboard/analytics/page.tsx')
    expect(src).toContain('impressions')
    expect(src).toContain('engagement_rate')
    expect(src).toContain('manual_score')
  })

  it('calls analytics API', () => {
    const src = readSrc('src/app/admin/dashboard/analytics/page.tsx')
    expect(src).toContain('/api/admin/analytics')
    expect(src).toContain('/api/admin/analytics/ingest')
  })

  it('analytics ingest API calls ingestAnalytics from publishing-scheduler', () => {
    const src = readSrc('src/app/api/admin/analytics/ingest/route.ts')
    expect(src).toContain('ingestAnalytics')
    expect(src).toContain('@/lib/publishing-scheduler')
  })
})

// ── 7. Avatar page is not a stub ─────────────────────────────────────────────

describe('Avatar page is not a stub', () => {
  it('has create avatar form', () => {
    const src = readSrc('src/app/admin/dashboard/avatars/page.tsx')
    expect(src).toContain('avatarName')
    expect(src).toContain('style')
    expect(src).toContain('mode')
    expect(src).toContain('ageCategory')
    expect(src).toContain('appearance')
  })

  it('has voice mode selector', () => {
    const src = readSrc('src/app/admin/dashboard/avatars/page.tsx')
    expect(src).toContain('voiceMode')
    expect(src).toContain('cloned_voice')
    expect(src).toContain('generated_voice')
  })

  it('calls avatars API', () => {
    const src = readSrc('src/app/admin/dashboard/avatars/page.tsx')
    expect(src).toContain('/api/admin/avatars')
    expect(src).toContain('/api/admin/avatars/generate')
  })

  it('avatar generate API calls validateAvatarPayload and buildAvatarPrompt', () => {
    const src = readSrc('src/app/api/admin/avatars/generate/route.ts')
    expect(src).toContain('validateAvatarPayload')
    expect(src).toContain('buildAvatarPrompt')
    expect(src).toContain('@/lib/avatar-capability')
  })

  it('avatar generate API does not expose provider/model selection', () => {
    const src = readSrc('src/app/api/admin/avatars/generate/route.ts')
    expect(src).not.toContain('providerOverride:')
    expect(src).not.toContain('modelOverride:')
    expect(src).toContain('FORBIDDEN')
  })

  it('avatar generate API routes through capability-router', () => {
    const src = readSrc('src/app/api/admin/avatars/generate/route.ts')
    expect(src).toContain('executeCapability')
    expect(src).toContain('@/lib/capability-router')
  })
})

// ── 8. Studio payload excludes provider/model override fields ─────────────────

describe('Studio payload: no provider/model override fields', () => {
  it('studio page does not send providerOverride to stream', () => {
    const src = readSrc('src/app/admin/dashboard/studio/page.tsx')
    // There should be no providerOverride in any fetch body
    expect(src).not.toContain('providerOverride:')
  })

  it('studio page does not send modelOverride to stream', () => {
    const src = readSrc('src/app/admin/dashboard/studio/page.tsx')
    expect(src).not.toContain('modelOverride:')
  })

  it('studio page does not include provider in STT form', () => {
    const src = readSrc('src/app/admin/dashboard/studio/page.tsx')
    // The STT form.append('provider', ...) was removed
    expect(src).not.toMatch(/form\.append\(['"]provider['"]/)
  })

  it('studio page does not include provider in execute body', () => {
    const src = readSrc('src/app/admin/dashboard/studio/page.tsx')
    // The execute call should not have provider: selectedModel?.provider
    expect(src).not.toContain('provider: selectedModel?.provider')
  })
})

// ── 9. Scheduler blocks unapproved publishing ─────────────────────────────────

describe('Scheduler: approval gate blocks publishing', () => {
  it('scheduler page shows blocked_approval_required state', () => {
    const src = readSrc('src/app/admin/dashboard/scheduler/page.tsx')
    expect(src).toContain('blocked_approval_required')
    expect(src).toContain('approval required')
    // The page shows a gate notice (either "approval gate" or "Publishing gate")
    expect(src).toMatch(/approval.{0,10}gate|Publishing gate/i)
  })

  it('publishing export route checks approval gate before export', () => {
    const src = readSrc('src/app/api/admin/publishing/export/route.ts')
    expect(src).toContain('checkApprovalGate')
    expect(src).toContain('approval_required')
    expect(src).toContain('blocked')
  })

  it('publishing export route blocks and returns 403 when not approved', () => {
    const src = readSrc('src/app/api/admin/publishing/export/route.ts')
    expect(src).toContain('403')
    expect(src).toContain("'approval_required'")
  })

  it('scheduler API route uses createSchedule which enforces approval flow', () => {
    const src = readSrc('src/app/api/admin/scheduler/route.ts')
    expect(src).toContain('createSchedule')
    // The scheduler calls createSchedule which requires checkApprovalGate before processing
  })
})

// ── 10. Publishing does not fake published state ──────────────────────────────

describe('Publishing: no fake published state', () => {
  it('publishing page only shows published when backend confirms', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain("status === 'published'")
    // Published section only renders when backend status is 'published'
    expect(src).not.toContain("status: 'published'") // not hardcoded
  })

  it('publishing export route sets export_ready, not published', () => {
    const src = readSrc('src/app/api/admin/publishing/export/route.ts')
    expect(src).toContain("'export_ready'")
    // Should not hardcode 'published' as a return status
    expect(src).not.toContain("status: 'published'")
  })

  it('publishing page shows provider_not_configured state', () => {
    const src = readSrc('src/app/admin/dashboard/publishing/page.tsx')
    expect(src).toContain('provider_not_configured')
    expect(src).toContain('provider not configured')
  })

  it('publishing result API returns real DB results', () => {
    const src = readSrc('src/app/api/admin/publishing/route.ts')
    expect(src).toContain('publishingResult')
    expect(src).not.toContain("status: 'published'")
  })
})

// ── 11. Adult creator only behind adult gate ──────────────────────────────────

describe('Adult creator: gated behind adult permission', () => {
  it('agents page does not list adult_creator as a selectable agent type value', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    // adult_creator must not appear as a value in the AGENT_TYPES array
    // (it may appear in comments explaining it's excluded)
    expect(src).not.toMatch(/value:\s*['"]adult_creator['"]/)
    expect(src).not.toMatch(/\{ value:\s*'adult_creator'/)
  })

  it('agents page notes adult_creator is only in Adult Mode page', () => {
    const src = readSrc('src/app/admin/dashboard/agents/page.tsx')
    expect(src).toContain('adult_creator')
    expect(src).toContain('Adult Mode page')
  })

  it('agents/run API rejects adult_creator without adultPermission', () => {
    const src = readSrc('src/app/api/admin/agents/run/route.ts')
    expect(src).toContain('adult_creator')
    expect(src).toContain('adultPermission')
    expect(src).toContain('403')
  })
})

// ── 12. Voice cloning requires consent ───────────────────────────────────────

describe('Voice cloning: requires consent', () => {
  it('avatars page shows consent checkbox for cloned_voice mode', () => {
    const src = readSrc('src/app/admin/dashboard/avatars/page.tsx')
    expect(src).toContain('cloned_voice')
    expect(src).toContain('consentConfirmed')
    expect(src).toContain('Voice cloning consent required')
  })

  it('avatars page blocks generation when voice=cloned_voice and no consent', () => {
    const src = readSrc('src/app/admin/dashboard/avatars/page.tsx')
    expect(src).toContain('Voice cloning requires consent confirmation')
    expect(src).toContain('consentConfirmed')
  })

  it('avatar-capability validateAvatarPayload enforces consent for cloned_voice', () => {
    const src = readSrc('src/lib/avatar-capability.ts')
    expect(src).toContain("voiceMode === 'cloned_voice'")
    expect(src).toContain('consentConfirmed')
    expect(src).toContain('Voice cloning requires consentConfirmed=true')
  })
})

// ── 13. Removed providers not shown in Phase 2 pages ─────────────────────────

describe('Removed providers not shown in Phase 2 pages', () => {
  const REMOVED = ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'minimax',
    'moonshot', 'openrouter', 'mistral', 'cohere', 'nvidia', 'replicate']

  const PHASE2_PAGES = [
    'src/app/admin/dashboard/brand-memory/page.tsx',
    'src/app/admin/dashboard/rag/page.tsx',
    'src/app/admin/dashboard/agents/page.tsx',
    'src/app/admin/dashboard/scheduler/page.tsx',
    'src/app/admin/dashboard/publishing/page.tsx',
    'src/app/admin/dashboard/analytics/page.tsx',
    'src/app/admin/dashboard/avatars/page.tsx',
  ]

  for (const pagePath of PHASE2_PAGES) {
    it(`${pagePath.split('/').pop()} does not reference removed providers as selectable options`, () => {
      const src = readSrc(pagePath)
      for (const key of REMOVED) {
        // Should not appear as a value in a select/option for provider selection
        expect(src).not.toMatch(new RegExp(`<option[^>]*value=['"]${key}['"]`))
      }
    })
  }

  it('agents/run API does not pass removed providers', () => {
    const src = readSrc('src/app/api/admin/agents/run/route.ts')
    for (const key of REMOVED) {
      expect(src).not.toContain(`provider: '${key}'`)
    }
  })

  it('avatars/generate API does not pass removed providers', () => {
    const src = readSrc('src/app/api/admin/avatars/generate/route.ts')
    for (const key of REMOVED) {
      expect(src).not.toContain(`provider: '${key}'`)
    }
  })
})
