import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const database = vi.hoisted(() => {
  type Row = Record<string, unknown>
  type UpsertArgs = { where: Row; create: Row; update: Row }
  const integrationRows = new Map<string, Row>()
  const providerRows = new Map<string, Row>()
  const integrationConfig = {
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) => integrationRows.get(where.key) ?? null),
    upsert: vi.fn(async ({ where, create, update }: UpsertArgs) => {
      const key = String(where.key)
      const current = integrationRows.get(key)
      const row = current ? { ...current, ...update } : { ...create }
      integrationRows.set(key, row)
      return row
    }),
  }
  const aiProvider = {
    findUnique: vi.fn(async ({ where }: { where: { providerKey: string } }) => providerRows.get(where.providerKey) ?? null),
    upsert: vi.fn(async ({ where, create, update }: UpsertArgs) => {
      const key = String(where.providerKey)
      const current = providerRows.get(key)
      const row = current ? { ...current, ...update } : { ...create }
      providerRows.set(key, row)
      return row
    }),
  }
  type Transaction = { integrationConfig: typeof integrationConfig; aiProvider: typeof aiProvider }
  const prisma = {
    integrationConfig,
    aiProvider,
    $transaction: vi.fn(async (callback: (transaction: Transaction) => Promise<unknown>) => callback({
      integrationConfig,
      aiProvider,
    })),
  }
  return { integrationRows, providerRows, prisma }
})

const storageHealth = vi.hoisted(() => ({
  driver: 'local_vps',
  configured: true,
  persistent: true,
  basePath: '/var/www/amarktai/storage',
  requiredDriver: 'local_vps',
  requiredRoot: '/var/www/amarktai/storage',
  requiredDirectories: ['artifacts', 'uploads', 'repos', 'workspaces', 'logs'],
  missingSetup: [],
  note: 'VPS local storage active.',
  ready: true,
  root: '/var/www/amarktai/storage',
  writable: true,
  readable: true,
  deletable: true,
  checkedAt: '2026-06-14T10:00:00.000Z',
  directories: [],
  error: null,
}))

vi.mock('@/lib/prisma', () => ({ prisma: database.prisma }))
vi.mock('@/lib/storage-driver', () => ({
  verifyStorage: vi.fn(async () => ({ ...storageHealth })),
}))
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => ({ isLoggedIn: true })),
}))

