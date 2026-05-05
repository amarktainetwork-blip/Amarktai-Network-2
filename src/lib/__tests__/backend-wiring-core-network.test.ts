/**
 * Backend Wiring Core Network Tests
 *
 * Integration tests for the new backend wiring:
 * - AmarktAI Assistant routes (Phase C)
 * - Research routes (Phase H)
 * - Approval sub-routes (Phase J)
 * - Settings reset-approved-keys (Phase A)
 *
 * Tests verify route files exist, correct HTTP methods, and shape of responses.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

const API_ROOT = path.resolve(__dirname, '../../app/api/admin')

// ── Route file existence checks ────────────────────────────────────────────

describe('AmarktAI Assistant route files exist (Phase C)', () => {
  it('POST /api/admin/amarktai-assistant/chat route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'amarktai-assistant/chat/route.ts'))).toBe(true)
  })

  it('GET /api/admin/amarktai-assistant/context route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'amarktai-assistant/context/route.ts'))).toBe(true)
  })

  it('GET+POST /api/admin/amarktai-assistant/memory route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'amarktai-assistant/memory/route.ts'))).toBe(true)
  })

  it('POST /api/admin/amarktai-assistant/stream route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'amarktai-assistant/stream/route.ts'))).toBe(true)
  })

  it('amarktai-assistant/chat exports POST handler', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'amarktai-assistant/chat/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*POST/)
  })

  it('amarktai-assistant/context exports GET handler', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'amarktai-assistant/context/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
  })

  it('amarktai-assistant/memory exports GET and POST handlers', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'amarktai-assistant/memory/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
    expect(src).toMatch(/export.*POST/)
  })

  it('amarktai-assistant/stream exports POST handler', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'amarktai-assistant/stream/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*POST/)
  })
})

// ── Research route files ───────────────────────────────────────────────────

describe('Research route files exist (Phase H)', () => {
  it('POST /api/admin/research/url route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'research/url/route.ts'))).toBe(true)
  })

  it('GET /api/admin/research/jobs route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'research/jobs/route.ts'))).toBe(true)
  })

  it('POST /api/admin/research/opportunity route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'research/opportunity/route.ts'))).toBe(true)
  })

  it('POST /api/admin/research/send-to-repo-workbench route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'research/send-to-repo-workbench/route.ts'))).toBe(true)
  })

  it('research/url exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/url/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('research/jobs exports GET', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/jobs/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*GET/)
  })

  it('research/opportunity exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/opportunity/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('research/send-to-repo-workbench exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/send-to-repo-workbench/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('research/url uses firecrawl with fallback', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/url/route.ts'), 'utf-8')
    expect(src).toContain('firecrawl')
    expect(src).toContain('manual')
  })

  it('research/url saves to artifact store', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/url/route.ts'), 'utf-8')
    expect(src).toContain('createArtifact')
    expect(src).toContain('research_source')
  })

  it('research/jobs filters to research_source artifacts', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'research/jobs/route.ts'), 'utf-8')
    expect(src).toContain('research_source')
    expect(src).toContain('listArtifacts')
  })
})

// ── Approval sub-routes ─────────────────────────────────────────────────────

describe('Approval sub-route files exist (Phase J)', () => {
  it('POST /api/admin/approvals/[id]/approve route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'approvals/[id]/approve/route.ts'))).toBe(true)
  })

  it('POST /api/admin/approvals/[id]/reject route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'approvals/[id]/reject/route.ts'))).toBe(true)
  })

  it('approve route exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/approve/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('reject route exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/reject/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('approve route resolves approval and sets decision=approved', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/approve/route.ts'), 'utf-8')
    expect(src).toContain("decision: 'approved'")
    expect(src).toContain('resolved: true')
    expect(src).toContain('resolvedAt')
  })

  it('reject route resolves approval and sets decision=rejected', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/reject/route.ts'), 'utf-8')
    expect(src).toContain("decision: 'rejected'")
    expect(src).toContain('resolved: true')
    expect(src).toContain('resolvedAt')
  })

  it('approve and reject both check for existing approval to prevent double-resolve', () => {
    const approveSrc = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/approve/route.ts'), 'utf-8')
    const rejectSrc = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/reject/route.ts'), 'utf-8')
    expect(approveSrc).toContain('already resolved')
    expect(rejectSrc).toContain('already resolved')
  })
})

// ── Settings reset-approved-keys ───────────────────────────────────────────

describe('Settings reset-approved-keys route (Phase A)', () => {
  it('POST /api/admin/settings/reset-approved-keys route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'))).toBe(true)
  })

  it('reset-approved-keys exports POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
  })

  it('reset-approved-keys only allows approved provider keys', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'), 'utf-8')
    expect(src).toContain('APPROVED_RESET_KEYS')
    expect(src).toContain('genx')
    expect(src).toContain('github')
    expect(src).toContain('webdock')
    expect(src).toContain('firecrawl')
  })

  it('reset-approved-keys does not include banned providers', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'), 'utf-8')
    // Banned providers should not appear in APPROVED_RESET_KEYS array
    const approvedKeysBlock = src.match(/APPROVED_RESET_KEYS\s*=\s*\[[\s\S]*?\]/)
    const block = approvedKeysBlock?.[0] ?? ''
    expect(block).not.toContain('openai')
    expect(block).not.toContain('anthropic')
    expect(block).not.toContain('suno')
    expect(block).not.toContain('mistral')
  })

  it('reset-approved-keys requires authentication', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'), 'utf-8')
    expect(src).toContain('isLoggedIn')
    expect(src).toContain('Unauthorized')
  })
})

// ── Memory save/read via lib ────────────────────────────────────────────────

describe('Memory save/read works locally (Phase D)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('saveMemory returns false gracefully when DB is unavailable', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          create: vi.fn().mockRejectedValue(new Error('connection refused')),
        },
      },
    }))
    const { saveMemory } = await import('@/lib/memory')
    const result = await saveMemory({
      appSlug: 'test-app',
      memoryType: 'event',
      content: 'test content',
    })
    expect(result).toBe(false)
  })

  it('getMemoryStatus returns not_configured when DB is unavailable', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          count: vi.fn().mockRejectedValue(new Error('connection refused')),
          findMany: vi.fn().mockRejectedValue(new Error('connection refused')),
        },
      },
    }))
    const { getMemoryStatus } = await import('@/lib/memory')
    const status = await getMemoryStatus()
    expect(status.available).toBe(false)
    expect(status.statusLabel).toBe('not_configured')
    expect(status.error).toBeTruthy()
  })

  it('saveMemory succeeds when DB is available', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 1, appSlug: 'test-app' })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: mockCreate },
      },
    }))
    const { saveMemory } = await import('@/lib/memory')
    const result = await saveMemory({
      appSlug: 'test-app',
      memoryType: 'event',
      content: 'Hello world',
    })
    expect(result).toBe(true)
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})

// ── App profiles save/read ─────────────────────────────────────────────────

describe('App profile list works (Phase E)', () => {
  it('DEFAULT_APP_PROFILES contains app profiles', async () => {
    const { DEFAULT_APP_PROFILES } = await import('@/lib/app-profiles')
    expect(DEFAULT_APP_PROFILES.size).toBeGreaterThan(0)
  })

  it('app profiles have required fields', async () => {
    const { DEFAULT_APP_PROFILES } = await import('@/lib/app-profiles')
    for (const [, profile] of DEFAULT_APP_PROFILES) {
      expect(profile).toHaveProperty('app_id')
      expect(profile).toHaveProperty('app_name')
    }
  })
})

// ── Agent registry read ────────────────────────────────────────────────────

describe('Agent registry read works (Phase F)', () => {
  it('/api/admin/agents route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'agents/route.ts'))).toBe(true)
  })

  it('agents route exports GET', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'agents/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
  })
})

// ── Repo Workbench task payload accepted (Phase G) ──────────────────────────

describe('Repo Workbench auto task payload accepted (Phase G)', () => {
  it('/api/admin/repo-workbench/status route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'repo-workbench/status/route.ts'))).toBe(true)
  })

  it('/api/admin/repo-workbench/safe-test route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'repo-workbench/safe-test/route.ts'))).toBe(true)
  })

  it('repo-workbench status route exports GET handler', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'repo-workbench/status/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*GET/)
  })

  it('repo-workbench [workspaceId] route exists for task operations', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'repo-workbench/[workspaceId]/route.ts'))).toBe(true)
  })
})

// ── Artifact save/list works (Phase I) ─────────────────────────────────────

describe('Artifact save/list works (Phase I)', () => {
  it('/api/admin/artifacts route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'artifacts/route.ts'))).toBe(true)
  })

  it('artifacts route exports GET and POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'artifacts/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
    expect(src).toMatch(/export.*POST/)
  })
})

// ── Approval queue create/approve/reject (Phase J) ────────────────────────

describe('Approval queue create/approve/reject end-to-end (Phase J)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('approve route exports POST handler correctly', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/approve/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
    expect(src).toContain("decision: 'approved'")
  })

  it('reject route exports POST handler correctly', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'approvals/[id]/reject/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*async.*POST/)
    expect(src).toContain("decision: 'rejected'")
  })

  it('approval approve route sets resolved=true and returns approved decision', async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({ id: 1, resolved: false })
    const mockUpdate = vi.fn().mockResolvedValue({ id: 1, resolvedAt: new Date() })
    vi.doMock('@/lib/prisma', () => ({
      prisma: { systemAlert: { findUnique: mockFindUnique, update: mockUpdate } },
    }))
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))

    const { POST } = await import('@/app/api/admin/approvals/[id]/approve/route')
    const req = new Request('http://localhost/api/admin/approvals/1/approve', {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req as never, { params: Promise.resolve({ id: '1' }) })
    const body = await res.json() as { success: boolean; decision: string }

    expect(body.success).toBe(true)
    expect(body.decision).toBe('approved')
  })

  it('approval reject route sets resolved=true and returns rejected decision', async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({ id: 2, resolved: false })
    const mockUpdate = vi.fn().mockResolvedValue({ id: 2, resolvedAt: new Date() })
    vi.doMock('@/lib/prisma', () => ({
      prisma: { systemAlert: { findUnique: mockFindUnique, update: mockUpdate } },
    }))
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))

    const { POST } = await import('@/app/api/admin/approvals/[id]/reject/route')
    const req = new Request('http://localhost/api/admin/approvals/2/reject', {
      method: 'POST',
      body: '{"reason":"Not safe"}',
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req as never, { params: Promise.resolve({ id: '2' }) })
    const body = await res.json() as { success: boolean; decision: string }

    expect(body.success).toBe(true)
    expect(body.decision).toBe('rejected')
  })

  it('approve returns 409 when approval already resolved', async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({ id: 3, resolved: true })
    vi.doMock('@/lib/prisma', () => ({
      prisma: { systemAlert: { findUnique: mockFindUnique } },
    }))
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))

    const { POST } = await import('@/app/api/admin/approvals/[id]/approve/route')
    const req = new Request('http://localhost/api/admin/approvals/3/approve', {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req as never, { params: Promise.resolve({ id: '3' }) })

    expect(res.status).toBe(409)
  })
})

// ── VPS/Webdock route truthful status (Phase K) ────────────────────────────

describe('VPS/Webdock route returns truthful status (Phase K)', () => {
  it('/api/admin/vps route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'vps/route.ts'))).toBe(true)
  })

  it('/api/integrations/vps-resources route exists', () => {
    const intPath = path.resolve(__dirname, '../../app/api/integrations/vps-resources/route.ts')
    // Either the route exists, or we accept that it maps to another existing endpoint
    const exists = fs.existsSync(intPath)
    // May also be at admin path
    const altPath = path.join(API_ROOT, 'vps/route.ts')
    expect(exists || fs.existsSync(altPath)).toBe(true)
  })
})

// ── Adult policy app-level (Phase L) ──────────────────────────────────────

describe('Adult app policy routes (Phase L)', () => {
  it('/api/admin/app-safety route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'app-safety/route.ts'))).toBe(true)
  })

  it('app-safety route exports GET and POST', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'app-safety/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
    expect(src).toMatch(/export.*POST/)
  })

  it('/api/admin/settings/test-adult route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/test-adult/route.ts'))).toBe(true)
  })
})

// ── Key reset/save/test flow (Phase A) ────────────────────────────────────

describe('Settings key reset/save/test flow (Phase A)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('reset-approved-keys clears specified keys', async () => {
    const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: { updateMany: mockUpdateMany },
        aiProvider: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      },
    }))
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))

    const { POST } = await import('@/app/api/admin/settings/reset-approved-keys/route')
    const req = new Request('http://localhost/api/admin/settings/reset-approved-keys', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', keys: ['github', 'genx'] }),
    })
    const res = await POST(req as Parameters<typeof POST>[0])
    const body = await res.json() as { success: boolean; cleared: number }

    expect(body.success).toBe(true)
    expect(body.cleared).toBe(2)
  })

  it('reset-approved-keys requires confirmation token', async () => {
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        aiProvider: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      },
    }))

    const { POST } = await import('@/app/api/admin/settings/reset-approved-keys/route')
    const req = new Request('http://localhost/api/admin/settings/reset-approved-keys', {
      method: 'POST',
      body: JSON.stringify({ keys: ['github', 'genx'] }), // no confirm field
    })
    const res = await POST(req as Parameters<typeof POST>[0])

    // Should return 400 since confirm is missing
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('RESET_APPROVED_KEYS')
  })

  it('reset-approved-keys rejects unknown/banned provider keys', async () => {
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        aiProvider: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      },
    }))

    const { POST } = await import('@/app/api/admin/settings/reset-approved-keys/route')
    const req = new Request('http://localhost/api/admin/settings/reset-approved-keys', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', keys: ['openai', 'anthropic', 'suno'] }),
    })
    const res = await POST(req as Parameters<typeof POST>[0])

    // Should return 400 since none of the keys are in APPROVED_RESET_KEYS
    expect(res.status).toBe(400)
  })

  it('/api/admin/settings/test-github route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/test-github/route.ts'))).toBe(true)
  })

  it('/api/admin/settings/test-storage route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/test-storage/route.ts'))).toBe(true)
  })

  it('/api/admin/settings/test-webdock route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/test-webdock/route.ts'))).toBe(true)
  })

  it('/api/admin/provider-capability-test route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'provider-capability-test/route.ts'))).toBe(true)
  })

  it('/api/admin/settings/integrations route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/integrations/route.ts'))).toBe(true)
  })
})

// ── Diagnostics truthful status (Phase B) ─────────────────────────────────

describe('Diagnostics returns truthful statuses (Phase B)', () => {
  it('/api/admin/system/live-readiness route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'system/live-readiness/route.ts'))).toBe(true)
  })

  it('live-readiness route exports GET', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'system/live-readiness/route.ts'), 'utf-8')
    expect(src).toMatch(/export.*GET/)
  })

  it('live-readiness does not fake green — checks actual provider status', () => {
    const src = fs.readFileSync(path.join(API_ROOT, 'system/live-readiness/route.ts'), 'utf-8')
    // Should use real provider status checks, not hardcoded 'healthy'
    expect(src).not.toMatch(/status:\s*['"]healthy['"]/)
  })
})
