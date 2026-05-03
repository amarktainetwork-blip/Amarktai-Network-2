/**
 * Dashboard Go-Live Checks
 *
 * Verifies structural requirements for the dashboard to be considered go-live ready:
 *  - Nav has exactly 10 sections including Live Readiness (no duplicates)
 *  - Aiva is hidden unless NEXT_PUBLIC_AIVA_ENABLED=true
 *  - Redirect pages point to correct canonical targets
 *  - Repo Workbench agent presets include all required modes
 *  - Settings is the only setup page
 *  - Adult mode is gated by feature flag
 *  - Voice / streaming status is truthfully reported
 *  - Media Studio voice tab exposes batch mode
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function readPage(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('Dashboard Navigation — exactly 10 sections', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('has exactly 10 NAV_ITEMS entries', () => {
    // filter to only the ones that appear inside NAV_ITEMS array
    const navItemBlock = layoutSrc.match(/NAV_ITEMS[\s\S]*?\]/)
    const navHrefs = navItemBlock?.[0].match(/href:\s*['"][^'"]+['"]/g) ?? []
    expect(navHrefs).toHaveLength(10)
  })

  it('includes the 10 canonical sections', () => {
    const required = [
      '/admin/dashboard',
      '/admin/dashboard/command-center',
      '/admin/dashboard/live-readiness',
      '/admin/dashboard/repo-workbench',
      '/admin/dashboard/ai-engine/hub',
      '/admin/dashboard/media-studio',
      '/admin/dashboard/apps',
      '/admin/dashboard/artifacts',
      '/admin/dashboard/system-health',
      '/admin/dashboard/settings',
    ]
    for (const href of required) {
      expect(layoutSrc).toContain(href)
    }
  })

  it('does NOT include duplicate/hidden pages in NAV_ITEMS', () => {
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
    ]
    const navItemBlock = layoutSrc.match(/NAV_ITEMS[\s\S]*?\]/)
    if (navItemBlock) {
      for (const href of banned) {
        expect(navItemBlock[0]).not.toContain(href)
      }
    }
  })
})

// ── Aiva hidden by default ─────────────────────────────────────────────────────

describe('Aiva — hidden unless NEXT_PUBLIC_AIVA_ENABLED=true', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('Aiva is gated behind NEXT_PUBLIC_AIVA_ENABLED env flag', () => {
    expect(layoutSrc).toContain('NEXT_PUBLIC_AIVA_ENABLED')
    expect(layoutSrc).toContain('Aiva disabled by default')
  })
})

// ── Duplicate page redirects ───────────────────────────────────────────────────

describe('Duplicate pages redirect to canonical destinations', () => {
  const redirectPages: Array<{ file: string; expectedTarget: string }> = [
    { file: 'access/page.tsx',         expectedTarget: '/admin/dashboard/settings' },
    { file: 'deployments/page.tsx',    expectedTarget: '/admin/dashboard/repo-workbench' },
    { file: 'emotions/page.tsx',       expectedTarget: '/admin/dashboard/system-health' },
    { file: 'events/page.tsx',         expectedTarget: '/admin/dashboard/system-health' },
    { file: 'integrations/page.tsx',   expectedTarget: '/admin/dashboard/settings' },
    { file: 'intelligence/page.tsx',   expectedTarget: '/admin/dashboard/ai-engine' },
    { file: 'voice/page.tsx',          expectedTarget: '/admin/dashboard/media-studio' },
    { file: 'genx-models/page.tsx',    expectedTarget: '/admin/dashboard/ai-engine' },
    { file: 'brain/page.tsx',          expectedTarget: '/admin/dashboard/ai-engine' },
    { file: 'build-studio/page.tsx',   expectedTarget: '/admin/dashboard/repo-workbench' },
    { file: 'workspace/page.tsx',      expectedTarget: '/admin/dashboard' },
    { file: 'settings/aiva-avatar/page.tsx', expectedTarget: '/admin/dashboard/settings' },
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
    // Should only have import + function body (≤ 8 lines)
    expect(lines.length).toBeLessThanOrEqual(8)
  })
})

// ── Repo Workbench agent selector ─────────────────────────────────────────────

describe('Repo Workbench — agent/model selector', () => {
  const src = readPage('repo-workbench/page.tsx')

  it('exposes AgentPreset / AGENT_PRESETS', () => {
    expect(src).toContain('AGENT_PRESETS')
  })

  it('has GenX Best preset', () => {
    expect(src).toContain('genx_best')
  })

  it('has Cheap preset', () => {
    expect(src).toContain('cheap')
  })

  it('has Balanced preset', () => {
    expect(src).toContain('balanced')
  })

  it('has Premium preset', () => {
    expect(src).toContain('premium')
  })

  it('shows estimated cost before run', () => {
    expect(src).toContain('estimateCost')
    expect(src).toContain('Est. cost')
  })

  it('has Delete Workspace button with confirmation phrase', () => {
    expect(src).toContain('DELETE WORKSPACE')
    expect(src).toContain('deleteWorkspace')
  })

  it('has Reset Workspace button', () => {
    expect(src).toContain('resetWorkspace')
    expect(src).toContain('Reset workspace')
  })

  it('has Clear Logs button', () => {
    expect(src).toContain('clearLogs')
    expect(src).toContain('Clear logs')
  })

  it('Deploy section shows blocker when ENABLE_DEPLOY_ACTIONS not set', () => {
    expect(src).toContain('ENABLE_DEPLOY_ACTIONS')
    expect(src).toContain('Deploy disabled')
  })
})

// ── Adult Mode — settings and media studio ─────────────────────────────────────

describe('Adult Mode — gated and truthful', () => {
  const settingsSrc = readPage('settings/page.tsx')
  const mediaSrc = readPage('media-studio/page.tsx')

  it('Settings page has an AdultSection', () => {
    expect(settingsSrc).toContain('AdultSection')
  })

  it('Adult Mode in settings mentions provider test', () => {
    expect(settingsSrc).toContain('test-adult')
  })

  it('Media Studio adult tab is gated behind NEXT_PUBLIC_ADULT_MODE', () => {
    expect(mediaSrc).toContain('NEXT_PUBLIC_ADULT_MODE')
  })
})

// ── Voice / TTS ────────────────────────────────────────────────────────────────

describe('Media Studio Voice tab — truthful batch vs streaming', () => {
  const mediaSrc = readPage('media-studio/page.tsx')

  it('has voice mode selector (batch/streaming)', () => {
    expect(mediaSrc).toContain('voiceMode')
    expect(mediaSrc).toContain('batch')
    expect(mediaSrc).toContain('streaming')
  })

  it('streaming mode is disabled/pending — not fake', () => {
    expect(mediaSrc).toContain('pending')
    expect(mediaSrc).toContain('cursor-not-allowed')
  })

  it('batch TTS routes to /api/brain/tts', () => {
    expect(mediaSrc).toContain('/api/brain/tts')
  })

  it('has voice provider selector', () => {
    expect(mediaSrc).toContain('voiceProvider')
  })

  it('has voice speed control', () => {
    expect(mediaSrc).toContain('voiceSpeed')
  })
})

// ── System Health MCP tab ──────────────────────────────────────────────────────

describe('System Health — MCP/Tools tab', () => {
  const src = readPage('system-health/page.tsx')

  it('has MCP tab in TABS list', () => {
    expect(src).toContain("id: 'mcp'")
  })

  it('MCP tab shows the wired internal tool registry', () => {
    expect(src).toContain('Internal Tool Registry')
    expect(src).toContain('/api/admin/tool-registry')
  })

  it('MCP tab does not claim it works', () => {
    // Must not say "MCP Ready" or "MCP configured"
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
      // Pages that redirect won't have key config fields
      const isRedirect = content.includes("import { redirect }") && content.split('\n').length <= 10
      if (isRedirect) continue
      // Non-redirect pages must not have GenX key configuration forms
      const hasKeySetup = content.includes('GENX_API_KEY') && content.includes('<input') && content.includes('type="password"')
      expect(hasKeySetup, `${dir}/page.tsx should not have GenX key setup form`).toBe(false)
    }
  })
})
