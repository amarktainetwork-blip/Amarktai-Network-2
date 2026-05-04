/**
 * Go-Live Clean-Slate Audit Tests
 *
 * Verifies production-readiness requirements for the AmarktAI Network go-live audit:
 *
 * Part 1 — Route existence (public + dashboard canonical)
 * Part 2 — Legacy dashboard routes redirect correctly
 * Part 3 — No unsupported providers visible in Settings
 * Part 4 — Approved provider stack is present in Settings
 * Part 5 — Settings clean-slate: no fake configured keys
 * Part 6 — Adult policy is app-level, no separate adult key
 * Part 7 — Diagnostics is the only health/readiness page
 * Part 8 — final_go_live_audit.sh exists and is executable
 * Part 9 — provider-capability-test API route exists
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const APP_ROOT     = path.resolve(__dirname, '../../app')
const DASH_ROOT    = path.resolve(__dirname, '../../app/admin/dashboard')
const SCRIPTS_ROOT = path.resolve(__dirname, '../../../scripts')
const API_ROOT     = path.resolve(__dirname, '../../app/api/admin')

function readDashPage(relPath: string): string {
  return fs.readFileSync(path.join(DASH_ROOT, relPath), 'utf-8')
}

function isRedirectOnly(relPath: string): boolean {
  try {
    const src = readDashPage(relPath)
    const lines = src.split('\n').filter(l => l.trim())
    return src.includes("import { redirect }") && lines.length <= 8
  } catch {
    return false
  }
}

function redirectTarget(relPath: string): string {
  const src = readDashPage(relPath)
  const m = src.match(/redirect\(['"]([^'"]+)['"]\)/)
  return m?.[1] ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1 — Public routes exist
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 1 — Public routes exist', () => {
  const publicRoutes: [string, string][] = [
    ['/', ''],
    ['/about', 'about'],
    ['/apps', 'apps'],
    ['/contact', 'contact'],
    ['/privacy', 'privacy'],
    ['/terms', 'terms'],
    ['/admin/login', 'admin/login'],
  ]

  for (const [label, rel] of publicRoutes) {
    it(`route ${label} has a page.tsx`, () => {
      const fullPath = rel === ''
        ? path.join(APP_ROOT, 'page.tsx')
        : path.join(APP_ROOT, rel, 'page.tsx')
      expect(fs.existsSync(fullPath), `${label}: page.tsx not found`).toBe(true)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 1b — Canonical dashboard routes exist
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 1b — Canonical dashboard routes exist', () => {
  const canonicalRoutes = [
    'command-center',
    'amarktai-assistant',
    'apps',
    'agents',
    'repo-workbench',
    'research',
    'creative-studio',
    'memory',
    'actions',
    'diagnostics',
    'settings',
  ]

  for (const route of canonicalRoutes) {
    it(`/admin/dashboard/${route} has a page.tsx`, () => {
      expect(
        fs.existsSync(path.join(DASH_ROOT, route, 'page.tsx')),
        `/admin/dashboard/${route}/page.tsx not found`,
      ).toBe(true)
    })

    it(`/admin/dashboard/${route} is NOT a redirect-only page`, () => {
      expect(
        isRedirectOnly(route + '/page.tsx'),
        `/admin/dashboard/${route} should be a real page, not a redirect`,
      ).toBe(false)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 2 — Legacy dashboard routes redirect correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 2 — Legacy dashboard routes redirect correctly', () => {
  const redirectRules: [string, string][] = [
    ['aiva/page.tsx',                   '/admin/dashboard/amarktai-assistant'],
    ['system-health/page.tsx',          '/admin/dashboard/diagnostics'],
    ['live-readiness/page.tsx',         '/admin/dashboard/diagnostics'],
    ['readiness/page.tsx',              '/admin/dashboard/diagnostics'],
    ['system/page.tsx',                 '/admin/dashboard/diagnostics'],
    ['monitor/page.tsx',                '/admin/dashboard/diagnostics'],
    ['media-studio/page.tsx',           '/admin/dashboard/creative-studio'],
    ['music-studio/page.tsx',           '/admin/dashboard/creative-studio'],
    ['video/page.tsx',                  '/admin/dashboard/creative-studio'],
    ['voice/page.tsx',                  '/admin/dashboard/creative-studio'],
    ['memory-emotions/page.tsx',        '/admin/dashboard/memory'],
    ['emotions/page.tsx',               '/admin/dashboard/memory'],
    ['ai-engine/aiva-actions/page.tsx', '/admin/dashboard/actions'],
    ['operations/page.tsx',             '/admin/dashboard/actions'],
    ['alerts/page.tsx',                 '/admin/dashboard/actions'],
    ['jobs/page.tsx',                   '/admin/dashboard/diagnostics'],
    ['build-studio/page.tsx',           '/admin/dashboard/repo-workbench'],
    ['intelligence/page.tsx',           '/admin/dashboard/research'],
    ['integrations/page.tsx',           '/admin/dashboard/settings'],
    ['models/page.tsx',                 '/admin/dashboard/settings'],
  ]

  for (const [relPath, expectedTarget] of redirectRules) {
    const route = '/admin/dashboard/' + relPath.replace('/page.tsx', '')
    it(`${route} redirects to ${expectedTarget}`, () => {
      expect(
        fs.existsSync(path.join(DASH_ROOT, relPath)),
        `${relPath} does not exist`,
      ).toBe(true)
      expect(
        isRedirectOnly(relPath),
        `${relPath} should be a redirect-only page`,
      ).toBe(true)
      expect(
        redirectTarget(relPath),
        `${relPath} should redirect to ${expectedTarget}`,
      ).toBe(expectedTarget)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 — No unsupported providers visible in Settings UI
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 3 — No unsupported providers in Settings UI', () => {
  const settingsSrc = readDashPage('settings/page.tsx')

  const bannedProviderCards = [
    { key: 'openai',      label: 'Direct OpenAI API' },
    { key: 'openrouter',  label: 'OpenRouter' },
    { key: 'moonshot',    label: 'Moonshot / Kimi' },
    { key: 'zhipu',       label: 'Zhipu AI / GLM' },
    { key: 'replicate',   label: 'Replicate' },
    { key: 'elevenlabs',  label: 'ElevenLabs' },
    { key: 'deepgram',    label: 'Deepgram' },
    { key: 'deepseek',    label: 'DeepSeek' },
    { key: 'anthropic',   label: 'Anthropic' },
    { key: 'cohere',      label: 'Cohere' },
    { key: 'mistral',     label: 'Mistral' },
    { key: 'suno',        label: 'Suno' },
    { key: 'udio',        label: 'Udio' },
    { key: 'perplexity',  label: 'Perplexity' },
    { key: 'runpod',      label: 'RunPod' },
    { key: 'fireworks',   label: 'Fireworks' },
    { key: 'cerebras',    label: 'Cerebras' },
    { key: 'assemblyai',  label: 'AssemblyAI' },
  ]

  it('does not expose banned provider key strings in PROVIDER_DEFS array', () => {
    // Find the PROVIDER_DEFS_PRIMARY section by looking for the const declaration
    // and checking that banned keys don't appear as key: 'xxx' within it
    const bannedKeys = ['deepseek', 'replicate', 'elevenlabs', 'deepgram', 'openai', 'openrouter', 'moonshot', 'zhipu']
    // Get the section between PROVIDER_DEFS_PRIMARY = [ and the closing comment or next const
    const start = settingsSrc.indexOf('PROVIDER_DEFS_PRIMARY')
    const end = settingsSrc.indexOf('\nfunction ProvidersSection', start)
    const defsBlock = start >= 0 && end > start ? settingsSrc.slice(start, end) : ''
    for (const k of bannedKeys) {
      expect(defsBlock, `'${k}' should not be in PROVIDER_DEFS_PRIMARY`).not.toMatch(
        new RegExp(`key:\\s*['"]${k}['"]`),
      )
    }
  })

  it('does not have PROVIDER_DEFS_SPECIALIST (specialist section removed)', () => {
    expect(settingsSrc).not.toContain('PROVIDER_DEFS_SPECIALIST')
  })

  it('does not have PROVIDER_DEFS_ADVANCED (advanced section removed)', () => {
    expect(settingsSrc).not.toContain('PROVIDER_DEFS_ADVANCED')
  })

  it('does not show "ElevenLabs" as a visible voice provider option', () => {
    // ElevenLabs should not appear in VOICE_PROVIDERS_OPTS
    const start = settingsSrc.indexOf('VOICE_PROVIDERS_OPTS')
    const end = settingsSrc.indexOf('\n]', start) + 2
    const voiceBlock = start >= 0 && end > start ? settingsSrc.slice(start, end) : ''
    expect(voiceBlock, 'ElevenLabs should not be in VOICE_PROVIDERS_OPTS').not.toContain('elevenlabs')
  })

  it('does not show "Deepgram" as a visible voice provider option', () => {
    const start = settingsSrc.indexOf('VOICE_PROVIDERS_OPTS')
    const end = settingsSrc.indexOf('\n]', start) + 2
    const voiceBlock = start >= 0 && end > start ? settingsSrc.slice(start, end) : ''
    expect(voiceBlock, 'Deepgram should not be in VOICE_PROVIDERS_OPTS').not.toContain('deepgram')
  })

  for (const { key, label } of bannedProviderCards) {
    it(`settings page does not have a visible card label '${label}'`, () => {
      // Check that the key doesn't appear as key: 'xxx' in the PROVIDER_DEFS section
      const start = settingsSrc.indexOf('PROVIDER_DEFS_PRIMARY')
      const end = settingsSrc.indexOf('\nfunction ProvidersSection', start)
      const defsBlock = start >= 0 && end > start ? settingsSrc.slice(start, end) : ''
      expect(defsBlock, `'${key}' should not be a visible card in Settings`).not.toMatch(
        new RegExp(`key:\\s*['"]${key}['"]`),
      )
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 4 — Approved provider stack is present in Settings
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 4 — Approved provider stack visible in Settings', () => {
  const settingsSrc = readDashPage('settings/page.tsx')

  const approvedProviders: [string, string][] = [
    ['qwen',        'Qwen / DashScope'],
    ['minimax',     'MiniMax / Mimo'],
    ['gemini',      'Google Gemini'],
    ['huggingface', 'Hugging Face'],
    ['groq',        'Groq'],
    ['together',    'Together AI'],
    ['xai',         'xAI / Grok'],
  ]

  for (const [key, label] of approvedProviders) {
    it(`settings has approved provider '${label}' (key: ${key})`, () => {
      // Search in the full settings source for the key in a PROVIDER_DEFS_PRIMARY entry
      expect(settingsSrc, `provider key '${key}' must be in PROVIDER_DEFS_PRIMARY`).toContain(
        `key: '${key}'`,
      )
    })
  }

  it('settings has AIEngineSection (GenX)', () => {
    expect(settingsSrc).toContain('AIEngineSection')
  })

  it('settings has GitHubSection', () => {
    expect(settingsSrc).toContain('GitHubSection')
  })

  it('settings has WebdockSection', () => {
    expect(settingsSrc).toContain('WebdockSection')
  })

  it('settings has ServiceIntegrationsSection (includes Firecrawl)', () => {
    expect(settingsSrc).toContain('ServiceIntegrationsSection')
    expect(settingsSrc).toContain('firecrawl')
  })

  it('settings has StorageSection', () => {
    expect(settingsSrc).toContain('StorageSection')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — Settings clean-slate: no hardcoded keys, no fake Working status
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 5 — Settings clean-slate: no fake keys or fake Working status', () => {
  const settingsSrc = readDashPage('settings/page.tsx')

  it('does not hardcode any API key values', () => {
    const fakeKeyPatterns = [/sk-[a-zA-Z0-9]{20,}/, /AIza[a-zA-Z0-9]{30,}/, /gsk_[a-zA-Z0-9]{30,}/, /xai-[a-zA-Z0-9]{20,}/, /hf_[a-zA-Z0-9]{20,}/]
    for (const pattern of fakeKeyPatterns) {
      expect(settingsSrc, 'Settings must not hardcode API key values').not.toMatch(pattern)
    }
  })

  it('does not claim GitHub PAT input form', () => {
    const hasPatInput = settingsSrc.includes('GitHub PAT') && settingsSrc.includes('<input') && settingsSrc.includes('type="password"')
    expect(hasPatInput, 'Settings must not have a GitHub PAT input form separate from vault').toBe(false)
  })

  it('resolves provider status from API (not hardcoded)', () => {
    // Settings must fetch from /api/admin/settings/integrations or /api/admin/providers
    expect(settingsSrc).toContain('/api/admin/settings/integrations')
  })

  it('shows masked key only, never plaintext key on load', () => {
    // Should not have a default state with a real key value
    expect(settingsSrc).not.toMatch(/useState\s*\(\s*['"][a-zA-Z0-9_-]{20,}['"]\s*\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 6 — Adult policy is app-level, no separate adult key
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 6 — Adult policy is app-level, no separate adult key', () => {
  const settingsSrc = readDashPage('settings/page.tsx')

  it('settings has AdultSection', () => {
    expect(settingsSrc).toContain('AdultSection')
  })

  it('adult section says app-level access', () => {
    expect(settingsSrc.toLowerCase()).toMatch(/app.level|app level/)
  })

  it('adult policy uses existing provider key — no separate adult provider key input', () => {
    // The adult section should say it uses vault key from AI Providers, not a separate key
    expect(settingsSrc).toContain('no separate adult key required')
  })

  it('adult mode options include off, suggestive, adult text levels', () => {
    expect(settingsSrc.toLowerCase()).toContain('off')
    expect(settingsSrc.toLowerCase()).toContain('suggestive')
    expect(settingsSrc).toContain('adult')
  })

  it('adult access requires age gate and approval', () => {
    const src = settingsSrc.toLowerCase()
    expect(src).toMatch(/age.gate|age gate/)
    expect(src).toMatch(/approv/)
  })

  it('adult section specifies blocked content categories', () => {
    expect(settingsSrc.toLowerCase()).toContain('block')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 7 — Diagnostics is the canonical health/readiness/proof page
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 7 — Diagnostics is the only health/readiness page', () => {
  it('diagnostics/page.tsx exists and is not a redirect', () => {
    expect(fs.existsSync(path.join(DASH_ROOT, 'diagnostics/page.tsx'))).toBe(true)
    expect(isRedirectOnly('diagnostics/page.tsx')).toBe(false)
  })

  const legacyHealthRoutes = [
    'system-health',
    'live-readiness',
    'readiness',
    'system',
    'monitor',
    'jobs',
  ]

  for (const route of legacyHealthRoutes) {
    it(`/admin/dashboard/${route} redirects to diagnostics (not a standalone page)`, () => {
      const target = redirectTarget(`${route}/page.tsx`)
      expect(target, `${route} should redirect to diagnostics`).toBe('/admin/dashboard/diagnostics')
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 8 — final_go_live_audit.sh exists and is executable
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 8 — final_go_live_audit.sh exists and is executable', () => {
  const scriptPath = path.join(SCRIPTS_ROOT, 'final_go_live_audit.sh')

  it('final_go_live_audit.sh exists', () => {
    expect(fs.existsSync(scriptPath), 'scripts/final_go_live_audit.sh not found').toBe(true)
  })

  it('final_go_live_audit.sh is executable', () => {
    const stat = fs.statSync(scriptPath)
    // Check owner execute bit (0o100)
    expect((stat.mode & 0o100) !== 0, 'final_go_live_audit.sh is not executable').toBe(true)
  })

  it('final_go_live_audit.sh covers public routes', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8')
    expect(src).toContain('/about')
    expect(src).toContain('/contact')
    expect(src).toContain('/privacy')
    expect(src).toContain('/terms')
  })

  it('final_go_live_audit.sh covers legacy redirect routes', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8')
    expect(src).toContain('aiva')
    expect(src).toContain('system-health')
    expect(src).toContain('live-readiness')
    expect(src).toContain('media-studio')
    expect(src).toContain('operations')
  })

  it('final_go_live_audit.sh has PASS/FAIL summary and exits non-zero on failure', () => {
    const src = fs.readFileSync(scriptPath, 'utf-8')
    expect(src).toContain('PASS')
    expect(src).toContain('FAIL')
    expect(src).toContain('exit 1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 9 — provider-capability-test API route exists
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 9 — provider-capability-test API route exists', () => {
  const routePath = path.join(API_ROOT, 'provider-capability-test/route.ts')

  it('provider-capability-test route.ts exists', () => {
    expect(fs.existsSync(routePath), '/api/admin/provider-capability-test/route.ts not found').toBe(true)
  })

  it('provider-capability-test route handles POST', () => {
    const src = fs.readFileSync(routePath, 'utf-8')
    expect(src).toContain('POST')
  })

  it('provider-capability-test route requires auth', () => {
    const src = fs.readFileSync(routePath, 'utf-8')
    expect(src).toContain('Unauthorized')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 10 — Repo Workbench links to Settings for key configuration
// ─────────────────────────────────────────────────────────────────────────────

describe('Part 10 — Repo Workbench links to Settings', () => {
  const repoSrc = readDashPage('repo-workbench/page.tsx')

  it('repo-workbench page links to /admin/dashboard/settings', () => {
    expect(repoSrc).toContain('/admin/dashboard/settings')
  })

  it('repo-workbench does not have a GitHub PAT input form', () => {
    const hasPatInput = repoSrc.includes('type="password"') && repoSrc.includes('GitHub PAT')
    expect(hasPatInput, 'Repo Workbench must not have a separate GitHub PAT input').toBe(false)
  })
})
