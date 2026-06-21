import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('@/lib/crypto-vault', () => ({
  decryptVaultKey: (value: string) => value,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integrationConfig: { findUnique: vi.fn(async () => null) },
    aiProvider: { findUnique: vi.fn(async () => null) },
  },
}))

import { getProviderRuntimeConfigTruth } from '@/lib/provider-runtime-truth'
import { CAPABILITY_REGISTRY } from '@/lib/providers/capability-registry'
import { evaluateProviderCapabilityContract } from '@/lib/providers/provider-capability-contracts'
import { normalizeProviderCatalog } from '@/lib/providers/provider-discovery'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import type { DiscoveredModel, ProviderHealthSnapshot, ProviderId } from '@/lib/providers/provider-types'

const ROOT = path.resolve(__dirname, '../../..')
const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
  delete process.env.TOGETHER_VIDEO_RUNTIME_ENABLED
  delete process.env.TOGETHER_DEDICATED_ENDPOINTS_JSON
  delete process.env.HF_ENDPOINT_RERANK
  delete process.env.HF_SPECIALIST_ENDPOINTS_JSON
  delete process.env.MIMO_RUNTIME_API_ENABLED
  delete process.env.GROQ_API_KEY
})

describe('provider runtime config truth', () => {
  it('detects DB/dashboard mismatch without allowing stale aiProvider health to override integrationConfig credentials', async () => {
    const truth = await getProviderRuntimeConfigTruth('groq', {
      integrationRow: {
        apiKey: 'groq-integration-secret-123456789',
        apiUrl: 'https://runtime.example/openai/v1',
        enabled: true,
      },
      aiProviderRow: {
        apiKey: null,
        baseUrl: 'https://stale.example/v1',
        enabled: false,
        healthStatus: 'error',
        healthMessage: 'old failure',
      },
    })

    expect(truth.credential).toMatchObject({
      present: true,
      source: 'integration_config',
      masked: 'groq...6789',
    })
    expect(truth.db.warnings.join(' ')).toContain('aiProvider.enabled is false')
    expect(truth.db.warnings.join(' ')).toContain('aiProvider health is error')
    expect(truth.baseUrls[0]).toMatchObject({
      currentValue: 'https://runtime.example/openai/v1',
      source: 'integration_config',
    })
  })

  it('makes disabled runtime flags visible with current value, required value, and next action', async () => {
    const truth = await getProviderRuntimeConfigTruth('together', {
      skipDb: true,
      env: { ...originalEnv },
    })
    const flag = truth.runtimeFlags.find((entry) => entry.name === 'TOGETHER_VIDEO_RUNTIME_ENABLED')

    expect(flag).toMatchObject({
      currentValue: 'false',
      requiredValue: 'true',
      blocking: true,
    })
    expect(flag?.nextAction).toContain('TOGETHER_VIDEO_RUNTIME_ENABLED=true')
    expect(truth.blockers.join(' ')).toContain('TOGETHER_VIDEO_RUNTIME_ENABLED=false')
  })

  it('never prints raw secret values in serialized config truth', async () => {
    const rawSecret = 'groq-super-secret-token-abcdef123456'
    const truth = await getProviderRuntimeConfigTruth('groq', {
      skipDb: true,
      env: { ...originalEnv, GROQ_API_KEY: rawSecret },
    })
    const serialized = JSON.stringify(truth)

    expect(truth.credential.present).toBe(true)
    expect(truth.credential.source).toBe('env')
    expect(truth.credential.masked).toBe('groq...3456')
    expect(serialized).not.toContain(rawSecret)
  })
})

