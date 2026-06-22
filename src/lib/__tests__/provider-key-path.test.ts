import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const integrationRows = new Map<string, { apiKey?: string | null; notes?: string | null }>()
  const providerRows = new Map<string, { apiKey?: string | null }>()
  return {
    integrationRows,
    providerRows,
    prisma: {
      integrationConfig: {
        findUnique: vi.fn(async ({ where }: { where: { key: string } }) => integrationRows.get(where.key) ?? null),
      },
      aiProvider: {
        findUnique: vi.fn(async ({ where }: { where: { providerKey: string } }) => providerRows.get(where.providerKey) ?? null),
      },
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }))
vi.mock('@/lib/crypto-vault', () => ({
  decryptVaultKey: (value: string) => value,
}))

import { getMeshCredential } from '@/lib/provider-mesh-status'
import { getProviderKeyWithSource } from '@/lib/provider-config'

const originalEnv = { ...process.env }

describe('provider key path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.integrationRows.clear()
    db.providerRows.clear()
    process.env = { ...originalEnv }
    delete process.env.GENX_API_KEY
    delete process.env.HUGGINGFACE_API_KEY
    delete process.env.HUGGINGFACEHUB_API_TOKEN
    delete process.env.HF_TOKEN
    delete process.env.QWEN_API_KEY
    delete process.env.DASHSCOPE_API_KEY
    delete process.env.MIMO_API_KEY
    delete process.env.XIAOMI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.TOGETHER_API_KEY
  })

  it('resolves stored integrationConfig credentials for all five canonical providers', async () => {
    const providers = {
      genx: 'genx-stored-key-123456789',
      huggingface: 'hf_stored_key_123456789',
      mimo: 'mimo-stored-key-123456789',
      groq: 'groq-stored-key-123456789',
      together: 'together-stored-key-123456789',
    } as const

    for (const [provider, key] of Object.entries(providers)) {
      db.integrationRows.set(provider, { apiKey: key })
    }

    await expect(getMeshCredential('genx')).resolves.toBe(providers.genx)
    await expect(getMeshCredential('huggingface')).resolves.toBe(providers.huggingface)
    await expect(getMeshCredential('mimo')).resolves.toBe(providers.mimo)
    await expect(getMeshCredential('groq')).resolves.toBe(providers.groq)
    await expect(getMeshCredential('together')).resolves.toBe(providers.together)
  })

  it('keeps integrationConfig authoritative over env aliases', async () => {
    db.integrationRows.set('groq', { apiKey: 'groq-stored-key-123456789' })
    process.env.GROQ_API_KEY = 'groq-env-key-123456789'

    await expect(getMeshCredential('groq')).resolves.toBe('groq-stored-key-123456789')
    await expect(getProviderKeyWithSource('groq')).resolves.toEqual({
      key: 'groq-stored-key-123456789',
      source: 'vault',
    })
  })

  it('falls back to aiProvider when integrationConfig is absent', async () => {
    db.providerRows.set('together', { apiKey: 'together-provider-row-key-123456789' })

    await expect(getMeshCredential('together')).resolves.toBe('together-provider-row-key-123456789')
  })
})
