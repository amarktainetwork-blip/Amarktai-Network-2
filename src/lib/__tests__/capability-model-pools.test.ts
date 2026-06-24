import { describe, expect, it } from 'vitest'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/ai-capability-taxonomy'
import {
  CAPABILITY_MODEL_POOLS,
  blockedOrProofOnlyModelsFor,
  capabilityPoolStatus,
  evaluateCapabilityModelCandidate,
  getCapabilityModelPool,
  productionAllowedModelsFor,
} from '@/lib/capability-model-pools'

const launchCriticalCapabilities = [
  'chat_text_generation',
  'reasoning',
  'coding_assistant',
  'web_research',
  'embeddings',
  'summarization',
  'translation',
  'text_to_image',
  'image_editing_source_transform',
  'image_to_video',
  'text_to_video_short_clip',
  'long_form_multi_scene_video_assembly',
  'music_song_generation',
  'music_audio_bed_generation',
  'text_to_speech',
  'speech_to_text',
  'captions_subtitles_pipeline',
  'avatar_library_avatar_image_generation',
  'talking_avatar_video',
  'adult_image_generation',
  'adult_video_generation',
  'adult_text_chat',
  'connected_app_capability_execution',
  'agent_request_execution',
  'provider_fallback',
  'route_outcome_logging',
  'worker_job_retry_and_polling_completion',
] as const

describe('Phase 2 capability model pools', () => {
  it('defines every launch-critical capability pool entry', () => {
    for (const capabilityId of launchCriticalCapabilities) {
      expect(getCapabilityModelPool(capabilityId)?.capabilityId).toBe(capabilityId)
    }
  })

  it('keeps Qwen absent from every model pool', () => {
    const modelIds = CAPABILITY_MODEL_POOLS.flatMap((pool) => [
      ...pool.primaryCandidates,
      ...pool.fallbackCandidates,
      ...pool.proofOnlyCandidates,
      ...pool.blockedLowQualityCandidates,
      ...pool.adultOnlyCandidates,
    ]).map((candidate) => `${candidate.provider}:${candidate.model}`.toLowerCase())
    expect(modelIds.some((value) => value.includes('qwen'))).toBe(false)
    expect(modelIds.some((value) => value.includes('dashscope'))).toBe(false)
  })

  it('covers every launch-facing taxonomy/runtime capability through pool aliases or direct entries', () => {
    const launchFacingTaxonomyIds = [
      'chat',
      'reasoning',
      'research',
      'text_generation',
      'translation',
      'summarization',
      'embeddings',
      'text_to_image',
      'image_text_to_image',
      'image_to_video',
      'text_to_video',
      'text_to_speech',
      'automatic_speech_recognition',
      'music_generation',
      'avatar_generation',
      'avatar_video',
    ]
    for (const capabilityId of launchFacingTaxonomyIds) {
      expect(getCapabilityModelPool(capabilityId)).toBeTruthy()
    }
    expect(AI_CAPABILITY_TAXONOMY.find((capability) => capability.id === 'text_to_video')).toBeTruthy()
  })

  it('rejects proof-only, low-quality, and adult-only candidates for production by default', () => {
    expect(evaluateCapabilityModelCandidate({
      capabilityId: 'text_to_video',
      provider: 'genx',
      model: 'grok-imagine-video',
    })).toMatchObject({
      allowed: false,
      reason: 'technical proof only',
    })

    expect(evaluateCapabilityModelCandidate({
      capabilityId: 'long_form_multi_scene_video_assembly',
      provider: 'genx',
      model: 'grok-imagine-video',
    })).toMatchObject({
      allowed: false,
      reason: 'needs quality gate',
    })

    expect(evaluateCapabilityModelCandidate({
      capabilityId: 'adult_image_generation',
      provider: 'huggingface',
      model: 'runwayml/stable-diffusion-v1-5',
    })).toMatchObject({
      allowed: false,
      reason: 'no production-approved model pool candidate',
    })
  })

  it('allows explicit proof-mode access for proof-only routes without making them production-ready', () => {
    expect(evaluateCapabilityModelCandidate({
      capabilityId: 'text_to_video_short_clip',
      provider: 'genx',
      model: 'grok-imagine-video',
      executionMode: 'proof',
    })).toMatchObject({
      allowed: true,
      reason: null,
    })
    expect(productionAllowedModelsFor('text_to_video_short_clip')).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'genx', model: 'veo-3.1', disposition: 'production_allowed' }),
    ]))
  })

  it('marks long-form video as technical proof only', () => {
    expect(capabilityPoolStatus('long_form_multi_scene_video_assembly')).toMatchObject({
      productionReady: false,
      qualityStatus: 'technical_proof_only',
      productionReason: 'needs quality gate',
    })
  })

  it('keeps audio-bed generation distinct from provider-native song generation', () => {
    expect(getCapabilityModelPool('music_audio_bed_generation')?.notes)
      .toContain('not provider-native full song generation')
    expect(getCapabilityModelPool('music_song_generation')?.workflow)
      .toContain('song generation')
  })

  it('keeps music song generation blocked until provider-native song proof exists', () => {
    expect(capabilityPoolStatus('music_song_generation')).toMatchObject({
      productionReady: false,
      qualityStatus: 'blocked',
      productionReason: 'endpoint required',
    })
    expect(blockedOrProofOnlyModelsFor('music_song_generation').map((candidate) => candidate.model))
      .toEqual(expect.arrayContaining(['lyria-2', 'facebook/musicgen-small']))
  })

  it('reports honest replacement status for image edit and image-to-video', () => {
    expect(getCapabilityModelPool('image_editing_source_transform')?.primaryCandidates).toEqual([])
    expect(blockedOrProofOnlyModelsFor('image_editing_source_transform').map((candidate) => candidate.model))
      .not.toContain('veo-3.1')
    expect(capabilityPoolStatus('image_editing_source_transform')).toMatchObject({
      productionReady: false,
      qualityStatus: 'source_wired_unproven',
      productionReason: 'contract missing',
    })
    expect(capabilityPoolStatus('image_to_video')).toMatchObject({
      productionReady: false,
      qualityStatus: 'blocked',
      productionReason: 'contract missing',
    })
  })

  it('does not expose any production-ready default for Studio short video', () => {
    expect(productionAllowedModelsFor('text_to_video_short_clip')).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'genx', model: 'veo-3.1' }),
    ]))
    expect(blockedOrProofOnlyModelsFor('text_to_video_short_clip')).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'genx', model: 'grok-imagine-video', disposition: 'proof_only' }),
      expect.objectContaining({ provider: 'genx', model: 'grok-imagine-video', disposition: 'blocked_low_quality' }),
    ]))
  })
})
