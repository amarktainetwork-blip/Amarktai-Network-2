/**
 * Voice Expansion Tests — Final Voice Pass
 *
 * Verifies:
 *  - STT and TTS models exist for active providers
 *  - Fallback depth across active provider chain
 *  - Realtime voice truthful unavailability with blocker reason
 *  - Provider tiering correctness
 *  - Cost tier accuracy
 *  - HF fallback catalog depth
 *  - Capability engine provider suggestions
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 */

import { describe, it, expect } from 'vitest'
import {
  getModelRegistry,
  getModelsByProvider,
} from '../model-registry'
import {
  resolveCapabilityRoutes,
  BACKEND_ROUTE_EXISTS,
  CAPABILITY_MAP,
  classifyCapabilities,
} from '../capability-engine'
import { getHfFallback, HF_FALLBACK_MODELS } from '../hf-fallback'

/* ================================================================
 * STT EXPANSION TRUTH
 * ================================================================ */

describe('STT Expansion', () => {
  it('has STT models across active providers', () => {
    const all = getModelRegistry()
    const stt = all.filter((m) => 'supports_stt' in m && m.supports_stt)
    expect(stt.length).toBeGreaterThan(0)
  })

  it('has Groq STT models', () => {
    const groq = getModelsByProvider('groq')
    const stt = groq.filter((m) => 'supports_stt' in m && m.supports_stt)
    expect(stt.length).toBeGreaterThan(0)
  })

  it('has HuggingFace STT models', () => {
    const hf = getModelsByProvider('huggingface')
    const stt = hf.filter((m) => 'supports_stt' in m && m.supports_stt)
    expect(stt.length).toBeGreaterThan(0)
  })

  it('STT models span active providers only', () => {
    const all = getModelRegistry()
    const stt = all.filter((m) => 'supports_stt' in m && m.supports_stt)
    const providers = new Set(stt.map((m) => m.provider))
    // Should only contain active providers
    for (const provider of providers) {
      expect(['genx', 'huggingface', 'mimo', 'groq', 'together']).toContain(provider)
    }
  })
})

/* ================================================================
 * TTS EXPANSION TRUTH
 * ================================================================ */

describe('TTS Expansion', () => {
  it('has TTS models across active providers', () => {
    const all = getModelRegistry()
    const tts = all.filter((m) => 'supports_tts' in m && m.supports_tts)
    expect(tts.length).toBeGreaterThan(0)
  })

  it('has Groq TTS models', () => {
    const groq = getModelsByProvider('groq')
    const tts = groq.filter((m) => 'supports_tts' in m && m.supports_tts)
    expect(tts.length).toBeGreaterThan(0)
  })

  it('has HuggingFace TTS models', () => {
    const hf = getModelsByProvider('huggingface')
    const tts = hf.filter((m) => 'supports_tts' in m && m.supports_tts)
    expect(tts.length).toBeGreaterThan(0)
  })

  it('TTS models span active providers only', () => {
    const all = getModelRegistry()
    const tts = all.filter((m) => 'supports_tts' in m && m.supports_tts)
    const providers = new Set(tts.map((m) => m.provider))
    // Should only contain active providers
    for (const provider of providers) {
      expect(['genx', 'huggingface', 'mimo', 'groq', 'together']).toContain(provider)
    }
  })
})

/* ================================================================
 * FALLBACK CHAIN DEPTH
 * ================================================================ */

