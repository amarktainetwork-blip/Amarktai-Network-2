import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const root = process.cwd()

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(root, 'src', relativePath))
}

const finalDashboardRoutes = [
  'app/admin/dashboard/apps/page.tsx',
  'app/admin/dashboard/assets/page.tsx',
  'app/admin/dashboard/capabilities/page.tsx',
  'app/admin/dashboard/memory/page.tsx',
  'app/admin/dashboard/settings/page.tsx',
  'app/admin/dashboard/studio/page.tsx',
  'app/admin/dashboard/system/page.tsx',
  'app/admin/dashboard/voice-agent/page.tsx',
] as const

const deletedDashboardRouteDirs = [
  'adult-mode',
  'agents',
  'analytics',
  'app-builder',
  'approvals',
  'apps-agents',
  'avatars',
  'brand-memory',
  'campaigns',
  'command',
  'marketing',
  'memory-learning',
  'network-apps',
  'operations',
  'outputs',
  'providers',
  'publishing',
  'rag',
  'scheduler',
  'vps-health',
  'workbench',
  'workspace',
] as const

describe('final product reset dashboard topology', () => {
  it('keeps exactly the nine final dashboard nav sections', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Overview',
      'Studio',
      'Apps',
      'Capabilities',
      'Assets & Jobs',
      'Memory & Knowledge',
      'Voice Agent',
      'Settings',
      'System',
    ])
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/admin/dashboard',
      '/admin/dashboard/studio',
      '/admin/dashboard/apps',
      '/admin/dashboard/capabilities',
      '/admin/dashboard/assets',
      '/admin/dashboard/memory',
      '/admin/dashboard/voice-agent',
      '/admin/dashboard/settings',
      '/admin/dashboard/system',
    ])
    expect(DASHBOARD_NAV_ITEMS).toHaveLength(9)
  })

  it('deletes duplicate dashboard UI route directories instead of hiding them', () => {
    for (const routeDir of deletedDashboardRouteDirs) {
      expect(exists(`app/admin/dashboard/${routeDir}`), routeDir).toBe(false)
    }
    for (const finalRoute of finalDashboardRoutes) {
      expect(exists(finalRoute), finalRoute).toBe(true)
    }
  })

  it('does not link active dashboard UI back to deleted dashboard routes', () => {
    const deletedRoutePattern = /\/admin\/dashboard\/(adult-mode|agents|analytics|app-builder|approvals|apps-agents|avatars|brand-memory|campaigns|command|marketing|memory-learning|network-apps|operations|outputs|providers|publishing|rag|scheduler|vps-health|workbench|workspace)\b/
    const activeUiFiles = [
      'lib/dashboard-nav.ts',
      'components/dashboard/CommandCenter.tsx',
      'components/dashboard/ui/DashboardShell.tsx',
      'components/dashboard/ui/SidebarNav.tsx',
      'app/admin/dashboard/page.tsx',
      ...finalDashboardRoutes,
    ]
    for (const file of activeUiFiles) {
      expect(source(file), file).not.toMatch(deletedRoutePattern)
    }
  })
})

describe('final product reset truth and provider controls', () => {
  it('keeps provider tests only inside Settings UI and the canonical settings API route', () => {
    const settings = source('app/admin/dashboard/settings/page.tsx')
    expect(settings).toContain('TestTube2')
    expect(settings).toContain('entry.testRoute')
    expect(exists('app/api/admin/settings/test-provider/route.ts')).toBe(true)

    for (const page of finalDashboardRoutes.filter((file) => !file.includes('/settings/'))) {
      const pageSource = source(page)
      expect(pageSource, page).not.toContain('TestTube2')
      expect(pageSource, page).not.toContain('/api/admin/settings/test-provider')
      expect(pageSource, page).not.toMatch(/\bRun live test\b|\bTest provider\b/i)
    }
  })

  it('keeps capabilities and dashboard adapters on canonical truth files', () => {
    expect(source('app/admin/dashboard/capabilities/page.tsx')).toContain('getCapabilityRuntimeTruth')
    expect(exists('lib/capability-runtime-truth.ts')).toBe(true)
    expect(exists('lib/provider-runtime-truth.ts')).toBe(true)
    expect(exists('lib/system-runtime-status.ts')).toBe(true)
    expect(exists('lib/dashboard-api.ts')).toBe(true)
  })

  it('removes fake readiness language from active dashboard UI', () => {
    const forbidden = [/none \/ route ready/i, /route ready/i, /Key no/i, /Endpoint no/i, /Provider Settings/i]
    for (const file of ['app/admin/dashboard/page.tsx', ...finalDashboardRoutes]) {
      const pageSource = source(file)
      for (const pattern of forbidden) expect(pageSource, `${file} ${pattern}`).not.toMatch(pattern)
    }
  })
})

describe('final product reset public website positioning', () => {
  it('keeps adult, girlfriend, and companion language out of public website pages', () => {
    const publicPages = [
      'app/page.tsx',
      'app/about/page.tsx',
      'app/apps/page.tsx',
      'app/features/page.tsx',
      'app/platform/page.tsx',
      'app/safety/page.tsx',
      'app/what-we-can-do/page.tsx',
      'app/network-apps/page.tsx',
      'components/public/PublicShell.tsx',
    ]
    const forbidden = /\b(adult|explicit|girlfriend|companion)\b/i
    for (const page of publicPages) expect(source(page), page).not.toMatch(forbidden)
  })

  it('keeps the AI part of AmarktAI separately stylable and blue', () => {
    const brand = source('components/BrandName.tsx')
    expect(brand).toContain('data-brand-ai="true"')
    expect(brand).toContain('text-blue-400')
  })

  it('keeps Voice Agent honest when backend streaming is not wired', () => {
    const voice = source('app/admin/dashboard/voice-agent/page.tsx')
    expect(voice).toContain('Not wired yet')
    expect(voice).toContain('/api/admin/voice-agent/session')
    expect(voice).not.toMatch(/\bworking\b.*\bvoice agent\b/i)
  })
})
