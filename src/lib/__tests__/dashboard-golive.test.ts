/**
 * Dashboard Go-Live Checks (Foundation Redesign)
 *
 * Verifies structural requirements for the dashboard to be considered go-live ready:
 *  - Nav has exactly 11 canonical sections (no duplicate /admin/dashboard overview)
 *  - /admin/dashboard is NOT a visible nav item (redirect alias only)
 *  - AmarktAI Assistant is the dedicated section at /admin/dashboard/amarktai-assistant
 *  - AmarktAI Assistant panel is hidden unless NEXT_PUBLIC_AIVA_ENABLED=true
 *  - Redirect pages point to correct canonical targets
 *  - Repo Workbench is the canonical simple workbench (no AGENT_PRESETS, no legacy strings)
 *  - Repo Workbench canonical labels are all present
 *  - Settings is the only setup page
 *  - Adult mode is gated by feature flag
 *  - Voice / streaming status is truthfully reported
 *  - Creative Studio voice tab exposes batch mode
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function readPage(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('Dashboard Navigation — exactly 11 canonical sections', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('has exactly 11 NAV_ITEMS entries', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    const navHrefs = navItemBlock?.[0].match(/href:\s*['"][^'"]+['"]/g) ?? []
    expect(navHrefs).toHaveLength(11)
  })

  it('includes the 11 canonical sections', () => {
    const required = [
      '/admin/dashboard/command-center',
      '/admin/dashboard/amarktai-assistant',
      '/admin/dashboard/apps',
      '/admin/dashboard/agents',
      '/admin/dashboard/repo-workbench',
      '/admin/dashboard/research',
      '/admin/dashboard/creative-studio',
      '/admin/dashboard/memory',
      '/admin/dashboard/actions',
      '/admin/dashboard/diagnostics',
      '/admin/dashboard/settings',
    ]
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    for (const href of required) {
      expect(navItemBlock?.[0] ?? layoutSrc).toContain(href)
    }
  })

  it('does NOT include /admin/dashboard (redirect alias) as a visible nav item', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    // /admin/dashboard must not appear as a nav href (exact match, not as a prefix of other routes)
    const exactDashboardHref = /href:\s*['"]\/admin\/dashboard['"]/
    expect(exactDashboardHref.test(navItemBlock?.[0] ?? '')).toBe(false)
  })

  it('does NOT include duplicate/hidden pages as primary nav hrefs in NAV_ITEMS', () => {
    // These items must not appear as the primary `href:` of a nav item
    // (they may appear as match aliases, which is acceptable)
    const banned = [
      '/admin/dashboard/access',
      '/admin/dashboard/deployments',
      '/admin/dashboard/emotions',
      '/admin/dashboard/events',
      '/admin/dashboard/intelligence',
      '/admin/dashboard/integrations',
      '/admin/dashboard/voice',
      '/admin/dashboard/genx-models',
      '/admin/dashboard/brain',
      '/admin/dashboard/workspace',
      '/admin/dashboard/build-studio',
      '/admin/dashboard/live-readiness',
      '/admin/dashboard/artifacts',
      '/admin/dashboard/memory-emotions',
    ]
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    if (navItemBlock) {
      for (const href of banned) {
        // Check that href does not appear as a primary href: (not in match aliases)
        const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const primaryHrefPattern = new RegExp(`href:\\s*['"]${escaped}['"]`)
        expect(primaryHrefPattern.test(navItemBlock[0]), `${href} should not be a primary nav href`).toBe(false)
      }
    }
  })
})

// ── AmarktAI Assistant panel hidden by default ─────────────────────────────────

describe('AmarktAI Assistant panel — hidden unless NEXT_PUBLIC_AIVA_ENABLED=true', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('AmarktAI Assistant panel is gated behind NEXT_PUBLIC_AIVA_ENABLED env flag', () => {
    expect(layoutSrc).toContain('NEXT_PUBLIC_AIVA_ENABLED')
    expect(layoutSrc).toContain('AmarktAI Assistant disabled by default')
  })

  it('AmarktAI Assistant has its own dedicated route at /admin/dashboard/amarktai-assistant', () => {
    const assistantPagePath = path.join(ROOT, 'amarktai-assistant/page.tsx')
    expect(fs.existsSync(assistantPagePath)).toBe(true)
  })

  it('/admin/dashboard/aiva redirects to /admin/dashboard/amarktai-assistant', () => {
    const src = readPage('aiva/page.tsx')
    expect(src).toContain("from 'next/navigation'")
    expect(src).toContain('redirect(')
    expect(src).toContain('/admin/dashboard/amarktai-assistant')
  })
})

// ── Duplicate page redirects ───────────────────────────────────────────────────

describe('Duplicate pages redirect to canonical destinations', () => {
  const redirectPages: Array<{ file: string; expectedTarget: string }> = [
    { file: 'access/page.tsx',              expectedTarget: '/admin/dashboard/settings' },
    { file: 'deployments/page.tsx',         expectedTarget: '/admin/dashboard/repo-workbench' },
    { file: 'emotions/page.tsx',            expectedTarget: '/admin/dashboard/memory' },
    { file: 'events/page.tsx',              expectedTarget: '/admin/dashboard/diagnostics' },
    { file: 'integrations/page.tsx',        expectedTarget: '/admin/dashboard/settings' },
    { file: 'intelligence/page.tsx',        expectedTarget: '/admin/dashboard/research' },
    { file: 'voice/page.tsx',               expectedTarget: '/admin/dashboard/creative-studio' },
    { file: 'genx-models/page.tsx',         expectedTarget: '/admin/dashboard/ai-engine' },
    { file: 'brain/page.tsx',               expectedTarget: '/admin/dashboard/ai-engine' },
    { file: 'build-studio/page.tsx',        expectedTarget: '/admin/dashboard/repo-workbench' },
    { file: 'workspace/page.tsx',           expectedTarget: '/admin/dashboard' },
    { file: 'settings/aiva-avatar/page.tsx', expectedTarget: '/admin/dashboard/settings' },
    { file: 'aiva/page.tsx',                expectedTarget: '/admin/dashboard/amarktai-assistant' },
    { file: 'media-studio/page.tsx',        expectedTarget: '/admin/dashboard/creative-studio' },
    { file: 'memory-emotions/page.tsx',     expectedTarget: '/admin/dashboard/memory' },
    { file: 'system-health/page.tsx',       expectedTarget: '/admin/dashboard/diagnostics' },
    { file: 'ai-engine/aiva-actions/page.tsx', expectedTarget: '/admin/dashboard/actions' },
  ]

  for (const { file, expectedTarget } of redirectPages) {
    it(`${file} redirects to ${expectedTarget}`, () => {
      const src = readPage(file)
      expect(src).toContain("from 'next/navigation'")
      expect(src).toContain('redirect(')
      expect(src).toContain(expectedTarget)
    })
  }

  it('access/page.tsx has no dead code after redirect', () => {
    const src = readPage('access/page.tsx')
    const lines = src.split('\n').filter(l => l.trim().length > 0)
    expect(lines.length).toBeLessThanOrEqual(8)
  })

  it('/admin/dashboard/repo-workbench/simple does NOT exist as an active page', () => {
    const simplePath = path.join(ROOT, 'repo-workbench/simple/page.tsx')
    expect(fs.existsSync(simplePath)).toBe(false)
  })
})

// ── Repo Workbench canonical labels ───────────────────────────────────────────

describe('Repo Workbench — canonical simple flow', () => {
  const src = readPage('repo-workbench/page.tsx')

  const canonicalLabels = [
    'GitHub connection status',
    'Repo selector from connected GitHub account',
    'Import / clone',
    'Tell AmarktAI Assistant what to change',
    'Plan',
    'Generate diff',
    'Apply patch',
    'Run lint',
    'Run test',
    'Run build',
    'Commit',
    'Push',
    'Create PR',
    'Logs panel',
  ]

  for (const label of canonicalLabels) {
    it(`contains canonical label: "${label}"`, () => {
      expect(src).toContain(label)
    })
  }

  const bannedLegacyStrings = [
    'AGENT_PRESETS',
    'genx_best',
    'GenX Best',
    'Safe Repo Workbench Test',
    'File Explorer',
    'File Viewer',
    'Run custom',
    'DEPLOY',
    'GitHub PAT',
    'ENABLE_DEPLOY_ACTIONS',
  ]

  for (const banned of bannedLegacyStrings) {
    it(`does NOT contain legacy string: "${banned}"`, () => {
      expect(src).not.toContain(banned)
    })
  }

  it('no reference to /admin/dashboard/repo-workbench/simple', () => {
    expect(src).not.toContain('/admin/dashboard/repo-workbench/simple')
  })

  it('GitHub token is managed via Settings/vault (no PAT input form)', () => {
    expect(src).toContain('/admin/dashboard/settings')
    const hasPatInput = src.includes('type="password"') && src.includes('GitHub PAT')
    expect(hasPatInput).toBe(false)
  })
})

// ── No /simple references in source ───────────────────────────────────────────

describe('No references to /admin/dashboard/repo-workbench/simple in src', () => {
  function findFilesRecursive(dir: string, ext: string): string[] {
    const results: string[] = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
        results.push(...findFilesRecursive(fullPath, ext))
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        results.push(fullPath)
      }
    }
    return results
  }

  it('no src file references /admin/dashboard/repo-workbench/simple', () => {
    const srcRoot = path.resolve(__dirname, '../../')
    const files = findFilesRecursive(srcRoot, '.ts')
    const offenders: string[] = []
    for (const file of files) {
      // Skip test files — they contain the string as part of enforcement assertions
      if (file.includes('__tests__')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('/admin/dashboard/repo-workbench/simple')) {
        offenders.push(file.replace(srcRoot, 'src'))
      }
    }
    expect(offenders).toHaveLength(0)
  })
})

// ── Adult Mode — settings and creative studio ──────────────────────────────────

describe('Adult Mode — gated and truthful', () => {
  const settingsSrc = readPage('settings/page.tsx')
  const creativeSrc = readPage('creative-studio/page.tsx')

  it('Settings page has an AdultSection', () => {
    expect(settingsSrc).toContain('AdultSection')
  })

  it('Adult Mode in settings mentions provider test', () => {
    expect(settingsSrc).toContain('test-adult')
  })

  it('Creative Studio adult tab is gated behind NEXT_PUBLIC_ADULT_MODE', () => {
    expect(creativeSrc).toContain('NEXT_PUBLIC_ADULT_MODE')
  })
})

// ── Voice / TTS ────────────────────────────────────────────────────────────────

describe('Creative Studio Voice tab — truthful batch vs streaming', () => {
  const creativeSrc = readPage('creative-studio/page.tsx')

  it('has voice mode selector (batch/streaming)', () => {
    expect(creativeSrc).toContain('voiceMode')
    expect(creativeSrc).toContain('batch')
    expect(creativeSrc).toContain('streaming')
  })

  it('streaming mode is disabled/pending — not fake', () => {
    expect(creativeSrc).toContain('pending')
    expect(creativeSrc).toContain('cursor-not-allowed')
  })

  it('batch TTS routes to /api/brain/tts', () => {
    expect(creativeSrc).toContain('/api/brain/tts')
  })

  it('has voice provider selector', () => {
    expect(creativeSrc).toContain('voiceProvider')
  })

  it('has voice speed control', () => {
    expect(creativeSrc).toContain('voiceSpeed')
  })
})

// ── Diagnostics MCP tab ────────────────────────────────────────────────────────

describe('Diagnostics — MCP/Tools tab', () => {
  const src = readPage('diagnostics/page.tsx')

  it('has MCP tab in TABS list', () => {
    expect(src).toContain("id: 'mcp'")
  })

  it('MCP tab shows the wired internal tool registry', () => {
    expect(src).toContain('Internal Tool Registry')
    expect(src).toContain('/api/admin/tool-registry')
  })

  it('MCP tab does not claim it works', () => {
    expect(src).not.toContain('MCP Ready')
    expect(src).not.toContain('MCP configured')
  })
})

// ── Settings is the only setup page ───────────────────────────────────────────

describe('Settings — one setup page', () => {
  it('settings page contains all required configuration sections', () => {
    const src = readPage('settings/page.tsx')
    const requiredSections = [
      'AIEngineSection',
      'GitHubSection',
      'AdultSection',
      'ServiceIntegrationsSection',
      'StorageSection',
      'ProvidersSection',
    ]
    for (const section of requiredSections) {
      expect(src).toContain(section)
    }
  })

  it('no other page in dashboard has a GenX key input field except settings', () => {
    const dashDirs = fs.readdirSync(ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'settings')
      .map(d => d.name)

    for (const dir of dashDirs) {
      const pagePath = path.join(ROOT, dir, 'page.tsx')
      if (!fs.existsSync(pagePath)) continue
      const content = fs.readFileSync(pagePath, 'utf-8')
      const isRedirect = content.includes("import { redirect }") && content.split('\n').length <= 10
      if (isRedirect) continue
      const hasKeySetup = content.includes('GENX_API_KEY') && content.includes('<input') && content.includes('type="password"')
      expect(hasKeySetup, `${dir}/page.tsx should not have GenX key setup form`).toBe(false)
    }
  })
})
