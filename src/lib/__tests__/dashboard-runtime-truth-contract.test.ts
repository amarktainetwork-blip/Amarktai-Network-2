import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDashboardRuntimeTruth: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getSession: mocks.getSession,
}))

vi.mock('@/lib/runtime-capability-truth', () => ({
  getDashboardRuntimeTruth: mocks.getDashboardRuntimeTruth,
}))

const ROOT = process.cwd()
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('dashboard runtime truth contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ isLoggedIn: true })
    mocks.getDashboardRuntimeTruth.mockResolvedValue({
      success: true,
      genx: { configured: true, available: true, keySource: 'env', modelCount: 3, capabilities: ['chat'], apiUrl: 'https://query.genx.sh' },
      providers: [{ key: 'genx', displayName: 'GenX', reason: 'Live test passed.', configured: true, connected: true, coveredByGenX: false, keySource: 'env', status: 'READY', capabilities: ['text'] }],
      capabilities: [{ name: 'Research', status: 'READY', blocker: null, models: ['qwen/qwen-plus'], nextAction: null }],
      adultGate: { status: 'BLOCKED', blocker: 'Adult mode is off.', providerAvailable: false, testPassed: false, globalEnabled: false, enabled: false, selectedProvider: null, selectedModel: null, allowedCategories: [], blockedCategories: [], lastTestStatus: null, lastError: null, configuredProviders: [] },
      blockers: [],
      localCore: { memory: { writable: true, driver: 'local_vps', file: 'memory' }, approvals: { writable: true, driver: 'local_vps', file: 'approvals' }, artifacts: { writable: true, driver: 'local_vps', file: 'artifacts' }, research: { writable: true, driver: 'local_vps', file: 'research' }, apps: { writable: true, driver: 'local_vps', file: 'apps', count: 1 }, agents: { writable: true, driver: 'local_vps', file: 'agents', count: 1 }, allWorking: true },
    })
  })

  it('returns runtime truth directly from the Brain-owned runtime source', async () => {
    const { GET } = await import('@/app/api/admin/runtime-truth/route')
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.getDashboardRuntimeTruth).toHaveBeenCalledTimes(1)
    expect(payload).toMatchObject({
      success: true,
      providers: [{ key: 'genx', displayName: 'GenX', status: 'READY' }],
      capabilities: [{ name: 'Research', status: 'READY' }],
    })
  })

  it('keeps dashboard capabilities connected to runtime truth instead of a stale local list', () => {
    const page = source('src/app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain("fetch('/api/admin/system/ai-capabilities-truth'")
    expect(page).not.toContain('AI_CAPABILITY_TAXONOMY.filter')
  })

  it('keeps jobs and artifacts pages connected to canonical backend surfaces', () => {
    const jobsPage = source('src/app/admin/dashboard/jobs/page.tsx')
    const artifactsPage = source('src/app/admin/dashboard/artifacts/page.tsx')
    const jobsApi = source('src/app/api/admin/jobs/route.ts')
    const artifactsApi = source('src/app/api/admin/artifacts/route.ts')

    expect(jobsPage).toContain("fetch('/api/admin/jobs')")
    expect(jobsPage).not.toContain("fetch('/api/admin/system/jobs')")
    expect(artifactsPage).toContain("fetch(`/api/admin/artifacts?${params}`")
    expect(jobsApi).toContain('jobs')
    expect(artifactsApi).toContain('listArtifacts')
  })

  it('keeps connected apps on the existing registration and event-log flows', () => {
    const page = source('src/app/admin/dashboard/connected-apps/page.tsx')
    const client = source('src/app/admin/dashboard/connected-apps/ConnectedAppsClient.tsx')

    expect(page).toContain('listConnectedApps()')
    expect(page).toContain('listConnectedAppEvents()')
    expect(client).toContain("fetch('/api/admin/connected-apps'")
    expect(client).toContain('/api/admin/connected-apps/${id}')
  })
})
