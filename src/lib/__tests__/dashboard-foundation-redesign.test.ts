/**
 * Dashboard Foundation Redesign Tests
 *
 * Validates the dashboard foundation redesign:
 * - Dashboard nav has exactly the 11 canonical sections
 * - No visible Aiva/AIVA copy in dashboard user-facing text
 * - Repo Workbench no longer requires "Choose task" step / is prompt-first
 * - Repo Workbench supports repo add/pull and website preview wording
 * - Creative Studio has Asset Mixer with multi-AI combination workflows
 * - Memory page says VPS/local storage first
 * - Research page does not rely only on Firecrawl
 * - Diagnostics is the single health/readiness/proof surface
 * - Settings only shows approved provider stack (no unsupported providers)
 * - Unfinished modules are not marked Working without proof
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function readPage(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// ── 1. Dashboard nav has exactly 11 canonical sections ──────────────────────

describe('Dashboard nav — exactly 11 canonical sections', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('NAV_ITEMS has exactly 11 entries', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    const navHrefs = navItemBlock?.[0].match(/href:\s*['"][^'"]+['"]/g) ?? []
    expect(navHrefs).toHaveLength(11)
  })

  it('nav includes "AmarktAI Assistant" label', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('AmarktAI Assistant')
  })

  it('nav includes /admin/dashboard/amarktai-assistant route', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('/admin/dashboard/amarktai-assistant')
  })

  it('nav does not include old /admin/dashboard/aiva route as label', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    // aiva may appear in match aliases but not as main href
    const block = navItemBlock?.[0] ?? ''
    // The main href for the assistant section must be amarktai-assistant, not aiva
    expect(block).not.toMatch(/href:\s*['"]\/admin\/dashboard\/aiva['"]/)
  })

  it('nav includes Creative Studio section', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('Creative Studio')
  })

  it('nav includes Memory section', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('/admin/dashboard/memory')
  })

  it('nav includes Actions section', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('/admin/dashboard/actions')
  })

  it('nav includes Diagnostics section', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    expect(navItemBlock?.[0] ?? layoutSrc).toContain('/admin/dashboard/diagnostics')
  })
})

// ── 2. No visible Aiva/AIVA in user-facing dashboard UI ────────────────────

describe('No visible Aiva/AIVA copy in dashboard user-facing pages', () => {
  const DASHBOARD_PAGES = [
    'command-center/page.tsx',
    'amarktai-assistant/page.tsx',
    'apps/page.tsx',
    'agents/page.tsx',
    'repo-workbench/page.tsx',
    'research/page.tsx',
    'creative-studio/page.tsx',
    'memory/page.tsx',
    'actions/page.tsx',
    'diagnostics/page.tsx',
  ]

  for (const page of DASHBOARD_PAGES) {
    const pagePath = path.join(ROOT, page)
    if (!fs.existsSync(pagePath)) continue
    const src = fs.readFileSync(pagePath, 'utf-8')

    it(`${page} has no visible "Aiva" label in headings or visible text`, () => {
      // Allow "Aiva" in internal JS identifiers, code strings for api paths (/api/admin/aiva/)
      // but not in JSX text content like <h1>Aiva</h1> or <p>Aiva</p>
      // We check that the visible nav label and page title don't show "Aiva" or "AIVA"
      const jsxTextAiva = src.match(/>(\s*)(Aiva|AIVA)(\s*)</g) ?? []
      expect(jsxTextAiva, `${page} shows raw "Aiva"/"AIVA" as JSX text`).toHaveLength(0)
    })
  }

  it('layout.tsx nav label does not show "Aiva" or "AI Assistant" (old label)', () => {
    const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    // Old label was 'AI Assistant' — new label must be 'AmarktAI Assistant'
    // Ensure 'AI Assistant' (without AmarktAI prefix) is not used as nav label
    const block = navItemBlock?.[0] ?? ''
    expect(block).not.toMatch(/label:\s*['"]AI Assistant['"]/)
  })
})

// ── 3. Repo Workbench — prompt-first, no mandatory task selector ────────────

describe('Repo Workbench — prompt-first, auto-agent flow', () => {
  const src = readPage('repo-workbench/page.tsx')

  it('has a main prompt box for telling AmarktAI Assistant what to do', () => {
    expect(src).toContain('Tell AmarktAI Assistant what to change')
  })

  it('does not require mandatory task selector as a blocking step', () => {
    // The old Step 4 "Choose task" pattern is gone — task type is now optional/auto
    expect(src).not.toContain('Choose task')
  })

  it('has AmarktAI Assistant auto-route agent option', () => {
    // Agent with auto-route label
    expect(src).toContain('auto-route')
  })

  it('agent/model selection is optional (has auto select option)', () => {
    expect(src).toContain('Auto select')
  })

  it('supports repo add/pull (import/clone)', () => {
    expect(src).toContain('Import / clone')
  })

  it('supports prompt-driven plan generation', () => {
    expect(src).toContain('Plan')
    expect(src).toContain('plan')
  })

  it('no GitHub PAT input form (token managed via Settings)', () => {
    const hasPatInput = src.includes('type="password"') && src.includes('GitHub PAT')
    expect(hasPatInput).toBe(false)
  })
})

// ── 4. Creative Studio — Asset Mixer with multi-AI combinations ─────────────

describe('Creative Studio — Asset Mixer and multi-AI workflows', () => {
  const src = readPage('creative-studio/page.tsx')

  it('has Asset Mixer tab', () => {
    expect(src).toContain('Asset Mixer')
  })

  it('Asset Mixer shows multi-AI workflow templates', () => {
    expect(src).toContain('text → image → video')
  })

  it('Asset Mixer mentions combining outputs from multiple AIs', () => {
    const hasCombine = src.includes('Combine outputs') || src.includes('combine outputs') || src.includes('multi-AI')
    expect(hasCombine).toBe(true)
  })

  it('has Image, Video, Voice, Music tabs', () => {
    expect(src).toContain('Images')
    expect(src).toContain('Video')
    expect(src).toContain('Voice')
    expect(src).toContain('Music')
  })

  it('uses runtime-backed model choices (fetches from /api/admin/media-studio/models)', () => {
    expect(src).toContain('/api/admin/media-studio/models')
  })

  it('uses artifact persistence (/api/admin/artifacts)', () => {
    expect(src).toContain('/api/admin/artifacts')
  })

  it('adult content is gated behind NEXT_PUBLIC_ADULT_MODE', () => {
    expect(src).toContain('NEXT_PUBLIC_ADULT_MODE')
  })
})

// ── 5. Memory — VPS/local-first ────────────────────────────────────────────

describe('Memory page — VPS/local-first storage', () => {
  const src = readPage('memory/page.tsx')

  it('has "VPS/local storage first" wording', () => {
    expect(src).toContain('VPS/local storage first')
  })

  it('has "Vector memory ready to wire" wording', () => {
    expect(src).toContain('Vector memory ready to wire')
  })

  it('has "No external memory provider required to start" wording', () => {
    expect(src).toContain('No external memory provider required to start')
  })

  it('has "Memory must be scoped by app, user, and permission" wording', () => {
    const hasScoped = src.includes('scoped by app') || src.includes('scoped by app, user, and permission')
    expect(hasScoped).toBe(true)
  })

  it('does not show fake saved data (no Working status on memory)', () => {
    // Memory backend is not wired — all statuses should be Backend pending or Ready to wire
    expect(src).not.toContain("status: 'Working'")
    expect(src).not.toContain('status="Working"')
  })

  it('page exists and is non-empty', () => {
    const p = path.join(ROOT, 'memory/page.tsx')
    expect(fs.existsSync(p)).toBe(true)
    expect(src.length).toBeGreaterThan(200)
  })
})

// ── 6. Research — does not rely only on Firecrawl ──────────────────────────

describe('Research page — not Firecrawl-only', () => {
  const src = readPage('research/page.tsx')

  it('has Firecrawl as primary crawler', () => {
    expect(src).toContain('Firecrawl')
  })

  it('has a Backup Crawler section', () => {
    expect(src).toContain('Backup Crawler')
  })

  it('does not say it relies only on Firecrawl', () => {
    // The page must show alternative crawler path
    expect(src).not.toContain('Firecrawl is the only')
  })

  it('has App Discovery / Researcher Agent section', () => {
    const hasDiscovery = src.includes('App Discovery') || src.includes('Researcher Agent')
    expect(hasDiscovery).toBe(true)
  })

  it('does not use the word "clone" for competitor research', () => {
    // Policy: use "create improved alternative" not "clone"
    // "clone" is OK in repo context but not as research product wording
    const hasCloneAsCta = src.includes('Clone competitor') || src.includes('clone competitor')
    expect(hasCloneAsCta).toBe(false)
  })
})

// ── 7. Diagnostics — single health/readiness/proof surface ─────────────────

describe('Diagnostics — single health/readiness/proof surface', () => {
  const src = readPage('diagnostics/page.tsx')

  it('Diagnostics page exists', () => {
    const p = path.join(ROOT, 'diagnostics/page.tsx')
    expect(fs.existsSync(p)).toBe(true)
  })

  it('has Live Readiness tab', () => {
    expect(src).toContain('Live Readiness')
  })

  it('has VPS tab', () => {
    expect(src).toContain('VPS')
  })

  it('has MCP/Tools tab', () => {
    expect(src).toContain("id: 'mcp'")
  })

  it('system-health redirects to diagnostics', () => {
    const shSrc = readPage('system-health/page.tsx')
    expect(shSrc).toContain('/admin/dashboard/diagnostics')
  })

  it('live-readiness redirects to diagnostics', () => {
    const lrSrc = readPage('live-readiness/page.tsx')
    expect(lrSrc).toContain('/admin/dashboard/diagnostics')
  })
})

// ── 8. Settings — only approved provider stack ──────────────────────────────

describe('Settings — approved provider stack only in UI', () => {
  const src = readPage('settings/page.tsx')

  const APPROVED_PROVIDERS = [
    'GenX',
    'GitHub',
    'Webdock',
    'Firecrawl',
    'Storage',
  ]

  // These providers must not appear in PROVIDER_DEFS_PRIMARY or PROVIDER_DEFS_SPECIALIST
  // (they may remain in a collapsed PROVIDER_DEFS_ADVANCED section which is hidden by default)
  const BANNED_IN_PRIMARY_UI = [
    'Anthropic',
    'Cohere',
    'Mistral',
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

  for (const provider of APPROVED_PROVIDERS) {
    it(`settings page references approved provider: ${provider}`, () => {
      expect(src).toContain(provider)
    })
  }

  for (const provider of BANNED_IN_PRIMARY_UI) {
    it(`settings page does not show unsupported provider in primary section: ${provider}`, () => {
      // Extract only PROVIDER_DEFS_PRIMARY block to avoid flagging advanced section
      const primaryBlock = src.match(/const PROVIDER_DEFS_PRIMARY\s*=\s*\[[\s\S]*?\]/)
      if (primaryBlock) {
        expect(primaryBlock[0]).not.toContain(provider)
      } else {
        // If we can't find the block, fall back to checking the whole file
        // only flag if the advanced section doesn't exist to indicate legacy code
        if (!src.includes(`PROVIDER_DEFS_ADVANCED`)) {
          expect(src).not.toContain(provider)
        }
      }
    })
  }
})

// ── 9. Unfinished modules not marked Working without proof ──────────────────

describe('Unfinished modules — truthful status only', () => {
  const PAGES_TO_CHECK: Array<{ page: string; notWorking: boolean }> = [
    { page: 'memory/page.tsx', notWorking: true },
    { page: 'actions/page.tsx', notWorking: true },
    { page: 'amarktai-assistant/page.tsx', notWorking: true },
  ]

  for (const { page, notWorking } of PAGES_TO_CHECK) {
    if (notWorking) {
      it(`${page} does not claim backend is Working without proof`, () => {
        const src = readPage(page)
        // Should not have hardcoded 'Working' status badge as default/primary
        const hasHardcodedWorking = src.includes("status='Working'") || src.includes('status="Working"')
        expect(hasHardcodedWorking).toBe(false)
      })
    }
  }

  it('command-center module cards do not have all modules as Working', () => {
    const src = readPage('command-center/page.tsx')
    // Should have at least one non-Working state in the modules array
    const hasNonWorking = src.includes('Ready to wire') || src.includes('Backend pending') || src.includes('Needs key')
    expect(hasNonWorking).toBe(true)
  })
})

// ── 10. Page existence checks ──────────────────────────────────────────────

describe('All 11 canonical section pages exist', () => {
  const canonicalPages = [
    'command-center/page.tsx',
    'amarktai-assistant/page.tsx',
    'apps/page.tsx',
    'agents/page.tsx',
    'repo-workbench/page.tsx',
    'research/page.tsx',
    'creative-studio/page.tsx',
    'memory/page.tsx',
    'actions/page.tsx',
    'diagnostics/page.tsx',
    'settings/page.tsx',
  ]

  for (const page of canonicalPages) {
    it(`${page} exists and is non-empty`, () => {
      const fullPath = path.join(ROOT, page)
      expect(fs.existsSync(fullPath)).toBe(true)
      expect(fs.readFileSync(fullPath, 'utf-8').length).toBeGreaterThan(100)
    })
  }
})
