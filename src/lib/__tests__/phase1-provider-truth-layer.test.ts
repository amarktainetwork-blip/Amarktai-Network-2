import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProviderKeyWithSource: vi.fn(),
  getMeshTestNotes: vi.fn(),
}))

vi.mock('@/lib/provider-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/provider-config')>()
  return {
    ...actual,
    getProviderKeyWithSource: mocks.getProviderKeyWithSource,
  }
})
vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshTestNotes: mocks.getMeshTestNotes,
}))

import { CAPABILITY_REGISTRY } from '@/lib/providers/capability-registry'
import {
  clearProviderDiscoveryCache,
  discoverProvider,
  normalizeProviderCatalog,
  resolveProviderEndpoint,
} from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import { rejectionForProviderModel, scoreProviderModel } from '@/lib/providers/provider-scoring'
import {
  getProviderTruth,
  planDynamicCapabilityRoute,
  providersForCapability,
} from '@/lib/providers/registry'
import { ROUTING_PROFILES, getRoutingProfile } from '@/lib/providers/routing-profiles'
import {
  CANONICAL_CAPABILITY_IDS,
  CANONICAL_PROVIDER_IDS,
  ROUTING_PROFILE_IDS,
  type DiscoveredModel,
  type ProviderHealthSnapshot,
} from '@/lib/providers/provider-types'
import { getEnvKeyForProvider, getIntegrationKey } from '@/lib/provider-config'

const ROOT = path.resolve(__dirname, '../../..')

