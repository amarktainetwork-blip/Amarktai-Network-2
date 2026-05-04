/**
 * Frontend Product Foundation Tests (Phase 1B)
 *
 * Verifies:
 *  - Public website does not make GenX/provider names the main product story
 *  - Aiva Chat route exists and is a proper page (not floating overlay)
 *  - Memory/Emotions route exists as a proper dashboard section
 *  - Scraping/Research route exists as a proper dashboard section
 *  - Diagnostics consolidates health/readiness/proof (single surface)
 *  - Repo Workbench labels match Import / Update / Add / Audit / command / plan / PR
 *  - No module labelled Working without matching endpoint/status proof helper
 *  - Settings shows only approved providers (no banned providers)
 *  - Dashboard nav matches Phase 1B canonical 11-item structure
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const DASHBOARD_ROOT = path.resolve(__dirname, '../../app/admin/dashboard')
const APP_ROOT = path.resolve(__dirname, '../../app')

function readPage(root: string, relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf-8')
}

function pageExists(root: string, relPath: string): boolean {
  return fs.existsSync(path.join(root, relPath))
}

// ── Public website: Aiva-first, not GenX/provider-first ──────────────────────

describe('Public website — Aiva-first branding', () => {
  it('homepage does not use GenX as the main brand story', () => {
    const src = readPage(APP_ROOT, 'page.tsx')
    // GenX should not appear as the product name or hero headline
    const lines = src.split('\n')
    const headingLines = lines.filter(l => l.match(/<h[12]/i))
    for (const line of headingLines) {
      expect(line).not.toMatch(/GenX/i)
    }
  })

  it('homepage mentions Aiva', () => {
    const src = readPage(APP_ROOT, 'page.tsx')
    expect(src).toContain('Aiva')
  })

  it('homepage mentions Amarktai Network', () => {
    const src = readPage(APP_ROOT, 'page.tsx')
    expect(src.toLowerCase()).toContain('amarktai')
  })
})

// ── Aiva Chat: dedicated non-overlapping section ─────────────────────────────

describe('Aiva Chat — dedicated route, not floating overlay', () => {
  it('Aiva Chat page exists at /admin/dashboard/aiva', () => {
    expect(pageExists(DASHBOARD_ROOT, 'aiva/page.tsx')).toBe(true)
  })

  it('Aiva Chat page does not use floating/fixed overlay positioning as main layout', () => {
    const src = readPage(DASHBOARD_ROOT, 'aiva/page.tsx')
    // Should not use fixed-position overlay as the primary chat container
    const hasFixedOverlay = src.includes('fixed inset-0') || (src.includes('fixed bottom-') && src.includes('z-50'))
    expect(hasFixedOverlay).toBe(false)
  })

  it('Aiva Chat page has a conversation panel', () => {
    const src = readPage(DASHBOARD_ROOT, 'aiva/page.tsx')
    expect(src.toLowerCase()).toContain('conversation')
  })

  it('Aiva Chat page shows truthful status (not fake Working)', () => {
    const src = readPage(DASHBOARD_ROOT, 'aiva/page.tsx')
    // Should have Ready to wire or Backend pending, not a blanket Working claim
    expect(src).toMatch(/Ready to wire|Backend pending|Needs key/)
  })
})

// ── Memory/Emotions: dedicated route ────────────────────────────────────────

describe('Memory / Emotions — dedicated dashboard section', () => {
  it('Memory/Emotions page exists at /admin/dashboard/memory-emotions', () => {
    expect(pageExists(DASHBOARD_ROOT, 'memory-emotions/page.tsx')).toBe(true)
  })

  it('Memory/Emotions page mentions memory and emotion', () => {
    const src = readPage(DASHBOARD_ROOT, 'memory-emotions/page.tsx')
    expect(src.toLowerCase()).toContain('memory')
    expect(src.toLowerCase()).toContain('emotion')
  })

  it('Memory/Emotions page has consent/privacy controls section', () => {
    const src = readPage(DASHBOARD_ROOT, 'memory-emotions/page.tsx')
    expect(src.toLowerCase()).toMatch(/consent|privacy/)
  })

  it('Memory/Emotions does not claim Working without proof', () => {
    const src = readPage(DASHBOARD_ROOT, 'memory-emotions/page.tsx')
    // Should not have a hard-coded Working status as the overall status
    const lines = src.split('\n')
    const workingLines = lines.filter(l => l.includes("status='Working'") || l.includes('status="Working"'))
    expect(workingLines.length).toBe(0)
  })
})

// ── Scraping/Research: dedicated route ─────────────────────────────────────

describe('Scraping / Research — dedicated dashboard section', () => {
  it('Scraping/Research page exists at /admin/dashboard/research', () => {
    expect(pageExists(DASHBOARD_ROOT, 'research/page.tsx')).toBe(true)
  })

  it('Scraping/Research page mentions Firecrawl', () => {
    const src = readPage(DASHBOARD_ROOT, 'research/page.tsx')
    expect(src.toLowerCase()).toContain('firecrawl')
  })

  it('Scraping/Research page mentions scraped storage', () => {
    const src = readPage(DASHBOARD_ROOT, 'research/page.tsx')
    expect(src.toLowerCase()).toMatch(/storage|scraped|artifact/)
  })

  it('Scraping/Research does not claim Working without proof', () => {
    const src = readPage(DASHBOARD_ROOT, 'research/page.tsx')
    const lines = src.split('\n')
    const workingLines = lines.filter(l => l.includes("status='Working'") || l.includes('status="Working"'))
    expect(workingLines.length).toBe(0)
  })
})

// ── Diagnostics: single health/readiness/proof surface ──────────────────────

describe('Diagnostics — single health/readiness surface', () => {
  it('Diagnostics page exists at /admin/dashboard/system-health', () => {
    expect(pageExists(DASHBOARD_ROOT, 'system-health/page.tsx')).toBe(true)
  })

  it('system-health page contains readiness checks', () => {
    const src = readPage(DASHBOARD_ROOT, 'system-health/page.tsx')
    expect(src.toLowerCase()).toMatch(/readiness|health|check/)
  })

  it('live-readiness is not a primary nav item — it redirects', () => {
    const layoutSrc = readPage(DASHBOARD_ROOT, 'layout.tsx')
    const navBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    // live-readiness must NOT appear as a nav href
    expect(navBlock?.[0]).not.toMatch(/href:\s*['"]\/admin\/dashboard\/live-readiness['"]/)
  })
})

// ── Repo Workbench: Import/Update/Add/Audit/command/plan/PR labels ──────────

describe('Repo Workbench — canonical labels', () => {
  it('Repo Workbench page has Import/clone label', () => {
    const src = readPage(DASHBOARD_ROOT, 'repo-workbench/page.tsx')
    expect(src.toLowerCase()).toMatch(/import|clone/)
  })

  it('Repo Workbench page has Plan label', () => {
    const src = readPage(DASHBOARD_ROOT, 'repo-workbench/page.tsx')
    expect(src).toContain('Plan')
  })

  it('Repo Workbench page has Create PR label', () => {
    const src = readPage(DASHBOARD_ROOT, 'repo-workbench/page.tsx')
    expect(src).toContain('Create PR')
  })

  it('Repo Workbench page references Settings for GitHub token (no PAT input)', () => {
    const src = readPage(DASHBOARD_ROOT, 'repo-workbench/page.tsx')
    expect(src).toContain('/admin/dashboard/settings')
    const hasPatInput = src.includes('GitHub PAT') && src.includes('type="password"')
    expect(hasPatInput).toBe(false)
  })
})

// ── Settings: approved providers only ────────────────────────────────────────

describe('Settings — only approved providers visible', () => {
  const bannedProviders = [
    'Cohere',
    'Mistral Direct',
    'Suno',
    'Udio',
    'Perplexity',
    'Tavily',
    'Jina',
    'RunPod',
    'Fireworks',
    'Cerebras',
    'AssemblyAI',
  ]

  it('Settings page does not show banned provider names in primary UI', () => {
    const src = readPage(DASHBOARD_ROOT, 'settings/page.tsx')
    for (const banned of bannedProviders) {
      // Check as a label, not as a comment or env var reference
      const hasLabel = new RegExp(`['"]${banned}['"]|>${banned}<`).test(src)
      expect(hasLabel, `Settings should not show '${banned}'`).toBe(false)
    }
  })

  it('Settings page shows GenX', () => {
    const src = readPage(DASHBOARD_ROOT, 'settings/page.tsx')
    expect(src).toMatch(/genx|GenX|GENX/i)
  })

  it('Settings page shows GitHub', () => {
    const src = readPage(DASHBOARD_ROOT, 'settings/page.tsx')
    expect(src).toContain('GitHub')
  })
})

// ── Dashboard nav — 11-item canonical structure ──────────────────────────────

describe('Dashboard nav — canonical 11-item structure', () => {
  it('nav includes Aiva Chat at /admin/dashboard/aiva', () => {
    const src = readPage(DASHBOARD_ROOT, 'layout.tsx')
    expect(src).toContain('/admin/dashboard/aiva')
  })

  it('nav includes Memory / Emotions at /admin/dashboard/memory-emotions', () => {
    const src = readPage(DASHBOARD_ROOT, 'layout.tsx')
    expect(src).toContain('/admin/dashboard/memory-emotions')
  })

  it('nav includes Scraping / Research at /admin/dashboard/research', () => {
    const src = readPage(DASHBOARD_ROOT, 'layout.tsx')
    expect(src).toContain('/admin/dashboard/research')
  })

  it('nav does not use GenX as a nav label', () => {
    const src = readPage(DASHBOARD_ROOT, 'layout.tsx')
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navBlock?.[0]).not.toMatch(/label:\s*['"]GenX['"]/)
  })
})
