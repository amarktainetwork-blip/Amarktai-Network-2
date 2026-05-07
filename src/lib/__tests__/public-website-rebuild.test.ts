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

describe('public website rebuild', () => {
  it('public pages render from one shared website shell', () => {
    for (const page of PUBLIC_PAGES) {
      const source = read(page)
      expect(source, page).toContain('PublicShell')
    }
  })

  it('homepage is rebuilt with new flagship sections', () => {
    const source = read('app/page.tsx')
    expect(source).toContain('self-learning superbrain')
    expect(source).toContain('Living Superbrain')
    expect(source).toContain('Amarktai Assistant')
    expect(source).toContain('Prompt')
    expect(source).toContain('Deploy')
  })

  it('hidden login behavior is preserved with typed login reveal', () => {
    const source = read('components/public/PublicShell.tsx')
    expect(source).toContain("includes('login')")
    expect(source).toContain('/admin/login')
    expect(source).toContain('Restricted panel')
  })

  it('public pages have no visible auth/admin/dashboard CTA', () => {
    for (const page of PUBLIC_PAGES) {
      const source = read(page)
      expect(source, page).not.toContain('/admin/login')
      expect(source, page).not.toContain('/admin/dashboard')
      expect(source, page).not.toContain('Operator Login')
    }
  })

  it('public sources do not contain retired or internal public branding', () => {
    const files = [...PUBLIC_PAGES, 'components/public/PublicShell.tsx', 'components/public/SuperbrainScene.tsx']
    for (const file of files) {
      const source = read(file)
      expect(source, file).not.toContain('Aiva')
      expect(source, file).not.toContain('GenX')
      expect(source, file).not.toContain('Powered by GenX')
    }
  })

  it('old public components and duplicate landing route are removed', () => {
    const removed = [
      'components/layout/Header.tsx',
      'components/layout/Footer.tsx',
      'components/EcosystemNetwork.tsx',
      'components/LivingCore.tsx',
      'components/visual/NetworkPulseBackground.tsx',
      'components/voice/VoiceAccessVisualizer.tsx',
      'app/about-amarktai-network/page.tsx',
    ]
    for (const rel of removed) {
      expect(fs.existsSync(path.join(ROOT, rel)), rel).toBe(false)
    }
  })

  it('dashboard routes still exist and remain separate from public implementation', () => {
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
    }
    const dashboard = read('app/admin/dashboard/page.tsx')
    expect(dashboard).toContain('AmarktAI Assistant')
    expect(dashboard).not.toContain('PublicShell')
  })
})
