import { describe, expect, it } from 'vitest'
import { getAppProfile } from '../app-profiles'
import { CAP_TO_MODEL_FLAG } from '../dashboard-truth'
import { getModelRegistry } from '../model-registry'
import { getAllRoutingProfiles } from '../routing-profiles'

describe('Platform expansion contract', () => {
  it('keeps routing profiles backed only by approved provider identities', () => {
    const approved = new Set(['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'])
    for (const profile of getAllRoutingProfiles()) {
      for (const entry of profile.providerTiers) {
        expect(approved.has(entry.provider)).toBe(true)
      }
    }
  })

  it('keeps music generation represented in the canonical model adapter', () => {
    const musicModels = getModelRegistry().filter((model) => model.supports_music_generation)
    expect(musicModels.length).toBeGreaterThan(0)
    expect(musicModels.every((model) => model.provider === 'genx')).toBe(true)
  })

  it('keeps app routing profiles optional and typed', () => {
    const profile = getAppProfile('amarktai-network')
    expect(profile).toBeDefined()
    expect(profile?.routing_profile === undefined || typeof profile.routing_profile === 'string').toBe(true)
  })

  it('keeps required media capability mappings without deleted monetization truth', () => {
    expect(CAP_TO_MODEL_FLAG.music_generation).toBe('supports_music_generation')
    expect(CAP_TO_MODEL_FLAG).not.toHaveProperty('monetization')
    expect(CAP_TO_MODEL_FLAG).not.toHaveProperty('usage_analytics')
  })
})
