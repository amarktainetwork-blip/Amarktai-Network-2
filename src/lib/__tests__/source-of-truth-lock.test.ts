import { describe, expect, it } from 'vitest'
import { AI_PROVIDER_MESH, PROVIDER_MESH, getProviderMeshNode } from '@/lib/provider-mesh'
import { APPROVED_AI_PROVIDERS, isApprovedAIProvider } from '@/lib/approved-ai-catalog'

const APPROVED_AI_PROVIDER_KEYS = ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'] as const

const PLATFORM_SERVICE_KEYS = [
  'github',
  'redis',
  'qdrant',
  'local-crawler',
  'playwright',
  'scrapy',
  'trafilatura',
  'ffmpeg',
  'storage',
  'smtp',
] as const

const UNAPPROVED_DIRECT_PROVIDERS = [
  'openai',
  'gemini',
  'nvidia',
  'suno',
  'udio',
  'anthropic',
  'deepseek',
  'minimax',
  'replicate',
  'openrouter',
] as const

describe('source-of-truth lock', () => {
  it('keeps provider-mesh as the canonical approved provider identity', () => {
    expect(AI_PROVIDER_MESH.map((provider) => provider.id)).toEqual([...APPROVED_AI_PROVIDER_KEYS])
    expect(PROVIDER_MESH.map((provider) => provider.id)).toEqual([
      ...APPROVED_AI_PROVIDER_KEYS,
      ...PLATFORM_SERVICE_KEYS,
    ])
  })

  it('derives approved AI providers from provider mesh only', () => {
    expect(APPROVED_AI_PROVIDERS.map((provider) => provider.key)).toEqual([...APPROVED_AI_PROVIDER_KEYS])

    for (const provider of APPROVED_AI_PROVIDER_KEYS) {
      expect(isApprovedAIProvider(provider)).toBe(true)
      expect(getProviderMeshNode(provider)).toBeTruthy()
    }
  })

  it('does not expose stale direct providers as canonical mesh providers', () => {
    for (const provider of UNAPPROVED_DIRECT_PROVIDERS) {
      expect(isApprovedAIProvider(provider)).toBe(false)
      expect(getProviderMeshNode(provider)).toBeUndefined()
    }
  })

  it('keeps platform services separate from first-class AI providers', () => {
    for (const service of PLATFORM_SERVICE_KEYS) {
      const node = getProviderMeshNode(service)
      expect(node).toBeTruthy()
      expect(node?.kind === 'tool' || node?.kind === 'storage').toBe(true)
      expect(isApprovedAIProvider(service)).toBe(false)
    }
  })
})
