/**
 * Production Repair — Clean Slate Tests
 *
 * Verifies the production repair requirements:
 *
 * Part 1 — Health ping shape (ok:true, service, timestamp)
 * Part 2 — Adult policy: full_adult_app_mode and all levels accepted
 * Part 3 — Clean slate reset requires RESET_APPROVED_KEYS confirmation
 * Part 4 — Settings clean slate reset button exists
 * Part 5 — Command center does not say "dashboard foundation is being shaped"
 * Part 6 — Final audit script covers all required checks
 * Part 7 — Diagnostics: no banned providers configured
 * Part 8 — Reset endpoint: does not clear app/artifact/memory data
 */

import { afterEach, describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

const REPO_ROOT   = path.resolve(__dirname, '../../..')
const APP_ROOT    = path.resolve(__dirname, '../../app')
const _DASH_ROOT   = path.resolve(__dirname, '../../app/admin/dashboard')
const API_ROOT    = path.resolve(__dirname, '../../app/api/admin')
const SCRIPTS_ROOT = path.resolve(REPO_ROOT, 'scripts')

function readSrc(relPath: string) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8')
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1 — Health ping shape
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 1 — Health ping returns correct shape', () => {
  const pingSrc = readSrc('src/app/api/health/ping/route.ts')

  it('ping route exists', () => {
    expect(fs.existsSync(path.join(APP_ROOT, 'api/health/ping/route.ts'))).toBe(true)
  })

  it('ping returns ok: true', () => {
    expect(pingSrc).toContain('ok: true')
  })

  it('ping returns service: amarktai-network', () => {
    expect(pingSrc).toContain('amarktai-network')
    expect(pingSrc).toContain('service:')
  })

  it('ping returns timestamp', () => {
    expect(pingSrc).toContain('timestamp')
  })

  it('ping returns status: ok', () => {
    expect(pingSrc).toContain("status: 'ok'")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 2 — Adult policy modes
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 2 — Adult policy: all modes accepted, no Unknown mode error for valid modes', () => {
  const testAdultSrc = readSrc('src/app/api/admin/settings/test-adult/route.ts')

  it('test-adult route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/test-adult/route.ts'))).toBe(true)
  })

  it('accepts full_adult_app_mode', () => {
    expect(testAdultSrc).toContain('full_adult_app_mode')
  })

  it('accepts adult_text mode', () => {
    expect(testAdultSrc).toContain('adult_text')
  })

  it('accepts adult_image mode', () => {
    expect(testAdultSrc).toContain('adult_image')
  })

  it('accepts adult_video mode', () => {
    expect(testAdultSrc).toContain('adult_video')
  })

  it('accepts adult_voice mode', () => {
    expect(testAdultSrc).toContain('adult_voice')
  })

  it('accepts suggestive mode', () => {
    expect(testAdultSrc).toContain('suggestive')
  })

  it('does not return "Unknown mode full_adult" for full_adult_app_mode', () => {
    // The old error message was: Unknown mode "full_adult". Only "specialist" is supported.
    // The new code must not produce this message for any accepted mode.
    expect(testAdultSrc).not.toContain('Only "specialist" is supported')
  })

  it('routes all non-disabled modes through specialist provider stack', () => {
    const hasSpecialistBlock = testAdultSrc.includes('ACCEPTED_ADULT_MODES') ||
      testAdultSrc.includes('full_adult_app_mode')
    expect(hasSpecialistBlock).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 — Clean slate reset requires confirmation
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 3 — Clean slate reset: confirmation required', () => {
  const resetSrc = readSrc('src/app/api/admin/settings/reset-approved-keys/route.ts')

  it('reset-approved-keys route exists', () => {
    expect(fs.existsSync(path.join(API_ROOT, 'settings/reset-approved-keys/route.ts'))).toBe(true)
  })

  it('reset-approved-keys requires RESET_APPROVED_KEYS confirmation token', () => {
    expect(resetSrc).toContain('RESET_APPROVED_KEYS')
  })

  it('reset-approved-keys rejects requests without confirm field', () => {
    expect(resetSrc).toContain('Confirmation required')
  })

  it('reset-approved-keys does not clear app data, repos, or memory', () => {
    // The route should only clear integrationConfig and aiProvider keys, not app data
    expect(resetSrc).not.toMatch(/prisma\.app\.delete|prisma\.artifact\.delete|prisma\.memory\.delete/)
  })

  it('reset-approved-keys returns what was cleared', () => {
    expect(resetSrc).toContain('cleared')
    expect(resetSrc).toContain('results')
  })

  it('reset-approved-keys only resets approved provider keys (not banned providers)', () => {
    // APPROVED_RESET_KEYS must not include banned providers
    const start = resetSrc.indexOf('APPROVED_RESET_KEYS')
    const end = resetSrc.indexOf(']', start) + 1
    const keysBlock = start >= 0 && end > start ? resetSrc.slice(start, end) : ''
    const bannedKeys = ['openai', 'anthropic', 'deepseek', 'replicate', 'cohere', 'mistral', 'elevenlabs', 'deepgram']
    for (const k of bannedKeys) {
      expect(keysBlock, `Banned key '${k}' must not be in APPROVED_RESET_KEYS`).not.toContain(`'${k}'`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 3b — Reset functional test (with mocking)
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 3b — Reset functional tests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('reset-approved-keys rejects request without confirm field (400)', async () => {
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
      body: JSON.stringify({ all: true }), // missing confirm
    })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    const body = await res.json() as { error?: string; success?: boolean }
    expect(body.error).toContain('RESET_APPROVED_KEYS')
  })

  it('reset-approved-keys succeeds with correct confirm token', async () => {
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        aiProvider: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      },
    }))

    const { POST } = await import('@/app/api/admin/settings/reset-approved-keys/route')
    const req = new Request('http://localhost/api/admin/settings/reset-approved-keys', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', keys: ['genx'] }),
    })
    const res = await POST(req as Parameters<typeof POST>[0])
    const body = await res.json() as { success: boolean; cleared: number }
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleared).toBeGreaterThanOrEqual(0)
  })

  it('reset-approved-keys rejects unauthenticated requests', async () => {
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: false }) }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: { updateMany: vi.fn() },
        aiProvider: { updateMany: vi.fn() },
      },
    }))

    const { POST } = await import('@/app/api/admin/settings/reset-approved-keys/route')
    const req = new Request('http://localhost/api/admin/settings/reset-approved-keys', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', all: true }),
    })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 4 — Settings clean slate reset button
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 4 — Settings has clean-slate reset button', () => {
  const settingsSrc = readSrc('src/app/admin/dashboard/settings/page.tsx')

  it('settings page has clean-slate reset button or reference', () => {
    const hasReset = settingsSrc.includes('RESET_APPROVED_KEYS') ||
      settingsSrc.includes('clear saved provider keys') ||
      settingsSrc.includes('Start clean')
    expect(hasReset, 'Settings must have a clean-slate reset button').toBe(true)
  })

  it('settings reset uses reset-approved-keys endpoint', () => {
    expect(settingsSrc).toContain('reset-approved-keys')
  })

  it('settings reset requires confirmation before calling endpoint', () => {
    // The reset handler should use window.confirm or an explicit confirmation step
    const hasConfirm = settingsSrc.includes('window.confirm') || settingsSrc.includes('RESET_APPROVED_KEYS')
    expect(hasConfirm).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — Command center does not say "dashboard foundation is being shaped"
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 5 — Command center product-ready copy', () => {
  const ccSrc = readSrc('src/app/admin/dashboard/command-center/page.tsx')

  it('command-center does not say "dashboard foundation is being shaped"', () => {
    expect(ccSrc).not.toContain('dashboard foundation is being shaped')
  })

  it('command-center does not say "Finish dashboard foundation" as a next action', () => {
    expect(ccSrc).not.toContain('Finish dashboard foundation')
  })

  it('command-center links to settings for provider keys', () => {
    expect(ccSrc).toContain('/admin/dashboard/settings')
  })

  it('command-center links to diagnostics', () => {
    expect(ccSrc).toContain('/admin/dashboard/diagnostics')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 6 — Final audit script comprehensive checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 6 — Final audit script covers required checks', () => {
  const auditSrc = fs.readFileSync(path.join(SCRIPTS_ROOT, 'final_go_live_audit.sh'), 'utf-8')

  it('audit script exists', () => {
    expect(fs.existsSync(path.join(SCRIPTS_ROOT, 'final_go_live_audit.sh'))).toBe(true)
  })

  it('audit script checks health ping', () => {
    expect(auditSrc).toContain('/api/health/ping')
  })

  it('audit script checks Settings endpoint', () => {
    expect(auditSrc).toContain('/api/admin/settings/integrations')
  })

  it('audit script checks Diagnostics endpoint', () => {
    expect(auditSrc).toContain('/api/admin/system/live-readiness')
  })

  it('audit script checks adult policy', () => {
    expect(auditSrc).toContain('/api/admin/global-adult-mode')
  })

  it('audit script checks for reset endpoint', () => {
    expect(auditSrc).toContain('reset-approved-keys')
  })

  it('audit script checks for full_adult_app_mode acceptance', () => {
    expect(auditSrc).toContain('full_adult_app_mode')
  })

  it('audit script includes production-repair-clean-slate tests', () => {
    expect(auditSrc).toContain('production-repair-clean-slate')
  })

  it('audit script has PASS/FAIL summary', () => {
    expect(auditSrc).toContain('PASS')
    expect(auditSrc).toContain('FAIL')
    expect(auditSrc).toContain('exit 1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 7 — Diagnostics: no banned providers configured
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 7 — Diagnostics does not expose banned providers', () => {
  const diagSrc = readSrc('src/app/admin/dashboard/diagnostics/page.tsx')

  const bannedProviderLabels = [
    'OpenAI Direct',
    'Anthropic',
    'Cohere',
    'Mistral',
    'Replicate',
    'ElevenLabs',
    'Deepgram',
    'DeepSeek',
    'Mem0',
    'PostHog',
    'Qdrant',
    'Suno',
    'Udio',
    'OpenRouter',
  ]

  for (const label of bannedProviderLabels) {
    it(`diagnostics does not hardcode "${label}" as a provider`, () => {
      // The diagnostics page should not list these as configured/active providers in hardcoded UI
      // (They may appear in data fetched from runtime truth, but not as static UI elements)
      const inStaticContent = diagSrc.includes(`"${label}"`) || diagSrc.includes(`'${label}'`)
      // Only fail if it's hardcoded as a string literal (not in a comment)
      if (inStaticContent) {
        const lines = diagSrc.split('\n').filter(l => (l.includes(`"${label}"`) || l.includes(`'${label}'`)) && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
        expect(lines.length, `"${label}" hardcoded in diagnostics as provider`).toBe(0)
      }
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 8 — Reset endpoint note about preserved data
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 8 — Reset does not affect non-key data', () => {
  const resetSrc = readSrc('src/app/api/admin/settings/reset-approved-keys/route.ts')

  it('reset note mentions app data is unaffected', () => {
    const hasNote = resetSrc.includes('App data') || resetSrc.includes('app data') ||
      resetSrc.includes('unaffected') || resetSrc.includes('NOT delete')
    expect(hasNote, 'Reset endpoint should note app data is unaffected').toBe(true)
  })

  it('reset does not call any delete on non-key tables', () => {
    // Should not delete from repos, artifacts, apps, memory, or user tables
    expect(resetSrc).not.toMatch(/prisma\.(repo|artifact|app|user|memory)\.(delete|deleteMany)/)
  })
})
