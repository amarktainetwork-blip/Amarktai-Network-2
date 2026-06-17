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

  it('keeps Command Center, Studio, and Settings on their required backend surfaces', () => {
    const command = source('src/components/dashboard/CommandCenter.tsx')
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    const settings = source('src/app/admin/dashboard/settings/page.tsx')

    expect(command).toContain("fetch('/api/admin/playground?limit=30'")
    expect(command).toContain("fetch('/api/admin/playground'" )
    expect(command).toContain('/api/admin/app-safety?appSlug=${encodeURIComponent(appSlug)}')

    expect(studio).toContain("fetch('/api/admin/system/v1-brain-route-matrix'")
    expect(studio).toContain("fetch('/api/admin/studio/execute'" )
    expect(studio).toContain('/api/admin/app-safety?appSlug=${encodeURIComponent(appSlug)}')
    expect(studio).toContain("fetch('/api/admin/creative-workspaces'")

    expect(settings).toContain("fetch('/api/admin/settings/status'")
    expect(settings).toContain("fetch('/api/admin/settings/routing-policy'")
    expect(settings).toContain("fetch('/api/admin/settings/runtime-tools'")
    expect(settings).toContain("fetch('/api/admin/system/ai-capabilities-truth'")
  })

  it('keeps Hugging Face readiness truthful by separating token checks from capability proof', () => {
    const settings = source('src/app/api/admin/settings/test-huggingface/route.ts')
    const providerTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(settings).toContain('capabilityExecutionProven: false')
    expect(settings).toContain('token/account check passed')
    expect(providerTest).toContain('result.capabilityExecutionProven !== false')
  })

  it('keeps Together readiness truthful by separating model-catalog checks from capability proof', () => {
    const together = source('src/app/api/admin/settings/test-together/route.ts')
    const providerTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(together).toContain('capabilityExecutionProven: false')
    expect(together).toContain('model catalog check passed')
    expect(providerTest).toContain('result.capabilityExecutionProven !== false')
  })

  it('keeps GenX readiness truthful by separating catalog/chat probes from Brain-route proof', () => {
    const genx = source('src/app/api/admin/settings/test-genx/route.ts')
    const providerTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(genx).toContain('capabilityExecutionProven: false')
    expect(genx).toContain('catalog and direct chat probe passed')
    expect(providerTest).toContain('result.capabilityExecutionProven !== false')
  })

  it('keeps Qwen readiness truthful by separating chat probes from capability-specific route proof', () => {
    const qwen = source('src/app/api/admin/settings/test-qwen/route.ts')
    const providerTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(qwen).toContain('capabilityExecutionProven: false')
    expect(qwen).toContain('chat probe passed')
    expect(providerTest).toContain('result.capabilityExecutionProven !== false')
  })

  it('keeps Hugging Face task proof on specialist/admin surfaces instead of pretending Brain route readiness', () => {
    const capabilityTest = source('src/app/api/admin/provider-capability-test/route.ts')
    const hfTest = source('src/app/api/admin/settings/test-huggingface/route.ts')
    const imageEdit = source('src/app/api/brain/image-edit/route.ts')
    const adultImage = source('src/app/api/brain/adult-image/route.ts')

    expect(hfTest).toContain("proofType: 'account_token_check'")
    expect(capabilityTest).toContain("provider === 'huggingface'")
    expect(capabilityTest).toContain('needs_specialist_route')
    expect(imageEdit).toContain("capability: 'image_edit'")
    expect(adultImage).toContain("capability: 'adult_image'")
  })

  it('keeps Groq readiness truthful by separating model-catalog checks from Brain route proof', () => {
    const groq = source('src/app/api/admin/settings/test-groq/route.ts')
    const providerTest = source('src/app/api/admin/settings/test-provider/route.ts')
    const tts = source('src/app/api/brain/tts/route.ts')
    const stt = source('src/app/api/brain/stt/route.ts')

    expect(groq).toContain('capabilityExecutionProven: false')
    expect(groq).toContain('model catalog check passed')
    expect(providerTest).toContain('result.capabilityExecutionProven !== false')
    expect(tts).toContain("capability: body.capability === 'adult_voice' ? 'adult_voice' : 'tts'")
    expect(stt).toContain("capability: 'stt'")
  })

  it('keeps Xiaomi MiMo distinct from MiniMax across runtime and settings surfaces', () => {
    const providerMesh = source('src/lib/provider-mesh.ts')
    const universalProvider = source('src/lib/universal-provider-call.ts')
    const testProvider = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(providerMesh).toContain("displayName: 'Xiaomi MiMo'")
    expect(providerMesh).not.toContain('MiniMax')
    expect(universalProvider).toContain("providerKey: 'mimo'")
    expect(universalProvider).not.toContain('MINIMAX_API_KEY')
    expect(universalProvider).not.toContain('api.minimax.io')
    expect(testProvider).toContain("id === 'mimo'")
  })

  it('keeps Studio adult blockers tied to app safety truth instead of provider-choice UI', () => {
    const studio = source('src/app/admin/dashboard/studio/page.tsx')

    expect(studio).toContain('adultCapabilities?.globalAvailable')
    expect(studio).toContain('adultCapabilities?.approvedProviders')
    expect(studio).toContain('adultCapabilityKey(capability)')
    expect(studio).not.toContain('Provider override')
    expect(studio).not.toContain('Model override')
  })
})
