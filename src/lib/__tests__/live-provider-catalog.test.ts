import { describe, expect, it } from 'vitest'
import {
  fetchLiveCatalog,
  getCatalogEnabledProviders,
  getLiveProviderCatalogSpec,
  getLiveProviderCatalogSpecs,
  inferCapabilities,
  normalizeCatalogResponse,
  normalizeCategory,
} from '@/lib/live-provider-catalog'

describe('live provider catalog foundation', () => {
  it('covers all approved connected providers and services, not stale direct providers', () => {
    const providers = new Set(getCatalogEnabledProviders())
    for (const provider of ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together', 'github', 'redis', 'qdrant', 'ffmpeg']) {
      expect(providers.has(provider as never), `missing ${provider}`).toBe(true)
      expect(getLiveProviderCatalogSpec(provider)).toBeDefined()
    }

    expect(providers.has('openai' as never)).toBe(false)
    expect(providers.has('gemini' as never)).toBe(false)
    expect(providers.has('nvidia' as never)).toBe(false)
    expect(providers.has('suno' as never)).toBe(false)
    expect(providers.has('udio' as never)).toBe(false)
  })

  it('defines dynamic catalog rules for GenX and endpoint-aware rules for HF/Groq/Qwen/MiMo/Together', () => {
    expect(getLiveProviderCatalogSpec('genx')?.mode).toBe('dynamic_models')
    expect(getLiveProviderCatalogSpec('huggingface')?.mode).toBe('task_catalog')
    expect(getLiveProviderCatalogSpec('groq')?.mode).toBe('dynamic_models')
    expect(getLiveProviderCatalogSpec('qwen')?.mode).toBe('endpoint_catalog')
    expect(getLiveProviderCatalogSpec('mimo')?.mode).toBe('live_discovery')
    expect(getLiveProviderCatalogSpec('together')?.mode).toBe('endpoint_catalog')

    expect(getLiveProviderCatalogSpec('genx')?.endpoints.some((endpoint) => endpoint.url.includes('/api/v1/models'))).toBe(true)
    expect(getLiveProviderCatalogSpec('genx')?.endpoints.some((endpoint) => endpoint.url.includes('/v1/models'))).toBe(true)
    expect(getLiveProviderCatalogSpec('groq')?.endpoints.some((endpoint) => endpoint.url.includes('/openai/v1/models'))).toBe(true)
  })

  it('normalizes OpenAI-style, GenX-style and generic model lists', () => {
    const openAiStyle = normalizeCatalogResponse('groq', {
      data: [
        { id: 'whisper-large-v3', category: 'speech' },
        { id: 'llama-3.3-70b-versatile', category: 'text' },
      ],
    })

    expect(openAiStyle.map((model) => model.modelId)).toContain('whisper-large-v3')
    expect(openAiStyle.find((model) => model.modelId === 'whisper-large-v3')?.capabilities).toContain('automatic_speech_recognition')

    const genericStyle = normalizeCatalogResponse('genx', {
      models: [{ id: 'veo-3.1', category: 'video' }],
    })

    expect(genericStyle[0]?.provider).toBe('genx')
    expect(genericStyle[0]?.capabilities).toContain('text_to_video')
  })

  it('normalizes categories and infers capability families', () => {
    expect(normalizeCategory('text-to-image')).toBe('image')
    expect(normalizeCategory('speech-to-text')).toBe('voice')
    expect(normalizeCategory('text-to-audio')).toBe('audio')
    expect(normalizeCategory('reranking')).toBe('rerank')

    expect(inferCapabilities('huggingface', 'image', 'black-forest-labs/FLUX.1-schnell')).toContain('text_to_image')
    expect(inferCapabilities('qwen', 'video', 'wanx2.1-t2v-turbo')).toContain('text_to_video')
    expect(inferCapabilities('groq', 'voice', 'whisper-large-v3')).toContain('automatic_speech_recognition')
    expect(inferCapabilities('genx', 'audio', 'lyria-3-pro-preview')).toContain('text_to_audio')
  })

  it('fetchLiveCatalog handles service providers without model lists', async () => {
    const result = await fetchLiveCatalog('github', null)
    expect(result.ok).toBe(true)
    expect(result.source).toBe('service')
    expect(result.models).toEqual([])
  })

  it('fetchLiveCatalog safely blocks missing keys before network calls', async () => {
    let called = false
    const result = await fetchLiveCatalog('groq', null, (async () => {
      called = true
      throw new Error('should not be called')
    }) as typeof fetch)

    expect(called).toBe(false)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('No API key')
  })

  it('fetchLiveCatalog reads live-style model payloads when a key and fetch are provided', async () => {
    const result = await fetchLiveCatalog(
      'groq',
      'test-key',
      (async () =>
        new Response(JSON.stringify({ data: [{ id: 'whisper-large-v3', category: 'speech' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch,
    )

    expect(result.ok).toBe(true)
    expect(result.models).toHaveLength(1)
    expect(result.models[0]?.modelId).toBe('whisper-large-v3')
  })

  it('keeps every provider spec capability-linked to the capability taxonomy', () => {
    for (const spec of getLiveProviderCatalogSpecs()) {
      expect(spec.provider).toBeTruthy()
      expect(spec.label).toBeTruthy()
      expect(spec.mode).toBeTruthy()
      expect(spec.capabilities.length).toBeGreaterThanOrEqual(0)
      expect(spec.notes).toBeTruthy()
    }
  })
})
