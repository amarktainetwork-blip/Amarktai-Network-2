import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

function mockEmptyProviderStorage() {
  vi.doMock('@/lib/prisma', () => ({
    prisma: {
      integrationConfig: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async () => ({})),
      },
      aiProvider: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
      },
    },
  }))
  vi.doMock('@/lib/crypto-vault', () => ({
    decryptVaultKey: (value: string) => value,
    encryptVaultKey: (value: string) => value,
  }))
}

describe('runtime provider status', () => {
  it('shows active V1 providers plus MiMo future/workbench, without Hugging Face', async () => {
    mockEmptyProviderStorage()
    const { getRuntimeProviderStatus } = await import('@/lib/runtime-capability-truth')
    const providers = await getRuntimeProviderStatus()
    const keys = providers.map((provider) => provider.key)

    expect(keys).toEqual(expect.arrayContaining(['genx', 'together', 'groq', 'mimo']))
    expect(keys).not.toContain('huggingface')
    expect(keys).not.toContain('qwen')
    expect(keys).not.toContain('openai')
    expect(keys).not.toContain('gemini')
    expect(keys).not.toContain('minimax')
  })

  it('capability truth keeps Groq active for chat/STT and keeps music GenX-only', async () => {
    mockEmptyProviderStorage()
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const truth = await getCapabilityRuntimeTruth()

    expect(truth.find((entry) => entry.capabilityId === 'chat')?.providerCandidates).toEqual(['groq', 'together', 'genx'])
    expect(truth.find((entry) => entry.capabilityId === 'stt')?.providerCandidates).toEqual(['genx', 'groq'])
    expect(truth.find((entry) => entry.capabilityId === 'music_generation')?.providerCandidates).toEqual(['genx'])
    expect(truth.find((entry) => entry.capabilityId === 'music_generation')?.blocker).toContain('GENX_MUSIC_MODEL')
  })

  it('adult capabilities are deferred from active V1 runtime', async () => {
    mockEmptyProviderStorage()
    const { getCapabilityRuntimeTruth } = await import('@/lib/capability-runtime-truth')
    const truth = await getCapabilityRuntimeTruth()

    for (const capability of ['adult_text', 'adult_image', 'adult_video', 'adult_voice', 'adult_avatar']) {
      const entry = truth.find((item) => item.capabilityId === capability)
      expect(entry?.providerCandidates).toEqual([])
      expect(entry?.executionRoute).toBeNull()
      expect(entry?.status).toMatch(/blocked|missing/)
    }
  })
})