describe('provider capability contracts', () => {
  const healthy = (provider: ProviderId): ProviderHealthSnapshot => ({
    provider,
    state: 'healthy',
    configured: true,
    tested: true,
    healthy: true,
    checkedAt: '2026-06-21T00:00:00.000Z',
    detail: 'Live test passed.',
  })
  const capability = (id: string) => CAPABILITY_REGISTRY.find((entry) => entry.id === id)!
  const provider = (id: ProviderId) => PROVIDER_TRUTH.find((entry) => entry.id === id)!
  const model = (input: Partial<DiscoveredModel> & Pick<DiscoveredModel, 'provider' | 'id' | 'capabilities'>): DiscoveredModel => ({
    capabilityEvidence: 'model_metadata',
    status: 'available',
    speed: null,
    quality: null,
    cost: null,
    context: null,
    adult: 'unknown',
    streaming: false,
    research: false,
    artifactSupport: true,
    raw: {},
    discoveredAt: '2026-06-21T00:00:00.000Z',
    ...input,
  })

  it('keeps visible, executable-now, and live-proven as separate states', () => {
    const contract = evaluateProviderCapabilityContract({
      provider: provider('together'),
      model: model({
        provider: 'together',
        id: 'Wan-AI/Wan2.1-T2V-14B',
        capabilities: ['video'],
      }),
      capability: capability('video'),
      health: healthy('together'),
    })

    expect(contract.supportsCapability).toBe(true)
    expect(contract.modelDiscovered).toBe(true)
    expect(contract.runtimeExecutableNow).toBe(false)
    expect(contract.liveProven).toBe(false)
    expect(contract.blockerType).toBe('runtime_flag_disabled')
    expect(contract.nextAction).toContain('TOGETHER_VIDEO_RUNTIME_ENABLED=true')
  })

  it('distinguishes endpoint-required, unsupported, tool-plan-only, and policy-blocked contracts', () => {
    const hfRerank = evaluateProviderCapabilityContract({
      provider: provider('huggingface'),
      model: model({
        provider: 'huggingface',
        id: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        capabilities: ['rerank'],
        metadata: { executable: 'REQUIRES_DEDICATED_ENDPOINT', routeType: 'hf_specialist_endpoint' },
      }),
      capability: capability('rerank'),
      health: healthy('huggingface'),
    })
    const groqImage = evaluateProviderCapabilityContract({
      provider: provider('groq'),
      model: model({ provider: 'groq', id: 'llama-3.3-70b-versatile', capabilities: ['chat'] }),
      capability: capability('image'),
      health: healthy('groq'),
    })
    const mimoTts = evaluateProviderCapabilityContract({
      provider: provider('mimo'),
      model: model({ provider: 'mimo', id: 'mimo-tts-1', capabilities: ['tts'] }),
      capability: capability('tts'),
      health: healthy('mimo'),
    })
    const adultCandidate = evaluateProviderCapabilityContract({
      provider: provider('huggingface'),
      model: model({
        provider: 'huggingface',
        id: 'runwayml/stable-diffusion-v1-5',
        capabilities: ['adult_image'],
        metadata: { executable: 'CATALOG_ONLY', adultGate: true },
      }),
      capability: capability('adult_image'),
      health: healthy('huggingface'),
    })

    expect(hfRerank.blockerType).toBe('specialist_endpoint_required')
    expect(groqImage.blockerType).toBe('unsupported')
    expect(mimoTts.blockerType).toBe('tool_plan_only')
    expect(adultCandidate.blockerType).toBe('policy_blocked')
  })

  it('keeps large provider catalogs visible while contract truth controls executability', () => {
    const genxModels = normalizeProviderCatalog('genx', {
      models: [
        { id: 'gpt-image-2', category: 'image' },
        { id: 'veo-3.1', category: 'video' },
        { id: 'unknown-genx-model', category: 'experimental' },
      ],
    })
    const togetherModels = normalizeProviderCatalog('together', {
      data: [
        { id: 'black-forest-labs/FLUX.1-schnell', type: 'image-generation' },
        { id: 'Wan-AI/Wan2.1-T2V-14B', type: 'video' },
      ],
    })
    const hfModels = normalizeProviderCatalog('huggingface', [
      { id: 'org/runtime-discovered-model', pipeline_tag: 'text-to-image' },
    ])

    expect(genxModels.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      'gpt-image-2',
      'veo-3.1',
      'unknown-genx-model',
    ]))
    expect(togetherModels.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      'black-forest-labs/FLUX.1-schnell',
      'Wan-AI/Wan2.1-T2V-14B',
    ]))
    expect(hfModels.length).toBeGreaterThanOrEqual(1)
    expect(hfModels.every((entry) => entry.discoverySource === 'catalog_derived')).toBe(true)
  })
})

describe('V1 completion tracker', () => {
  it('exists and documents config truth plus dashboard inventory', () => {
    const tracker = fs.readFileSync(path.join(ROOT, 'V1_COMPLETION_TRACKER.md'), 'utf8')

    expect(tracker).toContain('## Config Source Of Truth Status')
    expect(tracker).toContain('## Dashboard And Frontend Missing-Functions Inventory')
    expect(tracker).toContain('Phase 3 - open-source stack install/proof')
  })
})
