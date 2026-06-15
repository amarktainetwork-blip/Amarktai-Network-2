import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProviderKeyWithSource: vi.fn(),
  getMeshTestNotes: vi.fn(),
}))

vi.mock('@/lib/provider-config', () => ({
  getProviderKeyWithSource: mocks.getProviderKeyWithSource,
}))
vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshTestNotes: mocks.getMeshTestNotes,
}))

import { CAPABILITY_REGISTRY } from '@/lib/providers/capability-registry'
import {
  clearProviderDiscoveryCache,
  discoverProvider,
  resolveProviderEndpoint,
} from '@/lib/providers/provider-discovery'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import { scoreProviderModel } from '@/lib/providers/provider-scoring'
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
    delete process.env.QWEN_PAID_ENABLED
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
      'adult_text', 'adult_image', 'adult_video', 'agents',
    ]))
    expect(getProviderTruth('together')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'image', 'video', 'tts', 'stt', 'embeddings', 'rerank',
    ]))
    expect(getProviderTruth('groq')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'reasoning', 'coding', 'vision', 'tts', 'stt', 'agents',
    ]))
    expect(getProviderTruth('qwen')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'vision', 'image', 'video', 'image_to_video',
    ]))
    expect(getProviderTruth('mimo')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'coding', 'vision', 'tts', 'stt', 'voice_clone',
    ]))
    expect(getProviderTruth('genx')?.capabilities).toEqual(expect.arrayContaining([
      'chat', 'image', 'video', 'music', 'tts', 'stt', 'avatar',
    ]))

    const providerDir = path.join(ROOT, 'src/lib/providers')
    const source = fs.readdirSync(providerDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => fs.readFileSync(path.join(providerDir, file), 'utf8'))
      .join('\n')
    expect(source).not.toMatch(/\b(flux|veo|kling|qwen-image)\b/i)
    expect(source).not.toMatch(/\bwan(?:[-_.\d]|$)/i)
  })

  it('uses provider-native discovery endpoints and token/free-quota truth', () => {
    const qwen = getProviderTruth('qwen')!
    const mimo = getProviderTruth('mimo')!
    const genx = getProviderTruth('genx')!
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
    expect(genx.features).toMatchObject({
      streaming: true,
      asyncJobs: true,
      webhooks: true,
    })
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
    expect(empty.reason).toContain('No configured provider returned model-level capability evidence')
    vi.restoreAllMocks()
  })
})
