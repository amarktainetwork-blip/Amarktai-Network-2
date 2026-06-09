import { describe, expect, it } from 'vitest'
import {
  getLiveCatalogProviderSpecsForDashboard,
  getLiveCatalogSnapshot,
  getProviderLiveCatalog,
} from '@/lib/live-provider-catalog-service'

describe('live provider catalog service', () => {
  it('returns service providers without pretending they have models', async () => {
    const result = await getProviderLiveCatalog('github', {
      keyResolver: async () => null,
    })

    expect(result.catalog.ok).toBe(true)
    expect(result.catalog.source).toBe('service')
    expect(result.catalog.models).toEqual([])
  })

  it('uses the key resolver and fetches a live provider catalog', async () => {
    const result = await getProviderLiveCatalog('groq', {
      keyResolver: async (provider, envVars) => {
        expect(provider).toBe('groq')
        expect(envVars).toContain('GROQ_API_KEY')
        return 'gsk_test'
      },
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            data: [
              { id: 'whisper-large-v3', category: 'speech' },
              { id: 'llama-3.3-70b-versatile', category: 'text' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )) as typeof fetch,
    })

    expect(result.catalog.ok).toBe(true)
    expect(result.catalog.models.map((model) => model.modelId)).toContain('whisper-large-v3')
    expect(result.catalog.models.map((model) => model.modelId)).toContain('llama-3.3-70b-versatile')
  })

  it('builds a full snapshot across providers without throwing when model keys are missing', async () => {
    const snapshot = await getLiveCatalogSnapshot({
      keyResolver: async () => null,
    })

    expect(snapshot.providers.length).toBeGreaterThanOrEqual(10)
    expect(snapshot.providers.some((entry) => entry.spec.provider === 'genx')).toBe(true)
    expect(snapshot.providers.some((entry) => entry.spec.provider === 'huggingface')).toBe(true)
    expect(snapshot.providers.some((entry) => entry.spec.provider === 'github')).toBe(true)

    const github = snapshot.providers.find((entry) => entry.spec.provider === 'github')
    expect(github?.catalog.ok).toBe(true)

    const groq = snapshot.providers.find((entry) => entry.spec.provider === 'groq')
    expect(groq?.catalog.ok).toBe(false)
    expect(groq?.catalog.error).toContain('No API key')
  })

  it('sanitizes provider specs for dashboard display', () => {
    const specs = getLiveCatalogProviderSpecsForDashboard()
    const genx = specs.find((spec) => spec.provider === 'genx')
    const huggingface = specs.find((spec) => spec.provider === 'huggingface')

    expect(genx).toBeDefined()
    expect(genx?.endpoints.some((endpoint) => endpoint.hasLiveUrl)).toBe(true)
    expect(huggingface).toBeDefined()
    expect(huggingface?.endpoints.some((endpoint) => endpoint.hasLiveUrl === false)).toBe(true)
  })
})
