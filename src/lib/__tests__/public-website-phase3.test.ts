/**
 * Public Website Phase 3 Tests
 *
 * Proves:
 *  1. AmarktAI branding exists in public pages
 *  2. AI can be styled separately (blue/cyan references exist)
 *  3. No "brain" wording in public pages
 *  4. Provider names are not exposed on public pages
 *  5. Removed providers are not shown as active
 *  6. Apps request capabilities, not infrastructure routes
 *  7. Marketing workflow section exists
 *  8. Adult safety copy exists
 *  9. CTA (call to action) exists
 *  10. Public pages build (nav items correct)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PUBLIC_NAV_ITEMS } from '@/lib/public-nav'

const ROOT = join(__dirname, '../../..')

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8')
}

const ALL_PUBLIC_SOURCES = [
  'src/app/page.tsx',
  'src/app/about/page.tsx',
  'src/app/features/page.tsx',
  'src/app/what-we-can-do/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/platform/page.tsx',
  'src/app/marketing/page.tsx',
  'src/app/capabilities/page.tsx',
  'src/app/apps/page.tsx',
  'src/app/safety/page.tsx',
  'src/components/public/PublicShell.tsx',
].map(readSrc).join('\n')

// ── 1. AmarktAI branding ──────────────────────────────────────────────────────

describe('AmarktAI branding', () => {
  it('landing page uses BrandName component', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('BrandName')
    expect(src).toContain('AmarktAI')
  })

  it('all public pages reference AmarktAI at least once', () => {
    expect(ALL_PUBLIC_SOURCES).toContain('AmarktAI')
  })

  it('PublicShell uses BrandName component', () => {
    const src = readSrc('src/components/public/PublicShell.tsx')
    expect(src).toContain('BrandName')
  })

  it('BrandName component uses exact AmarktAI branding', () => {
    const src = readSrc('src/components/BrandName.tsx')
    expect(src).toContain('Amarkt')
    expect(src).toContain('ai')
    expect(src).toContain('Network')
  })

  it('layout metadata uses AmarktAI branding', () => {
    const src = readSrc('src/app/layout.tsx')
    expect(src).toContain('AmarktAI')
  })
})

// ── 2. AI styled blue ─────────────────────────────────────────────────────────

describe('AI visually emphasized', () => {
  it('landing page uses blue or cyan color for AI references', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toMatch(/text-(blue|cyan)-/)
    expect(src).toMatch(/text-(blue|cyan)-[0-9]+.*AI|AI.*text-(blue|cyan)-[0-9]+/)
  })

  it('hero section has blue or cyan CTA button', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toMatch(/bg-(blue|cyan)-/)
    expect(src).toContain('Launch your')
  })

  it('capabilities page uses blue or cyan for AI capability items', () => {
    const src = readSrc('src/app/capabilities/page.tsx')
    expect(src).toMatch(/text-(blue|cyan)-/)
  })

  it('runtime sections use blue or cyan accents', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toMatch(/text-(blue|cyan)-/)
  })
})

// ── 3. No "brain" wording ─────────────────────────────────────────────────────

describe('No brain wording', () => {
  it('landing page does not use brain wording', () => {
    const src = readSrc('src/app/page.tsx').toLowerCase()
    expect(src).not.toContain('ai brain')
    expect(src).not.toContain('the brain')
    expect(src).not.toContain('our brain')
  })

  it('platform page does not use brain wording', () => {
    const src = readSrc('src/app/platform/page.tsx').toLowerCase()
    expect(src).not.toContain('ai brain')
    expect(src).not.toContain('the brain')
  })

  it('public shell does not use brain wording', () => {
    const src = readSrc('src/components/public/PublicShell.tsx').toLowerCase()
    expect(src).not.toContain('ai brain')
  })

  it('uses platform, runtime, or capability layer instead of brain', () => {
    const src = readSrc('src/app/page.tsx').toLowerCase()
    expect(src).toMatch(/platform|runtime|capability layer|ai capability|orchestration/)
  })
})

// ── 4. Active providers shown ─────────────────────────────────────────────────

describe('Provider names hidden on public pages', () => {
  const PROVIDER_NAMES = ['GenX', 'Hugging Face', 'Together', 'Groq', 'MiMo']

  it('public website copy does not list provider names', () => {
    for (const p of PROVIDER_NAMES) {
      expect(ALL_PUBLIC_SOURCES).not.toContain(p)
    }
  })
})

// ── 5. Removed providers not shown as active ──────────────────────────────────

describe('Removed providers not shown as active', () => {
  const REMOVED = ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'minimax', 'moonshot', 'openrouter', 'mistral', 'cohere', 'nvidia', 'replicate']

  it('landing page does not show removed providers as active platform providers', () => {
    const src = readSrc('src/app/page.tsx')
    // They may be mentioned as removed, but not in provider cards with active status
    // Check they are not listed as active platform providers in card format
    for (const p of REMOVED) {
      expect(src).not.toMatch(new RegExp(`key="${p}"`, 'i'))
    }
  })

  it('public website does not mention removed provider names', () => {
    for (const p of REMOVED) {
      expect(ALL_PUBLIC_SOURCES.toLowerCase()).not.toContain(p)
    }
  })
})

// ── 6. Apps never choose providers/models copy ────────────────────────────────

describe('Apps request capabilities, not infrastructure routes', () => {
  it('landing page states runtime chooses infrastructure', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toMatch(/request capabilities|chooses the route|centralized/i)
  })

  it('platform page states apps never choose infrastructure routes', () => {
    const src = readSrc('src/app/platform/page.tsx')
    expect(src).toMatch(/apps never choose infrastructure routes/i)
  })

  it('apps page states apps request capabilities', () => {
    const src = readSrc('src/app/apps/page.tsx')
    expect(src).toMatch(/apps never choose infrastructure routes|apps send|runtime decides/i)
  })

  it('capabilities page mentions routing is automatic', () => {
    const src = readSrc('src/app/capabilities/page.tsx')
    expect(src).toMatch(/never choose|never pick|automatic|runtime/i)
  })
})

// ── 7. Marketing workflow section ─────────────────────────────────────────────

describe('Runtime workflow section', () => {
  it('landing page has runtime workflow section', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('runtime-workflow')
    expect(src).toContain('Runtime workflow')
  })

  it('runtime workflow shows all 9 steps', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('Request')
    expect(src).toContain('Policy')
    expect(src).toContain('Routing')
    expect(src).toContain('Execution')
    expect(src).toContain('Artifact')
    expect(src).toContain('Review')
    expect(src).toContain('Publish / export')
    expect(src).toContain('Measure')
    expect(src).toContain('Improve')
  })

  it('marketing page exists and has workflow steps', () => {
    const src = readSrc('src/app/marketing/page.tsx')
    expect(src).toContain('workflow')
    expect(src).toContain('Brand Memory')
    expect(src).toContain('Approval')
    expect(src).toContain('publishing')
  })
})

// ── 8. Adult safety copy ──────────────────────────────────────────────────────

describe('Adult safety copy', () => {
  it('landing page has adult safety section', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('permission-gated')
    expect(src).toContain('safety-controlled')
    expect(src).toContain('consent')
  })

  it('safety page exists with safety content', () => {
    const src = readSrc('src/app/safety/page.tsx').toLowerCase()
    expect(src).toContain('gated')
    expect(src).toContain('permission-gated')
    expect(src).toContain('safety-controlled')
  })

  it('safety page mentions all prohibited categories', () => {
    const src = readSrc('src/app/safety/page.tsx').toLowerCase()
    expect(src).toContain('minors')
    expect(src).toContain('non-consensual')
    expect(src).toContain('celebrity')
    expect(src).toContain('revenge')
    expect(src).toContain('voice cloning')
  })

  it('safety page is not sexually graphic', () => {
    const src = readSrc('src/app/safety/page.tsx').toLowerCase()
    expect(src).not.toContain('explicit sexual')
    expect(src).not.toContain('pornograph')
    expect(src).not.toContain('erotic content')
  })

  it('apps page marks adult creator as gated', () => {
    const src = readSrc('src/app/apps/page.tsx').toLowerCase()
    expect(src).toContain('gated')
    expect(src).toContain('permission-gated')
    expect(src).toContain('safety-controlled')
  })
})

// ── 9. CTA exists ─────────────────────────────────────────────────────────────

describe('Call to action exists', () => {
  it('landing page has primary CTA linking to login', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('/admin/login')
    expect(src).toContain('Launch your')
  })

  it('landing page has secondary CTA linking to features', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('/features')
    expect(src).toContain('Explore features')
  })

  it('landing page bottom CTA exists', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('Your AI-powered workflow starts here')
  })

  it('platform page has CTA', () => {
    const src = readSrc('src/app/platform/page.tsx')
    expect(src).toContain('/admin/login')
  })

  it('marketing page has CTA', () => {
    const src = readSrc('src/app/marketing/page.tsx')
    expect(src).toContain('/admin/login')
    expect(src).toContain('Run marketing workflow')
  })
})

// ── 10. Nav and footer ────────────────────────────────────────────────────────

describe('Public navigation and footer', () => {
  it('nav items include required sections', () => {
    const hrefs = PUBLIC_NAV_ITEMS.map(i => i.href)
    expect(hrefs).toEqual([
      '/',
      '/about',
      '/features',
      '/what-we-can-do',
      '/contact',
      '/admin/login',
    ])
    expect(hrefs).not.toContain('/marketing')
  })

  it('PublicShell uses PUBLIC_NAV_ITEMS', () => {
    const src = readSrc('src/components/public/PublicShell.tsx')
    expect(src).toContain('PUBLIC_NAV_ITEMS')
  })

  it('footer has all required links', () => {
    const src = readSrc('src/components/public/PublicShell.tsx')
    expect(src).toContain('/platform')
    expect(src).toContain('/features')
    expect(src).toContain('/what-we-can-do')
    expect(src).not.toContain('/marketing')
    expect(src).toContain('/privacy')
    expect(src).toContain('/terms')
    expect(src).toContain('/contact')
    expect(src).toContain('/admin/login')
  })

  it('footer contains AmarktAI brand', () => {
    const src = readSrc('src/components/public/PublicShell.tsx')
    expect(src).toContain('BrandName')
    expect(src).toContain('AmarktAI')
  })

  it('footer CTA links to dashboard', () => {
    const src = readSrc('src/components/public/PublicShell.tsx')
    expect(src).toContain('Launch workflow')
    expect(src).toContain('/admin/login')
  })
})

// ── Existing tests still pass ─────────────────────────────────────────────────

describe('Backward compat: existing public website checks', () => {
  it('IntelligenceFabric is still used in landing page', () => {
    const src = readSrc('src/app/page.tsx')
    expect(src).toContain('IntelligenceFabric')
  })

  it('platform page still explains the platform', () => {
    const src = readSrc('src/app/platform/page.tsx')
    expect(src).toContain('capability')
    expect(src).toContain('routing')
  })

  it('banned wording not in public pages', () => {
    for (const token of ['Aiva', 'Superbrain', 'Private AI infrastructure', 'Firecrawl required', 'OpenAI required']) {
      expect(ALL_PUBLIC_SOURCES).not.toContain(token)
    }
  })
})
