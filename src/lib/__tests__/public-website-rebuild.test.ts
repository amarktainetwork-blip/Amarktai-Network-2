import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../../')
const REPO = path.resolve(ROOT, '../')

const PUBLIC_PAGES = [
  'app/page.tsx',
  'app/about/page.tsx',
  'app/platform/page.tsx',
  'app/network-apps/page.tsx',
  'app/contact/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
]

const PUBLIC_FILES = [
  ...PUBLIC_PAGES,
  'components/public/PublicShell.tsx',
  'components/public/IntelligenceFabric.tsx',
  'app/globals.css',
  'app/layout.tsx',
]

function readFromSrc(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function readFromRepo(rel: string) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8')
}

describe('premium public website reset', () => {
  it('public routes render from one shared shell', () => {
    for (const page of PUBLIC_PAGES) {
      expect(readFromSrc(page), page).toContain('PublicShell')
    }
  })

  it('homepage contains the required product explanation sections', () => {
    const source = readFromSrc('app/page.tsx')
    const lower = source.toLowerCase()

    for (const token of [
      'intelligencefabric',
      'what amarktai network is',
      'one command window',
      'connected apps',
      'create media, apps, and workflows',
      'work on repos and prs',
      'runtime truth',
      'private access',
    ]) {
      expect(lower, token).toContain(token)
    }

    for (const stage of ['plan', 'build', 'launch', 'monitor', 'improve']) {
      expect(lower, stage).toContain(stage)
    }
  })

  it('architecture animation explains the system rather than showing decorative AI art', () => {
    const source = readFromSrc('components/public/IntelligenceFabric.tsx').toLowerCase()

    for (const token of [
      'apps',
      'media',
      'core os',
      'agents',
      'memory',
      'runtime truth',
      'stream',
      'resizeobserver',
      'prefers-reduced-motion',
      'ismobile',
      'visibilitychange',
      'devicepixelratio',
    ]) {
      expect(source, token).toContain(token)
    }

    for (const rejected of ['particlefield', 'superbrain', 'glowing brain', 'blob']) {
      expect(source, rejected).not.toContain(rejected)
    }
  })

  it('public pages expose only the requested login entry', () => {
    const forbidden = [
      'type login',
      'sign in',
      'sign up',
      'request access',
      'access portal',
      'open secure login',
      'restricted panel',
      '/admin/dashboard',
      'operator login',
      'keyboard hint',
      'secret command',
      'get started',
      'get access',
    ]

    for (const page of PUBLIC_PAGES) {
      const source = readFromSrc(page).toLowerCase()
      for (const token of forbidden) {
        expect(source, `${page} -> ${token}`).not.toContain(token)
      }
    }
  })

  it('login is an explicit real route without a hidden keyboard trigger', () => {
    const shell = readFromSrc('components/public/PublicShell.tsx')
    expect(shell).toContain("{ href: '/admin/login', label: 'Login' }")
    expect(shell).not.toContain("includes('login')")
    expect(shell).not.toContain('useRouter')
  })

  it('retired public branding and rejected visual language are absent', () => {
    const retiredAssistant = String.fromCharCode(65, 105, 118, 97)
    const forbidden = [
      retiredAssistant,
      'Superbrain',
      'superbrain',
      'GenX',
      'AI magic',
      'neon toy',
      'glowing brain',
      'floating random circles',
      'childish particles',
    ]

    for (const file of PUBLIC_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)))) {
      const source = readFromSrc(file)
      for (const token of forbidden) {
        expect(source, `${file} -> ${token}`).not.toContain(token)
      }
    }
  })

  it('public implementation keeps one source of truth in components/public', () => {
    const files = fs.readdirSync(path.join(ROOT, 'components/public')).sort()
    expect(files).toEqual(['IntelligenceFabric.tsx', 'PublicShell.tsx'])
  })

  it('mobile and reduced-motion safeguards are present', () => {
    const animation = readFromSrc('components/public/IntelligenceFabric.tsx')
    const css = readFromSrc('app/globals.css')
    expect(animation).toContain('Math.min(window.devicePixelRatio || 1, 2)')
    expect(animation).toContain('width < 720')
    expect(animation).toContain('cancelAnimationFrame')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('overflow-x: hidden')
  })

  it('dashboard pages remain separate from the public shell and animation', () => {
    const dashboardFiles = [
      'app/admin/dashboard/page.tsx',
      'app/admin/dashboard/workbench/page.tsx',
      'app/admin/dashboard/apps-agents/page.tsx',
      'app/admin/dashboard/memory-learning/page.tsx',
      'app/admin/dashboard/operations/page.tsx',
      'app/admin/dashboard/settings/page.tsx',
    ]

    for (const file of dashboardFiles) {
      const source = readFromSrc(file)
      expect(source, file).not.toContain('PublicShell')
      expect(source, file).not.toContain('IntelligenceFabric')
    }
  })

  it('final audit documentation exists', () => {
    expect(fs.existsSync(path.join(REPO, 'docs/audits/FINAL_PREMIUM_PUBLIC_WEBSITE.md'))).toBe(true)
    const doc = readFromRepo('docs/audits/FINAL_PREMIUM_PUBLIC_WEBSITE.md')
    expect(doc).toContain('Animation architecture')
    expect(doc).toContain('Dashboard untouched')
  })
})