describe('Phase 1 provider truth layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearProviderDiscoveryCache()
    mocks.getProviderKeyWithSource.mockResolvedValue({ key: 'test-key', source: 'vault' })
    mocks.getMeshTestNotes.mockResolvedValue({
      lastTestStatus: 'passed',
      lastTestPassed: true,
      lastTestedAt: '2026-06-15T00:00:00.000Z',
      detail: 'Live test passed.',
    })
    delete process.env.HF_PRIVATE_ENDPOINTS_JSON
    delete process.env.HF_DEDICATED_ENDPOINTS_JSON
    delete process.env.HF_ENDPOINT_RERANK
    delete process.env.HF_SPECIALIST_ENDPOINTS_JSON
    delete process.env.TOGETHER_DEDICATED_ENDPOINTS_JSON
    delete process.env.TOGETHER_VIDEO_RUNTIME_ENABLED
    delete process.env.HF_TOKEN
    delete process.env.HUGGINGFACEHUB_API_TOKEN
    delete process.env.HUGGINGFACE_API_KEY
    delete process.env.QWEN_PAID_ENABLED
    delete process.env.MIMO_BASE_URL
  })

  it('publishes only the six canonical providers and 23 canonical capabilities', () => {
    expect(PROVIDER_TRUTH.map((provider) => provider.id)).toEqual([...CANONICAL_PROVIDER_IDS])
    expect(CAPABILITY_REGISTRY.map((capability) => capability.id)).toEqual([
      ...CANONICAL_CAPABILITY_IDS,
    ])
    expect(new Set(PROVIDER_TRUTH.map((provider) => provider.id)).size).toBe(6)
    expect(new Set(CAPABILITY_REGISTRY.map((capability) => capability.id)).size).toBe(23)
  })

  it('records the required provider capability contracts without model IDs', () => {
    expect(getProviderTruth('huggingface')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'reasoning', 'coding', 'vision', 'ocr', 'image', 'video', 'music',
      'tts', 'stt', 'embeddings', 'rerank', 'documents', 'translation', 'avatar',
      'adult_image', 'adult_video',
    ]))
    expect(getProviderTruth('huggingface')?.capabilities).not.toEqual(expect.arrayContaining([
      'adult_text', 'agents',
    ]))
    expect(getProviderTruth('together')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'image', 'video', 'image_to_video', 'tts', 'stt', 'embeddings', 'rerank',
      'adult_image', 'adult_video',
    ]))
    expect(getProviderTruth('groq')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'reasoning', 'coding', 'vision', 'tts', 'stt',
    ]))
    expect(getProviderTruth('groq')?.capabilities).not.toEqual(expect.arrayContaining([
      'image', 'video', 'music', 'embeddings', 'rerank', 'translation', 'documents', 'agents', 'adult_text', 'adult_image', 'adult_video',
    ]))
    expect(getProviderTruth('qwen')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'vision', 'image', 'video', 'image_to_video', 'tts', 'stt',
    ]))
    expect(getProviderTruth('mimo')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'reasoning', 'coding', 'vision', 'tts', 'stt', 'agents',
    ]))
    expect(getProviderTruth('mimo')?.capabilities).not.toEqual(expect.arrayContaining([
      'image', 'voice_clone', 'video', 'music', 'embeddings', 'rerank', 'translation', 'documents', 'adult_text', 'adult_image', 'adult_video',
    ]))
    expect(getProviderTruth('genx')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'reasoning', 'coding', 'image', 'video', 'image_to_video', 'music', 'tts', 'stt', 'avatar',
    ]))
    expect(getProviderTruth('genx')?.capabilities).not.toEqual(expect.arrayContaining([
      'vision', 'documents', 'agents', 'adult_text', 'adult_image', 'adult_video',
    ]))

    const providerDir = path.join(ROOT, 'src/lib/providers')
    const source = fs.readdirSync(providerDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => fs.readFileSync(path.join(providerDir, file), 'utf8'))
      .join('\n')
    expect(source).toContain('function descriptorCapabilities')
    expect(source).toContain('function inferProviderContractCapabilities')
  })

  it('uses provider-native discovery endpoints and token/free-quota truth', () => {
    const huggingface = getProviderTruth('huggingface')!
    const qwen = getProviderTruth('qwen')!
    const mimo = getProviderTruth('mimo')!
    const genx = getProviderTruth('genx')!
    expect(resolveProviderEndpoint(huggingface, 'inference_router'))
      .toBe('https://router.huggingface.co')
    expect(resolveProviderEndpoint(qwen, 'compatible_mode'))
      .toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
    expect(qwen.billing).toMatchObject({
      plan: 'standard_free_quota',
      freeQuotaEligible: true,
      paidEnabledEnv: 'QWEN_PAID_ENABLED',
    })
    expect(resolveProviderEndpoint(mimo, 'token_plan'))
      .toBe('https://token-plan-sgp.xiaomimimo.com/v1')
    expect(resolveProviderEndpoint(genx, 'async_generation'))
      .toBe('https://query.genx.sh/api/v1')
    expect(resolveProviderEndpoint(genx, 'streaming_text'))
      .toBe('https://query.genx.sh/v1')
    expect(huggingface.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
    expect(getProviderTruth('groq')?.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
    expect(mimo.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
    expect(genx.features).toMatchObject({
      streaming: true,
      asyncJobs: true,
      webhooks: false,
      toolCalling: false,
    })
  })

  it('keeps the GenX dashboard test route aligned with the shared runtime normalizer', () => {
    const testRoute = fs.readFileSync(path.join(ROOT, 'src/app/api/admin/settings/test-genx/route.ts'), 'utf8')

    expect(testRoute).toContain("resolveGenXConfig")
    expect(testRoute).toContain("normalizeGenXBaseUrl")
    expect(testRoute).not.toContain('/v1/v1/models')
    expect(testRoute).not.toContain('/v1/api/v1/models')
    expect(testRoute).not.toContain('/api/v1/api/v1/models')
  })

  it('does not fail GenX provider truth solely because chat models are absent', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ id: 'gpt-image-2', category: 'image', type: 'image' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))

    const snapshot = await discoverProvider('genx', {
      fetcher,
      credential: 'genx-live-key',
      keySource: 'vault',
      force: true,
    })

    expect(snapshot.status).toBe('ready')
    expect(snapshot.models.map((model) => model.id)).toContain('gpt-image-2')
    expect(modelsForCapability(snapshot, 'image').map((model) => model.id)).toContain('gpt-image-2')
    expect(modelsForCapability(snapshot, 'chat')).toEqual([])
  })

  it('discovers Hugging Face tasks, inference providers, and configured endpoints', async () => {
    process.env.HF_PRIVATE_ENDPOINTS_JSON = JSON.stringify(['https://private.example'])
    process.env.HF_DEDICATED_ENDPOINTS_JSON = JSON.stringify([
      { url: 'https://dedicated.example' },
    ])
    mocks.getProviderKeyWithSource.mockResolvedValue({ key: null, source: 'missing' })
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 'org/runtime-discovered-model',
      pipeline_tag: 'text-to-image',
      inferenceProviderMapping: { providerA: { status: 'live' } },
      available: true,
    }]), { status: 200 }))

    const result = await discoverProvider('huggingface', { fetcher })

    expect(result.status).toBe('ready')
    expect(result.tasks).toContain('text-to-image')
    expect(result.inferenceProviders).toContain('providerA')
    expect(result.privateEndpoints).toEqual(['https://private.example'])
    expect(result.dedicatedEndpoints).toEqual(['https://dedicated.example'])
    expect(result.models[0]).toMatchObject({
      id: 'org/runtime-discovered-model',
      capabilities: ['image'],
      capabilityEvidence: 'model_metadata',
    })
  })

  it('uses bounded Hugging Face pagination and normalizes more than a tiny curated subset', async () => {
    mocks.getProviderKeyWithSource.mockResolvedValue({ key: null, source: 'missing' })
    const page = (offset: number, count: number) => Array.from({ length: count }, (_, index) => ({
      id: `org/model-${offset + index}`,
      pipeline_tag: index % 2 === 0 ? 'text-generation' : 'text-to-image',
      tags: index % 2 === 0 ? ['instruct'] : ['diffusion'],
      available: true,
    }))
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page(0, 100)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page(100, 100)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page(200, 40)), { status: 200 }))

    const snapshot = await discoverProvider('huggingface', { fetcher, force: true })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(snapshot.rawCatalogCount).toBe(240)
    expect(snapshot.models.length).toBeGreaterThan(15)
    expect(snapshot.models.some((model) => model.capabilities.includes('chat'))).toBe(true)
    expect(snapshot.models.some((model) => model.capabilities.includes('image'))).toBe(true)
  })

  it('maps Hugging Face auth aliases through canonical provider config', () => {
    process.env.HF_TOKEN = 'hf-token-value'

    expect(getIntegrationKey('hf')).toBe('huggingface')
    expect(getIntegrationKey('huggingface')).toBe('huggingface')
    expect(getEnvKeyForProvider('huggingface')).toBe('hf-token-value')

    delete process.env.HF_TOKEN
    process.env.HUGGINGFACEHUB_API_TOKEN = 'hub-token-value'
    expect(getEnvKeyForProvider('huggingface')).toBe('hub-token-value')
  })

  it('derives Hugging Face capability mappings conservatively from model metadata', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'org/runtime-asr', pipeline_tag: 'automatic-speech-recognition', available: true },
      { id: 'org/runtime-rerank', pipeline_tag: 'text-ranking', available: true },
      { id: 'org/runtime-docqa', pipeline_tag: 'document-question-answering', available: true },
      { id: 'org/runtime-vlm', pipeline_tag: 'image-text-to-text', available: true },
    ])

    expect(models.map((model) => [model.id, model.capabilities])).toEqual([
      ['org/runtime-asr', ['stt']],
      ['org/runtime-rerank', ['rerank']],
      ['org/runtime-docqa', ['documents', 'ocr']],
      ['org/runtime-vlm', ['vision', 'ocr', 'image']],
    ])
    expect(models.find((model) => model.id === 'org/runtime-rerank')?.metadata).toMatchObject({
      executable: 'REQUIRES_DEDICATED_ENDPOINT',
      executionClassification: 'endpoint_required',
      endpointEnv: 'HF_ENDPOINT_RERANK',
    })
  })

  it('keeps Hugging Face TTS, STT, and image edit specialist blockers aligned in normalized discovery', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'org/runtime-image-edit', pipeline_tag: 'image-to-image', available: true },
      { id: 'org/runtime-tts', pipeline_tag: 'text-to-speech', available: true },
      { id: 'org/runtime-asr', pipeline_tag: 'automatic-speech-recognition', available: true },
    ])

    expect(models.find((model) => model.id === 'org/runtime-image-edit')?.metadata).toMatchObject({
      executable: 'REQUIRES_DEDICATED_ENDPOINT',
      executionClassification: 'endpoint_required',
      endpointEnv: 'HF_ENDPOINT_IMAGE_EDIT',
    })
    expect(models.find((model) => model.id === 'org/runtime-tts')?.metadata).toMatchObject({
      executable: 'REQUIRES_DEDICATED_ENDPOINT',
      executionClassification: 'endpoint_required',
      endpointEnv: 'HF_ENDPOINT_TTS',
    })
    expect(models.find((model) => model.id === 'org/runtime-asr')?.metadata).toMatchObject({
      executable: 'REQUIRES_DEDICATED_ENDPOINT',
      executionClassification: 'endpoint_required',
      endpointEnv: 'HF_ENDPOINT_STT',
    })
  })

  it('allows bounded Hugging Face provider-contract fallback without making specialist routes executable', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: 'org/runtime-text-model', available: true },
    ]), { status: 200 }))
    const snapshot = await discoverProvider('huggingface', { fetcher, capability: 'translation', force: true })

    expect(modelsForCapability(snapshot, 'translation').some((model) =>
      model.id === 'org/runtime-text-model'
      && model.capabilityEvidence === 'provider_contract'
      && model.capabilities.includes('translation'),
    )).toBe(true)
    expect(modelsForCapability(snapshot, 'rerank')).toEqual([])
  })

  it('caches provider discovery and does not invent fallback models', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'runtime-model', capabilities: ['chat'], available: true }],
    }), { status: 200 }))

    const first = await discoverProvider('groq', { fetcher })
    const second = await discoverProvider('groq', { fetcher })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)

    clearProviderDiscoveryCache('groq')
    const emptyFetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [] }),
      { status: 200 },
    ))
    const empty = await discoverProvider('groq', { fetcher: emptyFetcher })
    expect(empty.models).toEqual([])
  })

  it('uses provider-contract evidence when a live catalog omits model task metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'runtime-catalog-model', object: 'model', active: true }],
    }), { status: 200 }))
    const snapshot = await discoverProvider('groq', { fetcher })
    expect(snapshot.models[0]).toMatchObject({
      id: 'runtime-catalog-model',
      capabilities: [],
      capabilityEvidence: 'unknown',
    })
    expect(modelsForCapability(snapshot, 'chat')[0]).toMatchObject({
      id: 'runtime-catalog-model',
      capabilities: ['chat'],
      capabilityEvidence: 'provider_contract',
    })
    expect(modelsForCapability(snapshot, 'image')).toEqual([])
  })

  it('derives capability metadata from dynamic catalog descriptors without fixed model IDs', () => {
    const models = normalizeProviderCatalog('together', {
      data: [
        { id: 'vendor/runtime-transcription', type: 'speech-to-text' },
        { id: 'vendor/runtime-picture', type: 'image-generation' },
        { id: 'vendor/runtime-ranker', type: 'reranking' },
        { id: 'black-forest-labs/FLUX.1-schnell', type: 'image-generation' },
      ],
    })
    expect(models.map((model) => [model.id, model.capabilities])).toEqual([
      ['vendor/runtime-transcription', ['stt']],
      ['vendor/runtime-picture', ['image']],
      ['vendor/runtime-ranker', ['rerank']],
      ['black-forest-labs/FLUX.1-schnell', ['image']],
    ])
    expect(models.find((model) => model.id === 'vendor/runtime-ranker')?.metadata).toMatchObject({
      executable: 'REQUIRES_DEDICATED_ENDPOINT',
      executionClassification: 'endpoint_required',
      endpointEnv: 'TOGETHER_DEDICATED_ENDPOINTS_JSON',
    })
    expect(modelsForCapability({
      provider: 'together',
      status: 'ready',
      endpoint: 'https://api.together.ai/v1/models',
      keySource: 'test',
      models,
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: [],
      dedicatedEndpoints: [],
      discoveredAt: '2026-06-21T00:00:00.000Z',
      expiresAt: '2026-06-21T00:05:00.000Z',
      error: null,
    }, 'image_edit')).toEqual([])
  })

  it('maps Groq auth aliases and discovery metadata conservatively', () => {
    process.env.GROQ_API_KEY = 'groq-token-value'

    expect(getIntegrationKey('groq')).toBe('groq')
    expect(getEnvKeyForProvider('groq')).toBe('groq-token-value')

    const models = normalizeProviderCatalog('groq', {
      data: [
        { id: 'groq/runtime-vision', type: 'image-text-to-text', available: true },
        { id: 'groq/runtime-tts', type: 'speech-generation', available: true },
        { id: 'groq/runtime-asr', type: 'speech-to-text', available: true },
      ],
    })

    expect(models.map((model) => [model.id, model.capabilities])).toEqual([
      ['groq/runtime-vision', ['vision', 'ocr']],
      ['groq/runtime-tts', ['tts']],
      ['groq/runtime-asr', ['stt']],
    ])
  })

  it('maps MiMo auth aliases and discovery metadata conservatively', () => {
    process.env.XIAOMI_API_KEY = 'mimo-token-value'

    expect(getIntegrationKey('mimo')).toBe('mimo')
    expect(getEnvKeyForProvider('mimo')).toBe('mimo-token-value')

    const models = normalizeProviderCatalog('mimo', {
      data: [
        { id: 'mimo/runtime-tts', type: 'speech-generation', available: true },
        { id: 'mimo/runtime-asr', type: 'speech-to-text', available: true },
        { id: 'mimo/runtime-vision', type: 'image-text-to-text', available: true },
        { id: 'mimo/runtime-agent', type: 'tool-calling', available: true },
        { id: 'mimo/runtime-code', type: 'code', available: true },
      ],
    })

    expect(models.map((model) => [model.id, model.capabilities])).toEqual([
      ['mimo/runtime-tts', ['tts']],
      ['mimo/runtime-asr', ['stt']],
      ['mimo/runtime-vision', ['vision', 'ocr']],
      ['mimo/runtime-agent', ['agents']],
      ['mimo/runtime-code', ['coding']],
    ])
    expect(models.find((model) => model.id === 'mimo/runtime-asr')?.metadata?.executionClassification).toBe('blocked_by_policy')
    expect(models.find((model) => model.id === 'mimo/runtime-asr')?.metadata?.executable).toBe('CATALOG_ONLY')
    expect(models.find((model) => model.id === 'mimo/runtime-vision')?.metadata?.executionClassification).toBe('executable')
  })

  it('keeps MiMo specialist routes catalog-visible but not executable while the runtime flag is disabled', () => {
    const models = normalizeProviderCatalog('mimo', {
      data: [
        { id: 'mimo/runtime-tts', type: 'speech-generation', available: true },
        { id: 'mimo/runtime-asr', type: 'speech-to-text', available: true },
        { id: 'mimo/runtime-agent', type: 'tool-calling', available: true },
      ],
    })

    expect(models.find((model) => model.id === 'mimo/runtime-tts')?.metadata).toMatchObject({
      executable: 'CATALOG_ONLY',
      executionClassification: 'blocked_by_policy',
    })
    expect(models.find((model) => model.id === 'mimo/runtime-asr')?.metadata).toMatchObject({
      executable: 'CATALOG_ONLY',
      executionClassification: 'blocked_by_policy',
    })
    expect(models.find((model) => model.id === 'mimo/runtime-agent')?.metadata).toMatchObject({
      executable: 'ADAPTER_MISSING',
      executionClassification: 'adapter_missing',
    })
  })

  it('does not fabricate MiMo unsupported routes from empty catalogs', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'mimo-runtime-model', object: 'model', active: true }],
    }), { status: 200 }))

    const snapshot = await discoverProvider('mimo', { fetcher, force: true })

    expect(snapshot.models[0]).toMatchObject({
      id: 'mimo-runtime-model',
      capabilities: [],
      capabilityEvidence: 'unknown',
    })
    expect(modelsForCapability(snapshot, 'chat')[0]).toMatchObject({
      id: 'mimo-runtime-model',
      capabilities: ['chat'],
      capabilityEvidence: 'provider_contract',
    })
    expect(modelsForCapability(snapshot, 'tts')[0]).toMatchObject({
      id: 'mimo-runtime-model',
      capabilities: ['tts'],
      capabilityEvidence: 'provider_contract',
    })
    expect(modelsForCapability(snapshot, 'stt')).toEqual([])
    expect(modelsForCapability(snapshot, 'vision')).toEqual([])
    expect(modelsForCapability(snapshot, 'image')).toEqual([])
    expect(modelsForCapability(snapshot, 'agents')).toEqual([])
    expect(modelsForCapability(snapshot, 'voice_clone')).toEqual([])
  })

  it('rejects MiMo catalog-exposed media and STT models until adapters exist', () => {
    const imageCapability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'image')!
    const provider = getProviderTruth('mimo')!
    const health: ProviderHealthSnapshot = {
      provider: 'mimo',
      state: 'healthy',
      configured: true,
      tested: true,
      healthy: true,
      checkedAt: '2026-06-15T00:00:00.000Z',
      detail: 'Healthy',
    }
    const imageModel = normalizeProviderCatalog('mimo', {
      data: [{ id: 'mimo-image-runtime', type: 'text-to-image', available: true }],
    })[0]

    expect(imageModel).toMatchObject({
      capabilities: ['image'],
      metadata: { executable: 'ADAPTER_MISSING' },
    })
    expect(rejectionForProviderModel({
      provider,
      model: imageModel,
      capability: imageCapability,
      health,
      profile: getRoutingProfile('balanced'),
    })).toMatchObject({
      code: 'ADAPTER_MISSING',
      reason: expect.stringContaining('no canonical adapter is wired'),
    })
  })

  it('does not fabricate Groq agent/tool-calling routes from empty catalogs', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'groq-runtime-model', object: 'model', active: true }],
    }), { status: 200 }))

    const snapshot = await discoverProvider('groq', { fetcher, force: true })

    expect(snapshot.models[0]).toMatchObject({
      id: 'groq-runtime-model',
      capabilities: [],
      capabilityEvidence: 'unknown',
    })
    expect(modelsForCapability(snapshot, 'chat')[0]).toMatchObject({
      id: 'groq-runtime-model',
      capabilities: ['chat'],
      capabilityEvidence: 'provider_contract',
    })
    expect(modelsForCapability(snapshot, 'agents')).toEqual([])
  })

  it('filters Hugging Face discovery by the requested task family', async () => {
    mocks.getProviderKeyWithSource.mockResolvedValue({ key: null, source: 'missing' })
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    await discoverProvider('huggingface', {
      fetcher,
      capability: 'stt',
      force: true,
    })
    expect(String(fetcher.mock.calls[0][0])).toContain('pipeline_tag=automatic-speech-recognition')
  })

  it('provides all global profiles without provider ordering or model defaults', () => {
    expect(Object.keys(ROUTING_PROFILES)).toEqual([...ROUTING_PROFILE_IDS])
    for (const profile of Object.values(ROUTING_PROFILES)) {
      expect(Object.keys(profile.weights)).toEqual(expect.arrayContaining([
        'quality', 'speed', 'cost', 'availability', 'adult', 'research',
        'streaming', 'health', 'artifactSupport',
      ]))
      expect(profile).not.toHaveProperty('providerTiers')
      expect(profile).not.toHaveProperty('defaultModel')
    }
    const custom = getRoutingProfile('custom', {
      speed: 1,
      quality: 0.8,
      cost: 0.6,
      research: 0.4,
      adult: true,
      streaming: true,
      providerPreference: ['groq'],
      modelPreference: ['runtime-model'],
    })
    expect(custom.weights.speed).toBeGreaterThan(ROUTING_PROFILES.custom.weights.speed)
    expect(custom.weights.quality).toBeGreaterThan(ROUTING_PROFILES.custom.weights.quality)
    expect(custom.weights.cost).toBeGreaterThan(ROUTING_PROFILES.custom.weights.cost)
    expect(custom.weights.research).toBeGreaterThan(ROUTING_PROFILES.custom.weights.research)
    expect(custom.preferences).toMatchObject({
      adult: true,
      streaming: true,
      providerPreference: ['groq'],
      modelPreference: ['runtime-model'],
    })
  })

  it('scores discovered evidence and enforces adult, streaming, and billing gates', () => {
    const provider = getProviderTruth('qwen')!
    const capability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'image')!
    const health: ProviderHealthSnapshot = {
      provider: 'qwen',
      state: 'healthy',
      configured: true,
      tested: true,
      healthy: true,
      checkedAt: '2026-06-15T00:00:00.000Z',
      detail: 'Healthy',
    }
    const model: DiscoveredModel = {
      provider: 'qwen',
      id: 'runtime-model',
      capabilities: ['image'],
      capabilityEvidence: 'model_metadata',
      status: 'available',
      speed: 0.8,
      quality: 0.9,
      cost: 0.2,
      context: null,
      adult: 'unknown',
      streaming: true,
      research: false,
      artifactSupport: true,
      raw: { free_quota_eligible: false },
      discoveredAt: '2026-06-15T00:00:00.000Z',
    }
    expect(scoreProviderModel({
      provider,
      model,
      capability,
      health,
      profile: getRoutingProfile('balanced'),
    })).toBeNull()

    process.env.QWEN_PAID_ENABLED = 'false'
    expect(scoreProviderModel({
      provider,
      model,
      capability,
      health,
      profile: getRoutingProfile('balanced'),
    })).toBeNull()

    expect(scoreProviderModel({
      provider,
      model: { ...model, raw: { free_quota_eligible: true } },
      capability,
      health: { ...health, state: 'degraded', healthy: false },
      profile: getRoutingProfile('balanced'),
    })).toBeNull()

    process.env.QWEN_PAID_ENABLED = 'true'
    expect(scoreProviderModel({
      provider,
      model,
      capability,
      health,
      profile: getRoutingProfile('balanced', {
        streaming: true,
        artifactSupport: true,
      }),
    })?.score).toBeGreaterThan(0)

    const adultCapability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'adult_image')!
    const adultModel = { ...model, capabilities: ['adult_image' as const] }
    expect(scoreProviderModel({
      provider: getProviderTruth('huggingface')!,
      model: { ...adultModel, provider: 'huggingface' },
      capability: adultCapability,
      health: { ...health, provider: 'huggingface' },
      profile: getRoutingProfile('balanced'),
    })).toBeNull()
  })

  it('rejects duration-capped music candidates for longer requested songs', () => {
    const provider = getProviderTruth('genx')!
    const capability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'music')!
    const health: ProviderHealthSnapshot = {
      provider: 'genx',
      state: 'healthy',
      configured: true,
      tested: true,
      healthy: true,
      checkedAt: '2026-06-15T00:00:00.000Z',
      detail: 'Healthy',
    }
    const model: DiscoveredModel = {
      provider: 'genx',
      id: 'lyria-3-clip-preview',
      capabilities: ['music'],
      capabilityEvidence: 'provider_contract',
      status: 'available',
      speed: 0.8,
      quality: 0.9,
      cost: 0.4,
      context: null,
      adult: 'unknown',
      streaming: false,
      research: false,
      artifactSupport: true,
      metadata: {
        executable: true,
        executionClassification: 'executable',
        providerLimitSeconds: 30,
      },
      raw: {},
      discoveredAt: '2026-06-15T00:00:00.000Z',
    }
    const profile = getRoutingProfile('balanced', { durationSeconds: 90, artifactSupport: true })

    expect(scoreProviderModel({ provider, model, capability, health, profile })).toBeNull()
    expect(rejectionForProviderModel({ provider, model, capability, health, profile })).toMatchObject({
      code: 'DURATION_LIMITED',
      reason: 'Requested duration 90s exceeds provider/model limit 30s.',
    })
  })

  it('rejects rerank models that require dedicated or specialist endpoints before execution', () => {
    const capability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'rerank')!
    const profile = getRoutingProfile('balanced')
    const health: ProviderHealthSnapshot = {
      provider: 'together',
      state: 'healthy',
      configured: true,
      tested: true,
      healthy: true,
      checkedAt: '2026-06-21T00:00:00.000Z',
      detail: 'Healthy',
    }
    const together = PROVIDER_TRUTH.find((entry) => entry.id === 'together')!
    const huggingface = PROVIDER_TRUTH.find((entry) => entry.id === 'huggingface')!
    const model = (provider: 'together' | 'huggingface'): DiscoveredModel => ({
      provider,
      id: provider === 'together' ? 'vendor/runtime-ranker' : 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      capabilities: ['rerank'],
      capabilityEvidence: 'model_metadata',
      status: 'available',
      speed: 0.5,
      quality: 0.5,
      cost: 0.5,
      context: null,
      adult: 'unknown',
      streaming: false,
      research: false,
      artifactSupport: false,
      raw: {},
      discoveredAt: '2026-06-21T00:00:00.000Z',
    })

    expect(scoreProviderModel({ provider: together, model: model('together'), capability, health, profile })).toBeNull()
    expect(rejectionForProviderModel({ provider: together, model: model('together'), capability, health, profile })).toMatchObject({
      code: 'DEDICATED_ENDPOINT_REQUIRED',
      reason: expect.stringContaining('dedicated endpoint'),
    })
    expect(scoreProviderModel({
      provider: huggingface,
      model: model('huggingface'),
      capability,
      health: { ...health, provider: 'huggingface' },
      profile,
    })).toBeNull()
    expect(rejectionForProviderModel({
      provider: huggingface,
      model: model('huggingface'),
      capability,
      health: { ...health, provider: 'huggingface' },
      profile,
    })).toMatchObject({
      code: 'DEDICATED_ENDPOINT_REQUIRED',
      reason: expect.stringContaining('specialist endpoint'),
    })
  })

  it('keeps image-to-video on Qwen while skipping default-disabled Together video runtime', () => {
    const capability = CAPABILITY_REGISTRY.find((entry) => entry.id === 'image_to_video')!
    const profile = getRoutingProfile('balanced', { artifactSupport: true })
    const qwen = PROVIDER_TRUTH.find((entry) => entry.id === 'qwen')!
    const together = PROVIDER_TRUTH.find((entry) => entry.id === 'together')!
    const health: ProviderHealthSnapshot = {
      provider: 'qwen',
      state: 'healthy',
      configured: true,
      tested: true,
      healthy: true,
      checkedAt: '2026-06-21T00:00:00.000Z',
      detail: 'Healthy',
    }
    const qwenModel: DiscoveredModel = {
      provider: 'qwen',
      id: 'wan2.1-i2v-turbo',
      capabilities: ['image_to_video'],
      capabilityEvidence: 'provider_contract',
      status: 'available',
      speed: 0.5,
      quality: 0.7,
      cost: 0.4,
      context: null,
      adult: 'unknown',
      streaming: false,
      research: false,
      artifactSupport: true,
      raw: {},
      discoveredAt: '2026-06-21T00:00:00.000Z',
    }
    const togetherModel: DiscoveredModel = {
      ...qwenModel,
      provider: 'together',
      id: 'Wan-AI/Wan2.1-I2V-14B',
      raw: {},
    }

    expect(scoreProviderModel({ provider: qwen, model: qwenModel, capability, health, profile })).toMatchObject({
      provider: 'qwen',
      model: { id: 'wan2.1-i2v-turbo' },
    })
    expect(scoreProviderModel({
      provider: together,
      model: togetherModel,
      capability,
      health: { ...health, provider: 'together' },
      profile,
    })).toBeNull()
    expect(rejectionForProviderModel({
      provider: together,
      model: togetherModel,
      capability,
      health: { ...health, provider: 'together' },
      profile,
    })).toMatchObject({
      code: 'DEDICATED_ENDPOINT_REQUIRED',
      reason: expect.stringContaining('/videos returned HTTP 404'),
    })
  })

  it('plans from discovery evidence and never selects an undiscovered model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({
        data: [{
          id: 'runtime-chat-model',
          capabilities: ['chat'],
          available: true,
          quality: 0.8,
          speed: 0.8,
          cost: 0.2,
        }],
      }), { status: 200 }),
    )
    const plan = await planDynamicCapabilityRoute({
      capability: 'chat',
      profile: 'best_available',
    })
    expect(plan.selected?.model.id).toBe('runtime-chat-model')
    expect(plan.candidates.length).toBeGreaterThan(0)
    expect(providersForCapability('chat').map((provider) => provider.id))
      .toEqual(expect.arrayContaining(['huggingface', 'together', 'groq', 'genx', 'qwen', 'mimo']))

    fetchMock.mockRestore()
    clearProviderDiscoveryCache()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [] }),
      { status: 200 },
    ))
    const empty = await planDynamicCapabilityRoute({ capability: 'chat' })
    expect(empty.selected).toBeNull()
    expect(empty.reason).toContain('model metadata or provider-contract evidence')
    vi.restoreAllMocks()
  })

  it('exposes Brain selector policy, fallback, and rejected candidate evidence', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({
        data: [{
          id: 'runtime-chat-model',
          capabilities: ['chat'],
          available: true,
          quality: 0.7,
          speed: 0.7,
          cost: 0.4,
        }],
      }), { status: 200 }),
    )

    const premium = await planDynamicCapabilityRoute({
      capability: 'chat',
      profile: 'premium',
    })
    expect(premium.selected?.provider).toBe('genx')
    expect(premium.fallbackChain.length).toBeGreaterThan(0)
    expect(premium.reason).toContain('GenX')

    clearProviderDiscoveryCache()
    const pinned = await planDynamicCapabilityRoute({
      capability: 'chat',
      profile: 'pinned',
      preferences: {
        providerPreference: ['groq'],
        modelPreference: ['missing-model'],
      },
      fallbackAllowed: false,
    })
    expect(pinned.selected).toBeNull()
    expect(pinned.fallbackAllowed).toBe(false)
    expect(pinned.providerPin).toBe('groq')
    expect(pinned.modelPin).toBe('missing-model')
    expect(pinned.rejectedCandidates.some((entry) => entry.code === 'MODEL_NOT_PINNED')).toBe(true)

    fetchMock.mockRestore()
  })
})
