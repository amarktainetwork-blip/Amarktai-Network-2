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
  'voice-agent',
  'vps-health',
  'workbench',
  'workspace',
] as const

describe('final product reset dashboard topology', () => {
  it('keeps exactly the final dashboard nav sections', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Overview',
      'Studio',
      'Apps',
      'Capabilities',
      'Assets & Jobs',
      'Memory & Knowledge',
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
      '/admin/dashboard/settings',
      '/admin/dashboard/system',
    ])
    expect(DASHBOARD_NAV_ITEMS).toHaveLength(8)
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
    const deletedRoutePattern = /\/admin\/dashboard\/(adult-mode|agents|analytics|app-builder|approvals|apps-agents|avatars|brand-memory|campaigns|command|marketing|memory-learning|network-apps|operations|outputs|providers|publishing|rag|scheduler|voice-agent|vps-health|workbench|workspace)\b/
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
    const forbidden = [/none \/ route ready/i, /route ready/i, /Key no/i, /Endpoint no/i, /fake available/i, /Provider Settings/i]
    for (const file of ['app/admin/dashboard/page.tsx', ...finalDashboardRoutes]) {
      const pageSource = source(file)
      for (const pattern of forbidden) expect(pageSource, `${file} ${pattern}`).not.toMatch(pattern)
    }
  })

  it('keeps Overview limited to real summary blocks', () => {
    const overview = source('app/admin/dashboard/page.tsx')
    for (const required of [
      'VPS / Webdock',
      'Connected apps',
      'Provider health',
      'Capabilities',
      'Active jobs',
      'Recent Critical Failures Only',
    ]) {
      expect(overview).toContain(required)
    }
    for (const forbidden of [/Capability Console/i, /Campaigns/i, /Agents/i, /TestTube2/, /\/api\/admin\/settings\/test-provider/, /adult endpoint/i]) {
      expect(overview).not.toMatch(forbidden)
    }
  })

  it('keeps Studio chat-first without provider or model selectors', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain('data-studio-task-selector')
    for (const task of ['Chat', 'Image', 'Video', 'Long-form Video', 'Music', 'Voice/TTS', 'STT', 'Avatar', 'RAG/Research', 'Campaign']) {
      expect(studio).toContain(task)
    }
    expect(studio).not.toMatch(/Provider\s*<\/label>|Model\s*<\/label>|provider selector|model selector/i)
  })

  it('keeps Studio route details collapsed by default', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain('<details')
    expect(studio).not.toMatch(/<details\s+open/i)
  })

  it('keeps Studio wired to existing execution routes and required controls', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')
    const execute = source('app/api/admin/studio/execute/route.ts')
    expect(studio).toContain('/api/admin/studio/stt')
    expect(execute).toContain('/api/brain/video-generate')
    expect(execute).toContain('/api/admin/music-studio')
    expect(execute).toContain('/api/brain/tts')
    expect(execute).toContain('/api/brain/avatar-video')

    for (const label of [
      'Reference image upload',
      'Edit mode',
      'Number of images',
      'Target duration',
      'Number of videos',
      'Scene count',
      'Voice toggle',
      'Music toggle',
      'Stitching option',
      'Lyrics textarea',
      'Number of songs',
      'Voice sample upload',
      'Clone name',
      'Consent / rights',
      'Test phrase',
      'Audio upload',
      'Avatar library',
      'Create avatar',
      'Consistency toggle',
      'URL input for scrape',
      'Document upload',
      'Asset type selector',
    ]) {
      expect(studio).toContain(label)
    }
  })

  it('keeps Studio upload controls real and duration/count controls broad enough', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')
    for (const upload of [
      'image-reference-upload',
      'video-reference-upload',
      'stt-audio',
      'avatar-reference-upload',
      'rag-document-upload',
      'voice-clone-upload',
    ]) {
      expect(studio).toContain(upload)
    }
    expect(studio).toContain('1m30s')
    expect(studio).toContain('180s')
    expect(studio).toContain('300s')
    expect(studio).toContain('setMusicCount')
  })

  it('keeps planned app templates separate from connected apps', () => {
    const apps = source('app/admin/dashboard/apps/page.tsx')
    const addApp = source('components/dashboard/AddAppFlow.tsx')
    expect(apps).toContain('No apps connected yet')
    expect(apps).toContain('Templates / next apps')
    expect(apps).toContain('Template only, not connected')
    expect(apps).toContain('<AddAppFlow />')
    expect(addApp).toContain('/api/admin/app-profiles')
    expect(addApp).toContain('Allowed capability categories')
    expect(addApp).toContain('Storage / artifact scope')
  })

  it('keeps Memory & Knowledge split into the requested sections', () => {
    const memory = source('app/admin/dashboard/memory/page.tsx')
    const tools = source('components/dashboard/MemoryKnowledgeTools.tsx')
    for (const section of ['User Memory', 'App Memory', 'Brand Memory', 'Knowledge/RAG', 'Website Scrapes']) {
      expect(memory).toContain(section)
    }
    expect(memory).toContain('<MemoryKnowledgeTools />')
    expect(tools).toContain('/api/admin/research/url')
    expect(tools).toContain('/api/admin/rag/ingest')
    expect(tools).toContain('/api/admin/rag/query')
    expect(tools).toContain('data-knowledge-document-upload')
  })

  it('keeps System focused on VPS, services, worker, logs, and database', () => {
    const system = source('app/admin/dashboard/system/page.tsx')
    for (const section of ['VPS', 'Services', 'Worker', 'Logs', 'Database']) {
      expect(system).toContain(section)
    }
    expect(system).not.toContain('getDashboardRuntimeTruth')
    expect(system).not.toMatch(/runtime\?\.(providers|blockers)|getCapabilityRuntimeTruth|CapabilityLine/i)
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

  it('keeps the public website positioned as the AmarktAI Network runtime platform', () => {
    const home = source('app/page.tsx')
    const features = source('app/features/page.tsx')
    expect(home).toContain('Intelligence Unleashed.')
    expect(home).toContain('Explore Infinite Intelligence. The Future is')
    expect(home).toContain('Apps stay thin')
    expect(home).toContain('providers/capabilities')
    expect(features).toContain('capability requests')
    expect(features).toContain('runtime')
  })

  it('keeps the AI part of AmarktAI separately stylable and blue', () => {
    const brand = source('components/BrandName.tsx')
    expect(brand).toContain('data-brand-ai="true"')
    expect(brand).toContain('text-blue-400')
  })

  it('integrates the voice assistant into the dashboard layout instead of nav', () => {
    const layout = source('app/admin/dashboard/layout.tsx')
    expect(layout).toContain('data-dashboard-voice-assistant')
    expect(layout).toContain('dashboard-voice-assistant')
    expect(layout).toContain('Voice backend not wired')
    expect(layout).toContain('/api/admin/voice/options')
    expect(layout).toContain('/api/admin/voice/preview')
    expect(layout).toContain('/api/realtime/session')
    expect(exists('app/admin/dashboard/voice-agent')).toBe(false)
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain('Voice Agent')
  })
})
