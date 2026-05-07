import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../../')

const PUBLIC_PAGES = [
  'app/page.tsx',
  'app/about/page.tsx',
  'app/apps/page.tsx',
  'app/docs/page.tsx',
  'app/contact/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
]

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

describe('public website hard reset', () => {
  it('public routes render from one shared implementation shell', () => {
    for (const page of PUBLIC_PAGES) {
      const source = read(page)
      expect(source, page).toContain('PublicShell')
    }
  })

  it('homepage uses the new intelligence fabric architecture and required sections', () => {
    const source = read('app/page.tsx')
    const lower = source.toLowerCase()
    expect(source).toContain('IntelligenceFabric')
    expect(lower).toContain('input')
    expect(lower).toContain('routing')
    expect(lower).toContain('agent')
    expect(lower).toContain('memory')
    expect(lower).toContain('artifact')
    expect(lower).toContain('approval')
    expect(lower).toContain('deployment')
    expect(source).toContain('Workbench')
    expect(source).toContain('Studio')
    expect(source).toContain('Amarktai Assistant')
  })

  it('public pages contain no visible login/admin/dashboard access CTAs or hints', () => {
    const forbidden = [
      'type login',
      'sign in',
      'sign up',
      'request access',
      'access portal',
      'open secure login',
      'restricted panel',
      '/admin/login',
      '/admin/dashboard',
      'operator login',
      'keyboard hint',
      'secret command',
    ]

    for (const page of PUBLIC_PAGES) {
      const source = read(page).toLowerCase()
      for (const token of forbidden) {
        expect(source, `${page} -> ${token}`).not.toContain(token)
      }
    }

    const shell = read('components/public/PublicShell.tsx').toLowerCase()
    expect(shell).not.toContain('open secure login')
    expect(shell).not.toContain('restricted panel')
    expect(shell).not.toContain('type login')
  })

  it('public website source removes retired branding and rejected wording', () => {
    const files = [
      ...PUBLIC_PAGES,
      'components/public/PublicShell.tsx',
      'components/public/IntelligenceFabric.tsx',
    ]
    const retiredName = String.fromCharCode(65, 105, 118, 97) // "Aiva" without direct literal text

    for (const file of files) {
      const source = read(file)
      expect(source, file).not.toContain(retiredName)
      expect(source, file).not.toContain('Superbrain')
      expect(source, file).not.toContain('superbrain')
      expect(source, file).not.toContain('GenX')
      expect(source, file).not.toContain('AI magic')
    }
  })

  it('hidden login trigger behavior remains in code without public hint copy', () => {
    const shell = read('components/public/PublicShell.tsx')
    expect(shell).toContain("includes('login')")
    expect(shell).toContain("router.push('/admin/login')")
  })

  it('old public components and stale public implementations are removed', () => {
    const removed = [
      'components/public/CommandConstellationScene.tsx',
      'components/public/PublicSection.tsx',
      'components/public/SuperbrainScene.tsx',
      'app/about-amarktai-network/page.tsx',
      'components/layout/Header.tsx',
      'components/layout/Footer.tsx',
      'components/EcosystemNetwork.tsx',
      'components/LivingCore.tsx',
      'components/visual/NetworkPulseBackground.tsx',
      'components/voice/VoiceAccessVisualizer.tsx',
    ]

    for (const rel of removed) {
      expect(fs.existsSync(path.join(ROOT, rel)), rel).toBe(false)
    }
  })

  it('public implementation has one source of truth in components/public', () => {
    const publicDir = path.join(ROOT, 'components/public')
    const files = fs.readdirSync(publicDir).sort()
    expect(files).toEqual(['IntelligenceFabric.tsx', 'PublicShell.tsx'])
  })

  it('dashboard files still exist and remain separate from public site', () => {
    const requiredDashboardFiles = [
      'app/admin/dashboard/page.tsx',
      'app/admin/dashboard/workbench/page.tsx',
      'app/admin/dashboard/apps-agents/page.tsx',
      'app/admin/dashboard/memory-learning/page.tsx',
      'app/admin/dashboard/operations/page.tsx',
      'app/admin/dashboard/settings/page.tsx',
      'app/admin/login/page.tsx',
    ]

    for (const file of requiredDashboardFiles) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true)
      const source = read(file)
      expect(source).not.toContain('PublicShell')
      expect(source).not.toContain('IntelligenceFabric')
    }

    const dashboardRoot = read('app/admin/dashboard/page.tsx')
    expect(dashboardRoot).toContain('export default function StudioPage')
  })
})
