import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const ROOT = process.cwd()
const PUBLIC_FILES = [
  'src/app/page.tsx',
  'src/app/platform/page.tsx',
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/components/public/PublicShell.tsx',
]
const REQUIRED_ROUTES = [
  'src/app/admin/login/page.tsx',
  'src/app/admin/dashboard/command/page.tsx',
  'src/app/admin/dashboard/studio/page.tsx',
  'src/app/admin/dashboard/capabilities/page.tsx',
  'src/app/admin/dashboard/connected-apps/page.tsx',
  'src/app/admin/dashboard/artifacts/page.tsx',
  'src/app/admin/dashboard/jobs/page.tsx',
  'src/app/admin/dashboard/settings/page.tsx',
]
const REMOVED_V2_ROUTES = [
  'app-builder',
  'workbench',
  'workspace',
  'provider-mesh',
  'model-universe',
  'operations',
  'outputs',
  'jobs-approvals',
  'avatar-voice',
  'memory-learning',
  'network-apps',
]
const PUBLIC_PROVIDER_NAMES = [
  'GenX',
  'Hugging Face',
  'Qwen',
  'DashScope',
  'Wan',
  'MiMo',
  'Groq',
  'Together AI',
]

function source(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

describe('V1 AmarktAI product truth', () => {
  it('renders the canonical brand with AI separately stylable', () => {
    const brand = source('src/components/BrandName.tsx')
    expect(brand).toContain('Amarkt<span')
    expect(brand).toContain('>AI</span>')
    expect(brand).toContain('text-cyan-400')
    expect(brand).toContain('AmarktAI Network')
    expect(brand).not.toContain('>ai</span>')
  })

  it('contains no incorrectly cased user-facing AmarktAI brand', () => {
    const files = [
      ...PUBLIC_FILES,
      'src/app/admin/login/page.tsx',
      'src/app/admin/dashboard/layout.tsx',
      'src/components/dashboard/CommandCenter.tsx',
    ]
    for (const file of files) {
      expect(source(file), file).not.toMatch(/\bAmarktai\b|\bAmarkt AI\b/)
    }
  })

  it('does not market infrastructure providers or V2 products publicly', () => {
    const publicCorpus = PUBLIC_FILES.map(source).join('\n')
    for (const provider of PUBLIC_PROVIDER_NAMES) {
      expect(publicCorpus, provider).not.toContain(provider)
    }
    for (const product of ['Repo Workbench', 'App Builder', 'MCP', 'provider marketplace']) {
      expect(publicCorpus, product).not.toContain(product)
    }
  })

  it('uses exactly the approved V1 dashboard navigation', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Command Center',
      'Create Studio',
      'Projects & Brand Kits',
      'Avatar Library',
      'Music Studio',
      'Jobs',
      'Artifacts',
      'Connected Apps',
      'Settings',
    ])
    expect(new Set(DASHBOARD_NAV_ITEMS.map((item) => item.href)).size).toBe(9)
  })

  it('keeps every required V1 route and removes legacy page routes', () => {
    for (const file of REQUIRED_ROUTES) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true)
    }
    for (const route of REMOVED_V2_ROUTES) {
      expect(
        fs.existsSync(path.join(ROOT, 'src/app/admin/dashboard', route, 'page.tsx')),
        route,
      ).toBe(false)
    }
    expect(fs.existsSync(path.join(ROOT, 'src/app/voice-access/page.tsx'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'src/app/api/admin/voice-access-settings/route.ts'))).toBe(false)
  })

  it('has one dashboard shell and no duplicate dashboard hierarchy', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/app/admin/dashboard/layout.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ROOT, 'src/components/dashboard/DashboardShell.tsx'))).toBe(false)
    expect(source('src/app/admin/dashboard/layout.tsx')).toContain('DASHBOARD_NAV_ITEMS.map')
  })

  it('shows registered connected apps only and no fake cards', () => {
    const page = source('src/app/admin/dashboard/connected-apps/page.tsx')
    const client = source('src/app/admin/dashboard/connected-apps/ConnectedAppsClient.tsx')
    expect(page).toContain('listConnectedApps()')
    expect(client).toContain('No apps registered yet.')
    expect(client).not.toMatch(/Amarktai (Crypto|Travel|Marketing|Online)/)
    expect(fs.existsSync(path.join(ROOT, 'src/lib/network-apps-registry.ts'))).toBe(false)
  })

  it('keeps Studio and Command Center capability-first', () => {
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    const command = source('src/components/dashboard/CommandCenter.tsx')
    for (const file of [studio, command]) {
      expect(file).not.toContain('Model override')
      expect(file).not.toContain('Approved provider')
    }
    expect(studio).toContain('AmarktAI selects infrastructure automatically')
    expect(command).toContain('Capability')
  })

  it('keeps canonical provider, model, and capability truth singular', () => {
    expect(source('src/lib/ai-capability-taxonomy.ts')).toContain("from '@/lib/provider-mesh'")
    expect(source('src/lib/ai-capability-taxonomy.ts')).toContain("from '@/lib/universal-model-catalog'")
    expect(source('src/lib/model-registry.ts')).toContain('UNIVERSAL_MODEL_ROUTES.map(toLegacyModel)')
    expect(source('src/lib/product-contract.ts')).toContain("from '@/lib/provider-mesh'")
    expect(fs.existsSync(path.join(ROOT, 'src/lib/platform-route-registry.ts'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'src/lib/studio-route-map.ts'))).toBe(false)
  })
})
