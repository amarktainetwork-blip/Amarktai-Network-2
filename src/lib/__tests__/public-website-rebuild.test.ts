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

describe('public website rebuild — cinematic command constellation', () => {
  it('public pages render from one shared website shell', () => {
    for (const page of PUBLIC_PAGES) {
      const source = read(page)
      expect(source, page).toContain('PublicShell')
    }
  })

  it('homepage is rebuilt with cinematic command constellation sections', () => {
    const source = read('app/page.tsx')
    expect(source).toContain('CommandConstellationScene')
    expect(source).toContain('Command Layer')
    expect(source).toContain('Amarktai Assistant')
    expect(source).toContain('Prompt')
    expect(source).toContain('Deploy')
    expect(source).toContain('Workbench')
    expect(source).toContain('Operations')
  })

  it('homepage does not contain old superbrain branding', () => {
    const source = read('app/page.tsx')
    expect(source).not.toContain('superbrain')
    expect(source).not.toContain('Superbrain')
    expect(source).not.toContain('Living Superbrain')
    expect(source).not.toContain('self-learning superbrain')
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
    const files = [
      ...PUBLIC_PAGES,
      'components/public/PublicShell.tsx',
      'components/public/CommandConstellationScene.tsx',
    ]
    const retiredName = String.fromCharCode(65, 105, 118, 97) // retired assistant name (char codes only)
    for (const file of files) {
      const source = read(file)
      expect(source, file).not.toContain(retiredName)
      expect(source, file).not.toContain('GenX')
      expect(source, file).not.toContain('Powered by GenX')
      expect(source, file).not.toContain('superbrain')
      expect(source, file).not.toContain('Superbrain')
    }
  })

  it('old SuperbrainScene component is removed and CommandConstellationScene replaces it', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/public/SuperbrainScene.tsx'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'components/public/CommandConstellationScene.tsx'))).toBe(true)
    const scene = read('components/public/CommandConstellationScene.tsx')
    expect(scene).toContain('CommandConstellationScene')
    expect(scene).not.toContain('superbrain')
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
      'components/public/SuperbrainScene.tsx',
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
    expect(dashboard).toContain('export default function StudioPage')
    expect(dashboard).not.toContain('PublicShell')
  })
})
