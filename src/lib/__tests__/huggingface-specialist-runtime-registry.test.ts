import { beforeEach, describe, expect, it } from 'vitest'
import {
  getAllHfSpecialistRegistryEntries,
  getHfSpecialistDefinition,
  resolveHfSpecialistConfig,
} from '@/lib/hf-specialist-config'
import { normalizeProviderCatalog } from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
import type { ProviderDiscoverySnapshot } from '@/lib/providers/provider-types'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
  delete process.env.HF_SPECIALIST_ENDPOINTS_JSON
})

describe('Hugging Face specialist runtime registry', () => {
  it('loads a single registry covering specialist and adult-gated HF lanes', () => {
    const entries = getAllHfSpecialistRegistryEntries()
    expect(entries.map((entry) => entry.capability)).toEqual(expect.arrayContaining([
      'image_edit',
      'rerank',
      'embeddings',
      'music',
      'tts',
      'stt',
      'video',
      'image_to_video',
      'adult_image',
      'adult_video',
      'adult_avatar',
    ]))
  })

  it('keeps adult specialist entries gated and never production-public', () => {
    const adultImage = getHfSpecialistDefinition('adult_image')
    const adultVideo = getHfSpecialistDefinition('adult_video')
    const adultAvatar = getHfSpecialistDefinition('adult_avatar')

    expect(adultImage?.adultOnly).toBe(true)
    expect(adultVideo?.adultOnly).toBe(true)
    expect(adultAvatar?.adultOnly).toBe(true)
  })

  it('classifies image edit truthfully through the HF router/model API', () => {
    const config = resolveHfSpecialistConfig('image_edit')
    expect(config).toMatchObject({
      configured: true,
      endpointRequired: false,
      endpointSource: 'model_api',
      supportsRouterModelApi: true,
    })
  })

  it('exposes executable embeddings candidates', () => {
    const snapshot: ProviderDiscoverySnapshot = {
      provider: 'huggingface',
      status: 'ready',
      endpoint: 'https://huggingface.co/api/models',
      keySource: 'env',
      discoverySource: 'catalog_derived',
      rawCatalogCount: 2,
      tasks: ['feature-extraction'] as string[],
      inferenceProviders: [] as string[],
      privateEndpoints: [] as string[],
      dedicatedEndpoints: [] as string[],
      discoveredAt: '2026-06-23T00:00:00.000Z',
      expiresAt: '2026-06-23T00:05:00.000Z',
      error: null,
      models: normalizeProviderCatalog('huggingface', [
        { id: 'BAAI/bge-small-en-v1.5', pipeline_tag: 'feature-extraction', available: true },
        { id: 'sentence-transformers/all-MiniLM-L6-v2', pipeline_tag: 'feature-extraction', available: true },
      ]),
    }
    expect(modelsForCapability(snapshot, 'embeddings').map((model) => model.id)).toEqual(expect.arrayContaining([
      'BAAI/bge-small-en-v1.5',
      'sentence-transformers/all-MiniLM-L6-v2',
    ]))
  })

  it('exposes rerank candidates but keeps them specialist-endpoint gated', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'cross-encoder/ms-marco-MiniLM-L-6-v2', pipeline_tag: 'text-ranking', available: true },
      { id: 'BAAI/bge-reranker-base', pipeline_tag: 'text-ranking', available: true },
      { id: 'mixedbread-ai/mxbai-rerank-base-v1', pipeline_tag: 'text-ranking', available: true },
    ])
    expect(models.map((model) => model.id)).toEqual(expect.arrayContaining([
      'cross-encoder/ms-marco-MiniLM-L-6-v2',
      'BAAI/bge-reranker-base',
      'mixedbread-ai/mxbai-rerank-base-v1',
    ]))
    expect(models.every((model) => model.metadata?.executionClassification === 'endpoint_required')).toBe(true)
  })

  it('exposes music candidates but keeps them specialist-endpoint gated', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'facebook/musicgen-small', pipeline_tag: 'text-to-audio', available: true },
      { id: 'stabilityai/stable-audio-open-1.0', pipeline_tag: 'text-to-audio', available: true },
      { id: 'ACE-Step/ACE-Step-v1-3.5B', pipeline_tag: 'text-to-audio', available: true },
    ])
    expect(models.map((model) => model.id)).toEqual(expect.arrayContaining([
      'facebook/musicgen-small',
      'stabilityai/stable-audio-open-1.0',
      'ACE-Step/ACE-Step-v1-3.5B',
    ]))
    expect(models.every((model) => model.metadata?.executionClassification === 'endpoint_required')).toBe(true)
  })

  it('classifies video candidates honestly as endpoint-required', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'Wan-AI/Wan2.1-T2V-14B', pipeline_tag: 'text-to-video', available: true },
      { id: 'Wan-AI/Wan2.1-I2V-14B-480P', pipeline_tag: 'image-to-video', available: true },
    ])
    expect(models.find((model) => model.id === 'Wan-AI/Wan2.1-T2V-14B')?.metadata?.executionClassification).toBe('endpoint_required')
    expect(models.find((model) => model.id === 'Wan-AI/Wan2.1-I2V-14B-480P')?.metadata?.executionClassification).toBe('endpoint_required')
  })

  it('keeps Qwen absent as a provider while allowing Qwen image-edit models through HF only when truthful', () => {
    const qwenModels = normalizeProviderCatalog('huggingface', [
      { id: 'Qwen/Qwen-Image-Edit', pipeline_tag: 'image-to-image', available: true },
    ])
    expect(qwenModels).toHaveLength(1)
    expect(qwenModels[0]).toMatchObject({
      provider: 'huggingface',
      id: 'Qwen/Qwen-Image-Edit',
      capabilities: ['image_edit'],
      capabilityEvidence: 'model_metadata',
      metadata: expect.objectContaining({ executionClassification: 'executable' }),
    })
  })
})
