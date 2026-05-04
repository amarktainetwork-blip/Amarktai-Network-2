/**
 * Public Website Foundation Tests
 *
 * Asserts that the public-facing website:
 * - Does not expose internal CTA ("Enter workspace")
 * - Does not use GenX as public-facing branding story
 * - Does not expose API or Login in public nav
 * - Contains required brand and concept keywords
 * - Request Access is the only primary public CTA
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../app')

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

const homePage   = read('page.tsx')
const aboutPage  = read('about/page.tsx')
const appsPage   = read('apps/page.tsx')
const contactPage = read('contact/page.tsx')
const headerSrc  = fs.readFileSync(path.resolve(__dirname, '../../components/layout/Header.tsx'), 'utf-8')
const footerSrc  = fs.readFileSync(path.resolve(__dirname, '../../components/layout/Footer.tsx'), 'utf-8')

// ── No "Enter workspace" on public pages ─────────────────────────────────────

describe('No "Enter workspace" CTA on public pages', () => {
  it('homepage does not contain "Enter workspace"', () => {
    expect(homePage).not.toContain('Enter workspace')
  })

  it('about page does not contain "Enter workspace"', () => {
    expect(aboutPage).not.toContain('Enter workspace')
  })

  it('apps page does not contain "Enter workspace"', () => {
    expect(appsPage).not.toContain('Enter workspace')
  })

  it('contact page does not contain "Enter workspace"', () => {
    expect(contactPage).not.toContain('Enter workspace')
  })

  it('header does not contain "Enter workspace"', () => {
    expect(headerSrc).not.toContain('Enter workspace')
  })
})

// ── GenX not used as public story ────────────────────────────────────────────

describe('GenX not used as public-facing brand story', () => {
  it('homepage does not use GenX as a headline or brand story', () => {
    // GenX can appear in admin-only code, not in public homepage copy
    expect(homePage).not.toMatch(/GenX/i)
  })

  it('about page does not use GenX as a brand story', () => {
    expect(aboutPage).not.toMatch(/GenX/i)
  })

  it('apps page does not use GenX as a brand story', () => {
    expect(appsPage).not.toMatch(/GenX/i)
  })

  it('public header does not mention GenX', () => {
    expect(headerSrc).not.toMatch(/GenX/i)
  })

  it('footer does not mention GenX', () => {
    expect(footerSrc).not.toMatch(/GenX/i)
  })
})

// ── Public nav does not contain API or Login ─────────────────────────────────

describe('Public nav does not expose API or Login', () => {
  it('header nav does not include an API link', () => {
    // The navLinks array must not have a link with label 'API'
    expect(headerSrc).not.toContain("label: 'API'")
    expect(headerSrc).not.toContain('label: "API"')
  })

  it('header does not have a visible Login link in nav', () => {
    // login should only appear in the hidden/revealed section (loginRevealed gate)
    // but NOT as a regular nav item visible to all
    const navLinksBlock = headerSrc.match(/const navLinks\s*=\s*\[[\s\S]*?\]/)
    expect(navLinksBlock?.[0] ?? '').not.toContain('Login')
    expect(navLinksBlock?.[0] ?? '').not.toContain('/admin/login')
  })

  it('footer does not include API docs link', () => {
    expect(footerSrc).not.toContain('API Reference')
    expect(footerSrc).not.toContain('/docs')
  })
})

// ── Homepage contains required brand concepts ─────────────────────────────────

describe('Homepage contains required brand and concept keywords', () => {
  it('homepage contains "Aiva"', () => {
    expect(homePage).toContain('Aiva')
  })

  it('homepage contains "Amarktai Network"', () => {
    expect(homePage).toContain('Amarktai Network')
  })

  it('homepage contains not-a-chatbot / command network concept', () => {
    const hasCommandNetwork = homePage.includes('command network') || homePage.includes('command layer') || homePage.includes('coordinates')
    expect(hasCommandNetwork).toBe(true)
  })

  it('homepage contains self-learning or learning loop concept', () => {
    const hasLearning = homePage.includes('Learn') || homePage.includes('memory') || homePage.includes('self-learning')
    expect(hasLearning).toBe(true)
  })

  it('homepage contains self-healing or diagnostics concept', () => {
    const hasHeal = homePage.includes('Heal') || homePage.includes('detect') || homePage.includes('diagnostic')
    expect(hasHeal).toBe(true)
  })

  it('homepage contains self-secure or approval-gated concept', () => {
    const hasSecure = homePage.includes('Secure') || homePage.includes('approval') || homePage.includes('gated')
    expect(hasSecure).toBe(true)
  })

  it('homepage contains agents', () => {
    expect(homePage.toLowerCase()).toContain('agent')
  })

  it('homepage contains memory', () => {
    expect(homePage.toLowerCase()).toContain('memory')
  })

  it('homepage contains Repo Workbench', () => {
    expect(homePage).toContain('Repo Workbench')
  })

  it('homepage contains Researcher or App Discovery concept', () => {
    const hasDiscovery = homePage.includes('Researcher') || homePage.includes('App Discovery') || homePage.includes('discover')
    expect(hasDiscovery).toBe(true)
  })

  it('homepage contains Creative Studio or media concept', () => {
    const hasCreative = homePage.includes('Creative studio') || homePage.includes('creative') || homePage.includes('Creative Studio') || homePage.includes('media')
    expect(hasCreative).toBe(true)
  })

  it('homepage contains Request Access CTA', () => {
    expect(homePage).toContain('Request Access')
  })
})

// ── Public pages compile (file existence checks) ──────────────────────────────

describe('Public pages compile (exist and are non-empty)', () => {
  const publicPages = [
    'page.tsx',
    'about/page.tsx',
    'apps/page.tsx',
    'contact/page.tsx',
  ]

  for (const page of publicPages) {
    it(`${page} exists and is non-empty`, () => {
      const fullPath = path.join(ROOT, page)
      expect(fs.existsSync(fullPath)).toBe(true)
      expect(fs.readFileSync(fullPath, 'utf-8').length).toBeGreaterThan(100)
    })
  }

  it('Header.tsx exists and is non-empty', () => {
    const fullPath = path.resolve(__dirname, '../../components/layout/Header.tsx')
    expect(fs.existsSync(fullPath)).toBe(true)
    expect(fs.readFileSync(fullPath, 'utf-8').length).toBeGreaterThan(100)
  })

  it('Footer.tsx exists and is non-empty', () => {
    const fullPath = path.resolve(__dirname, '../../components/layout/Footer.tsx')
    expect(fs.existsSync(fullPath)).toBe(true)
    expect(fs.readFileSync(fullPath, 'utf-8').length).toBeGreaterThan(100)
  })

  it('AivaNetworkGraph.tsx exists', () => {
    const fullPath = path.resolve(__dirname, '../../components/visual/AivaNetworkGraph.tsx')
    expect(fs.existsSync(fullPath)).toBe(true)
  })
})

// ── Request Access is primary public CTA ─────────────────────────────────────

describe('Request Access is the primary public CTA', () => {
  it('homepage has Request Access link', () => {
    expect(homePage).toContain('Request Access')
    expect(homePage).toContain('/contact')
  })

  it('homepage does not have admin/login as a public CTA button', () => {
    // admin/login must not appear as a primary button href on homepage
    // (it can only appear as a hidden reveal link in the header)
    const homePageAdminLinks = homePage.match(/href="\/admin\/login"/g) ?? []
    expect(homePageAdminLinks).toHaveLength(0)
  })

  it('about page has Request Access link', () => {
    expect(aboutPage).toContain('Request Access')
  })

  it('apps page has Request Access link', () => {
    expect(appsPage).toContain('Request Access')
  })
})