import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { settingsRuntimeTools } from '@/lib/settings-runtime-tools'
import { recordMeshTestResult } from '@/lib/provider-mesh-status'
import { POST as testProvider } from '@/app/api/admin/settings/test-provider/route'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
  process.env.VAULT_ENCRYPTION_KEY = 'ab'.repeat(32)
  delete process.env.GENX_API_KEY
  delete process.env.MIMO_API_KEY
  delete process.env.XIAOMI_API_KEY
  delete process.env.MIMO_BASE_URL
  database.integrationRows.clear()
  database.providerRows.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('platform Settings readiness truth', () => {
  it('returns verified local VPS storage as the Settings storage contract', async () => {
    const truth = await getPlatformSettingsTruth()

    expect(truth.storage).toMatchObject({
      ready: true,
      readable: true,
      writable: true,
      deletable: true,
      driver: 'local_vps',
      root: '/var/www/amarktai/storage',
    })
    expect(truth.storageEntry).toMatchObject({
      key: 'storage',
      connected: true,
      status: 'Connected',
    })
    expect(truth.vaultEncryptionConfigured).toBe(true)
    expect(truth.vaultWarning).toBe('')
  })

  it('cannot render a contradictory runtime storage status beside ready Settings storage', async () => {
    const truth = await getPlatformSettingsTruth()
    const runtimeTools = settingsRuntimeTools([
      {
        id: 'storage',
        connected: false,
        detail: 'Read no, write no, delete no.',
      },
      {
        id: 'ffmpeg',
        connected: true,
        detail: 'Available',
      },
    ])

    expect(truth.storage.ready).toBe(true)
    expect(runtimeTools).toEqual([
      {
        id: 'ffmpeg',
        connected: true,
        detail: 'Available',
      },
    ])
    expect(runtimeTools.some((tool) => tool.id === 'storage')).toBe(false)
  })

  it('persists a passed GenX test and treats notes as authoritative over a stale provider row', async () => {
    process.env.GENX_API_KEY = 'genx-production-key'
    await recordMeshTestResult({
      id: 'genx',
      success: true,
      capabilities: ['text', 'image', 'video'],
      detail: 'GenX catalog and execution probes passed.',
    })
    database.providerRows.set('genx', {
      ...database.providerRows.get('genx'),
      healthStatus: 'error',
      healthMessage: 'stale failure',
    })

    const notes = JSON.parse(String(database.integrationRows.get('genx')?.notes))
    expect(notes).toMatchObject({
      lastTestStatus: 'passed',
      lastTestPassed: true,
      capabilities: ['text', 'image', 'video'],
      detail: 'GenX catalog and execution probes passed.',
    })
    expect(notes.lastTestedAt).toBeTruthy()

    const truth = await getPlatformSettingsTruth()
    expect(truth.providers.find((provider) => provider.key === 'genx')).toMatchObject({
      configured: true,
      connected: true,
      status: 'CHAT_SMOKE_PASSED',
      providerRuntimeStatus: 'CHAT_SMOKE_PASSED',
      lastTestResult: 'CHAT_SMOKE_PASSED',
    })
  })

  it('persists a passed MiMo Token Plan test and honors MIMO_BASE_URL', async () => {
    process.env.MIMO_API_KEY = 'tp-production-key'
    process.env.MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1/'
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      return url.endsWith('/models')
        ? new Response(JSON.stringify({
            data: [{ id: 'runtime-chat-model', capabilities: ['chat'], active: true }],
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({
            choices: [{ message: { content: 'OK' } }],
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await testProvider(providerRequest('mimo'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, connected: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ 'api-key': 'tp-production-key' }),
      }),
    )

    const notes = JSON.parse(String(database.integrationRows.get('mimo')?.notes))
    expect(notes).toMatchObject({
      lastTestStatus: 'passed',
      lastTestPassed: true,
      detail: 'OpenAI-compatible chat passed with a dynamically discovered model_metadata model.',
    })
    expect(database.providerRows.get('mimo')).toMatchObject({
      healthStatus: 'healthy',
      baseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1',
    })

    const truth = await getPlatformSettingsTruth()
    expect(truth.providers.find((provider) => provider.key === 'mimo')).toMatchObject({
      configured: true,
      connected: true,
      status: 'CHAT_SMOKE_PASSED',
      providerRuntimeStatus: 'CHAT_SMOKE_PASSED',
    })
  })

  it('persists failed provider tests and exposes a useful Settings error', async () => {
    process.env.MIMO_API_KEY = 'tp-invalid-key'
    process.env.MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1'
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith('/models')
        ? new Response(JSON.stringify({
            data: [{ id: 'runtime-chat-model', capabilities: ['chat'], active: true }],
          }), { status: 200 })
        : new Response('unauthorized', { status: 401 }),
    ))

    const response = await testProvider(providerRequest('mimo'))
    expect(await response.json()).toMatchObject({
      success: false,
      connected: false,
      error: 'Xiaomi MiMo returned HTTP 401',
    })
    const notes = JSON.parse(String(database.integrationRows.get('mimo')?.notes))
    expect(notes).toMatchObject({
      lastTestStatus: 'failed',
      lastTestPassed: false,
      lastError: 'Xiaomi MiMo returned HTTP 401',
    })
    expect(database.providerRows.get('mimo')).toMatchObject({
      healthStatus: 'error',
      healthMessage: 'Xiaomi MiMo returned HTTP 401',
    })

    const truth = await getPlatformSettingsTruth()
    expect(truth.providers.find((provider) => provider.key === 'mimo')).toMatchObject({
      configured: true,
      connected: false,
      status: 'CAPABILITY_SMOKE_FAILED',
      providerRuntimeStatus: 'CAPABILITY_SMOKE_FAILED',
      error: 'Xiaomi MiMo returned HTTP 401',
    })
  })
})

function providerRequest(key: string) {
  return new NextRequest('http://localhost/api/admin/settings/test-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
}