describe('Fallback Chain Depth', () => {
  it('STT fallback chain covers active providers', () => {
    const all = getModelRegistry()
    const stt = all.filter((m) => 'supports_stt' in m && m.supports_stt)
    const byProvider = new Map<string, number>()
    for (const m of stt) {
      byProvider.set(m.provider, (byProvider.get(m.provider) ?? 0) + 1)
    }
    // Should have models from active providers
    expect(byProvider.get('groq') ?? 0).toBeGreaterThan(0)
    expect(byProvider.get('huggingface') ?? 0).toBeGreaterThan(0)
  })

  it('TTS fallback chain covers active providers', () => {
    const all = getModelRegistry()
    const tts = all.filter((m) => 'supports_tts' in m && m.supports_tts)
    const byProvider = new Map<string, number>()
    for (const m of tts) {
      byProvider.set(m.provider, (byProvider.get(m.provider) ?? 0) + 1)
    }
    // Should have models from active providers
    expect(byProvider.get('groq') ?? 0).toBeGreaterThan(0)
    expect(byProvider.get('huggingface') ?? 0).toBeGreaterThan(0)
  })

  it('Groq STT models have lowest fallback_priority (preferred)', () => {
    const groq = getModelsByProvider('groq')
    const stt = groq.filter((m) => 'supports_stt' in m && m.supports_stt)
    for (const m of stt) {
      expect(m.fallback_priority).toBeLessThanOrEqual(2)
    }
  })

  it('HuggingFace voice models have highest fallback_priority (last resort)', () => {
    const hf = getModelsByProvider('huggingface')
    const voice = hf.filter(
      (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts' in m && m.supports_tts)
    )
    for (const m of voice) {
      expect(m.fallback_priority).toBeGreaterThanOrEqual(8)
    }
  })
})

/* ================================================================
 * REALTIME VOICE TRUTH
 * ================================================================ */

describe('Realtime Voice Truth', () => {
  it('realtime_voice has a backend route (session endpoint + WS service implemented)', () => {
    expect(BACKEND_ROUTE_EXISTS.realtime_voice).toBe(true)
  })

  it('realtime_voice is blocked when REALTIME_SERVICE_URL not set', () => {
    delete process.env.REALTIME_SERVICE_URL
    const result = resolveCapabilityRoutes({ capabilities: ['realtime_voice'] })
    expect(result.routes[0].available).toBe(false)
    expect(result.routes[0].missingMessage).toContain('REALTIME_SERVICE_URL')
  })

  it('realtime_voice classification patterns match via taskType', () => {
    const r1 = classifyCapabilities('realtime_voice', 'start a session')
    expect(r1).toContain('realtime_voice')
  })

  it('voice_input and voice_output ARE available (not blocked)', () => {
    expect(BACKEND_ROUTE_EXISTS.voice_input).toBe(true)
    expect(BACKEND_ROUTE_EXISTS.voice_output).toBe(true)
  })
})

/* ================================================================
 * PROVIDER TIER & COST VERIFICATION
 * ================================================================ */

describe('Provider Tier & Cost Accuracy', () => {
  it('all Groq voice models are backbone tier with low cost', () => {
    const groq = getModelsByProvider('groq')
    const voice = groq.filter(
      (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts' in m && m.supports_tts)
    )
    expect(voice.length).toBeGreaterThan(0)
    for (const m of voice) {
      expect(m.provider_tier).toBe('backbone')
      expect(['free', 'very_low']).toContain(m.cost_tier)
    }
  })

  it('all HuggingFace voice models are free or very low cost', () => {
    const hf = getModelsByProvider('huggingface')
    const voice = hf.filter(
      (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts' in m && m.supports_tts)
    )
    for (const m of voice) {
      expect(['free', 'very_low']).toContain(m.cost_tier)
    }
  })
})

/* ================================================================
 * HF FALLBACK CATALOG DEPTH
 * ================================================================ */

describe('HF Fallback Catalog Depth', () => {
  it('voice_input has HF fallback models in catalog', () => {
    expect(HF_FALLBACK_MODELS.voice_input).toBeDefined()
    expect(HF_FALLBACK_MODELS.voice_input!.length).toBeGreaterThan(0)
  })

  it('voice_output has HF fallback models in catalog', () => {
    expect(HF_FALLBACK_MODELS.voice_output).toBeDefined()
    expect(HF_FALLBACK_MODELS.voice_output!.length).toBeGreaterThan(0)
  })

  it('HF voice_input fallback includes whisper models', () => {
    const models = HF_FALLBACK_MODELS.voice_input!.map((m) => m.model)
    expect(models).toContain('openai/whisper-base')
    expect(models).toContain('openai/whisper-small')
    expect(models).toContain('openai/whisper-large-v3')
  })

  it('HF voice_output fallback includes mms-tts models', () => {
    const models = HF_FALLBACK_MODELS.voice_output!.map((m) => m.model)
    expect(models).toContain('facebook/mms-tts-eng')
    expect(models).toContain('facebook/mms-tts-fra')
  })

  it('HF fallback resolution returns capability for voice_input', () => {
    const result = getHfFallback('voice_input')
    expect(result.capability).toBe('voice_input')
  })

  it('HF fallback resolution returns capability for voice_output', () => {
    const result = getHfFallback('voice_output')
    expect(result.capability).toBe('voice_output')
  })
})

/* ================================================================
 * CAPABILITY ENGINE PROVIDER SUGGESTIONS
 * ================================================================ */

describe('Capability Engine Voice Suggestions', () => {
  it('voice_input suggests active providers only', () => {
    const map = CAPABILITY_MAP as Record<string, { suggestedProviders?: string[] }>
    const providers = map.voice_input.suggestedProviders ?? []
    // Should only contain active providers
    expect(providers).toContain('groq')
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('openai')
    expect(providers).not.toContain('gemini')
    expect(providers).not.toContain('qwen')
  })

  it('voice_output suggests active providers only', () => {
    const map = CAPABILITY_MAP as Record<string, { suggestedProviders?: string[] }>
    const providers = map.voice_output.suggestedProviders ?? []
    // Should only contain active providers
    expect(providers).toContain('groq')
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('openai')
    expect(providers).not.toContain('gemini')
  })

  it('realtime_voice suggests genx only', () => {
    const map = CAPABILITY_MAP as Record<string, { suggestedProviders?: string[] }>
    expect(map.realtime_voice.suggestedProviders).toEqual(['genx'])
  })
})

/* ================================================================
 * TOTAL MODEL COUNT VERIFICATION
 * ================================================================ */

describe('Total Voice Model Count', () => {
  it('total voice models (STT + TTS) exist', () => {
    const all = getModelRegistry()
    const voice = all.filter(
      (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts' in m && m.supports_tts)
    )
    expect(voice.length).toBeGreaterThan(0)
  })

  it('no duplicate voice model IDs within same provider', () => {
    const all = getModelRegistry()
    const voice = all.filter(
      (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts' in m && m.supports_tts)
    )
    const seen = new Set<string>()
    for (const m of voice) {
      const key = `${m.provider}:${m.model_id}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
