import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { ADULT_POLICY_VALUES, normalizeAdultPolicy } from '@/lib/universal-model-catalog'
import { DUPLICATE_ROUTE_FAMILIES, PLATFORM_ROUTE_TRUTH, getRouteTruthByFamily } from '@/lib/platform-route-registry'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('Phase 1 platform truth stabilization', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete process.env.AMARKTAI_STORAGE_ROOT
    delete process.env.STORAGE_ROOT
    delete process.env.REPO_WORKSPACE_ROOT
    delete process.env.AMARKTAI_ALLOW_DEV_STORAGE_FALLBACK
  })

  it('keeps the dashboard to the control-centre operating sections', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Overview',
      'Connected Apps',
      'Studio',
      'Capabilities',
      'Campaigns',
      'Assets',
      'Agents',
      'Memory',
      'Knowledge/RAG',
      'Approvals',
      'Scheduler/Publishing',
      'Adult Permissions',
      'Settings',
      'System Monitoring',
    ])
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/admin/dashboard',
      '/admin/dashboard/network-apps',
      '/admin/dashboard/studio',
      '/admin/dashboard/capabilities',
      '/admin/dashboard/campaigns',
      '/admin/dashboard/assets',
      '/admin/dashboard/agents',
      '/admin/dashboard/memory',
      '/admin/dashboard/rag',
      '/admin/dashboard/approvals',
      '/admin/dashboard/publishing',
      '/admin/dashboard/adult-mode',
      '/admin/dashboard/settings',
      '/admin/dashboard/system',
    ])
  })

  it('Settings uses approved visible AI providers and the status truth route', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    expect(APPROVED_AI_PROVIDERS.map((provider) => provider.displayName)).toContain('GenX')
    expect(settings).toContain('/api/admin/settings/status')
    expect(read('lib/provider-mesh.ts')).toContain("displayName: 'Qdrant'")
    expect(settings).not.toContain('Firecrawl')
  })

  it('provider connected count only counts configured entries with test/status routes', async () => {
    vi.doMock('@/lib/provider-mesh-status', () => ({
      getMeshCredential: vi.fn(async (key: string) => key === 'genx' || key === 'github' ? `${key}_configured_token` : null),
      getMeshTestNotes: vi.fn(async (key: string) => key === 'genx' || key === 'github'
        ? { lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: '2026-05-07T00:00:00Z' }
        : {}),
    }))

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const truth = await getPlatformSettingsTruth()
    expect(truth.connectedCount).toBe(2)
    expect(truth.providers.find((provider) => provider.key === 'genx')?.status).toBe('Connected')
    expect(truth.providers.find((provider) => provider.key === 'groq')?.status).toBe('Needs key')
    expect(truth.tools.find((tool) => tool.key === 'local-crawler')?.status).toBe('Needs live test')
    expect(truth.storage.connected).toBe(false)
  })

  it('unifies storage roots across local JSON, storage driver, and Workbench workspace', async () => {
    process.env.AMARKTAI_STORAGE_ROOT = path.join(process.cwd(), 'tmp-phase1-storage')
    const { getStorageRoot: getLocalJsonRoot } = await import('@/lib/local-json-store')
    const { getStorageRoot: getDriverRoot } = await import('@/lib/storage-driver')
    const { getRepoWorkspaceRoot } = await import('@/lib/workspace-security')
    expect(getLocalJsonRoot()).toBe(path.resolve(process.env.AMARKTAI_STORAGE_ROOT))
    expect(getDriverRoot()).toBe(path.resolve(process.env.AMARKTAI_STORAGE_ROOT))
    expect(getRepoWorkspaceRoot()).toBe(path.join(path.resolve(process.env.AMARKTAI_STORAGE_ROOT), 'workspaces'))
  })

  it('documents route truth, duplicate route families, and auth policy', () => {
    expect(getRouteTruthByFamily('dashboard-pages')?.routes).toHaveLength(6)
    expect(getRouteTruthByFamily('tools')?.auth).toBe('admin_session')
    expect(getRouteTruthByFamily('brain-connected-app')?.auth).toBe('connected_app_token')
    expect(DUPLICATE_ROUTE_FAMILIES).toContain('ai-routing/routing/routing-profiles')
  })

  it('protects /api/tools behind the admin session while brain routes remain app-token routes', () => {
    const toolsRoute = read('app/api/tools/route.ts')
    const brainStreamRoute = read('app/api/brain/stream/route.ts')
    expect(toolsRoute).toContain('getSession')
    expect(toolsRoute).toContain('Unauthorized')
    expect(brainStreamRoute).toContain('authenticateApp')
    expect(PLATFORM_ROUTE_TRUTH.find((entry) => entry.family === 'tools')?.status).toBe('PROTECTED')
  })

  it('keeps Workbench guards and token-safe Git auth in place', () => {
    const workbench = read('lib/repo-workbench.ts')
    expect(workbench).toContain('GIT_TERMINAL_PROMPT')
    expect(workbench).toContain('GIT_ASKPASS')
    expect(workbench).toContain('REPO_WORKBENCH_ALLOW_MERGE')
    expect(workbench).toContain('REPO_WORKBENCH_ALLOW_DEPLOY')
    expect(workbench).toContain('Path traversal blocked')
  })

  it('makes Command routing truthful instead of claiming complete execution', () => {
    const command = read('components/dashboard/CommandCenter.tsx')
    const router = read('lib/command-router.ts')
    expect(command).toContain('/api/admin/command')
    expect(command).toContain('Open attached workspace')
    expect(router).toContain('approvalRequired')
    expect(command).not.toContain('everything is ready')
  })

  it('keeps adult policy app-level with no separate adult key requirement', () => {
    expect([...ADULT_POLICY_VALUES]).toEqual([
      'off',
      'suggestive',
      'adult_text',
      'adult_image',
      'adult_video',
      'adult_voice',
      'full_adult_app_mode',
      'specialist',
    ])
    expect(normalizeAdultPolicy('full_adult')).toBe('full_adult_app_mode')
    const runtimeTruth = read('lib/runtime-capability-truth.ts')
    expect(runtimeTruth).toContain('getCapabilityRuntimeTruth')
    expect(runtimeTruth).not.toContain('No connected provider/model route can create and persist adult text, image, video, or voice output.')
  })

  it('fixes Firecrawl as a research tool endpoint, not an AI provider endpoint', () => {
    const toolRegistry = read('lib/tool-registry.ts')
    expect(toolRegistry).toContain('/api/admin/research/url')
    expect(toolRegistry).not.toContain('/api/admin/app-intelligence/crawl')
  })
})
