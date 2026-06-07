import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('standalone provider truth', () => {
  it('shows a live-tested provider as Connected everywhere', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
            if (key !== 'qwen') return null
            return {
              apiKey: 'encrypted-qwen-key',
              notes: JSON.stringify({
                lastTestStatus: 'passed',
                lastTestPassed: true,
                lastTestedAt: '2026-06-07T00:00:00.000Z',
              }),
            }
          }),
        },
        aiProvider: {
          findUnique: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({
      decryptVaultKey: (value: string) => value,
    }))
    vi.doMock('@/lib/local-json-store', () => ({
      LOCAL_STORE_FILES: { artifacts: 'artifacts.json' },
      checkWritable: () => ({ writable: false }),
    }))

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const settings = await getPlatformSettingsTruth()
    const runtime = await getRuntimeProviderStatus()

    expect(settings.providers.find((entry) => entry.key === 'qwen')?.status).toBe('Connected')
    expect(runtime.find((entry) => entry.key === 'qwen')).toMatchObject({
      connected: true,
      status: 'configured_wired',
    })
  })
})
