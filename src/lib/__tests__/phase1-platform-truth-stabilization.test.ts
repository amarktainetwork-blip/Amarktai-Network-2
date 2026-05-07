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

  it('keeps the dashboard to exactly the six final sections', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Studio',
      'Workbench',
      'Apps & Agents',
      'Memory & Learning',
      'Operations',
      'Settings',
    ])
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/admin/dashboard',
      '/admin/dashboard/workbench',
      '/admin/dashboard/apps-agents',
      '/admin/dashboard/memory-learning',
      '/admin/dashboard/operations',
      '/admin/dashboard/settings',
    ])
  })

  it('Settings uses approved visible AI providers and the status truth route', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    expect(APPROVED_AI_PROVIDERS.map((provider) => provider.displayName)).toEqual([
      'GenX',
      'Hugging Face',
      'Qwen/DashScope',
      'MiniMax/Mimo',
      'Groq',
      'Together AI',
      'OpenAI',
    ])
    expect(settings).toContain('/api/admin/settings/status')
    expect(settings).toContain('Configured and testable keys')
    for (const banned of ['DeepSeek', 'Google Gemini', 'OpenRouter', 'Replicate', 'ElevenLabs', 'Webdock AI']) {
      expect(settings).not.toContain(banned)
    }
  })

  it('provider connected count only counts configured entries with test/status routes', async () => {
    vi.doMock('@/lib/provider-config', () => ({
      getProviderKeyWithSource: vi.fn(async (key: string) => ({
        key: key === 'genx' || key === 'github' ? `${key}_configured_token` : null,
        source: key === 'genx' || key === 'github' ? 'vault' : 'missing',
      })),
    }))

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const truth = await getPlatformSettingsTruth()
    expect(truth.connectedCount).toBe(2)
    expect(truth.providers.find((provider) => provider.key === 'genx')?.status).toBe('Configured')
    expect(truth.providers.find((provider) => provider.key === 'groq')?.status).toBe('Needs key')
    expect(truth.tools.find((tool) => tool.key === 'firecrawl')?.status).toBe('Needs key')
    expect(truth.storage.connected).toBe(true)
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

  it('makes Studio media tabs truthful instead of claiming complete wiring', () => {
    const studio = read('app/admin/dashboard/page.tsx')
    const streamRoute = read('app/api/admin/amarktai-assistant/stream/route.ts')
    expect(studio).toContain('Backend route available, UI wiring pending')
    expect(streamRoute).toContain('Selected provider streaming pending')
    expect(studio).not.toContain('Studio is ready for')
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
    expect(runtimeTruth).toContain('No approved adult-capable provider key')
    expect(runtimeTruth).not.toContain('ADULT_MODE_ENABLED=true')
  })

  it('fixes Firecrawl as a research tool endpoint, not an AI provider endpoint', () => {
    const toolRegistry = read('lib/tool-registry.ts')
    expect(toolRegistry).toContain('/api/admin/research/url')
    expect(toolRegistry).not.toContain('/api/admin/app-intelligence/crawl')
  })
})
