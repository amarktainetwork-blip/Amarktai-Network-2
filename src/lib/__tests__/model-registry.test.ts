/**
 * Model Registry Tests
 *
 * Validates the model registry data integrity, helper functions,
 * and that routing can reliably query models by capability/role/provider.
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  getModelRegistry,
  getModelsByProvider,
  getModelsByCapability,
  getModelsByRole,
  getModelById,
  getEnabledModels,
  getValidatorEligibleModels,
  getModelsForDomain,
  getCheapestModelForCapability,
  getPremiumModelForCapability,
  getDefaultModelForProvider,
  setProviderHealth,
  getProviderHealth,
  clearProviderHealthCache,
  isProviderUsable,
  isProviderDegraded,
  getModelEffectiveHealth,
  getUsableModels,
  getProviderHealthSnapshot,
  type ModelEntry as _ModelEntry,
} from '@/lib/model-registry'

describe('Model Registry', () => {
  describe('getModelRegistry', () => {
    it('returns a non-empty array of model entries', () => {
      const registry = getModelRegistry()
      expect(registry.length).toBeGreaterThan(0)
    })

    it('every model entry has required fields', () => {
      const registry = getModelRegistry()
      for (const model of registry) {
        expect(model.provider).toBeTruthy()
        expect(model.model_id).toBeTruthy()
        expect(model.model_name).toBeTruthy()
        expect(model.family).toBeTruthy()
        expect(model.primary_role).toBeTruthy()
        expect(model.context_window).toBeGreaterThan(0)
        expect(typeof model.enabled).toBe('boolean')
        expect(typeof model.supports_chat).toBe('boolean')
        expect(typeof model.supports_reasoning).toBe('boolean')
        expect(typeof model.validator_eligible).toBe('boolean')
      }
    })

    it('includes models from active providers', () => {
      const registry = getModelRegistry()
      const providers = new Set(registry.map(m => m.provider))
      expect(providers.has('huggingface')).toBe(true)
      expect(providers.has('groq')).toBe(true)
      expect(providers.has('together')).toBe(true)
    })
  })

  describe('getModelsByProvider', () => {
    it('filters models by active provider key', () => {
      const groqModels = getModelsByProvider('groq')
      expect(groqModels.length).toBeGreaterThan(0)
      expect(groqModels.every(m => m.provider === 'groq')).toBe(true)
    })

    it('returns empty array for unknown provider', () => {
      expect(getModelsByProvider('nonexistent')).toEqual([])
    })
  })

  describe('getModelsByCapability', () => {
    it('finds models with chat capability', () => {
      const chatModels = getModelsByCapability('supports_chat')
      expect(chatModels.length).toBeGreaterThan(0)
      expect(chatModels.every(m => m.supports_chat)).toBe(true)
    })

    it('finds models with reasoning capability', () => {
      const reasoningModels = getModelsByCapability('supports_reasoning')
      expect(reasoningModels.length).toBeGreaterThan(0)
      expect(reasoningModels.every(m => m.supports_reasoning)).toBe(true)
    })
  })

  describe('getModelsByRole', () => {
    it('finds models with reasoning role', () => {
      const reasoningModels = getModelsByRole('reasoning')
      expect(reasoningModels.length).toBeGreaterThan(0)
    })

    it('finds models with chat role', () => {
      const chatModels = getModelsByRole('chat')
      expect(chatModels.length).toBeGreaterThan(0)
    })
  })

  describe('getModelById', () => {
    it('finds a specific model by provider and model_id', () => {
      const model = getModelById('groq', 'llama-3.3-70b-versatile')
      expect(model).toBeDefined()
      expect(model?.provider).toBe('groq')
      expect(model?.model_id).toBe('llama-3.3-70b-versatile')
    })

    it('returns undefined for non-existent model', () => {
      expect(getModelById('groq', 'nonexistent')).toBeUndefined()
    })
  })

  describe('getEnabledModels', () => {
    it('returns only enabled models', () => {
      const enabled = getEnabledModels()
      expect(enabled.every(m => m.enabled)).toBe(true)
    })
  })

  describe('getValidatorEligibleModels', () => {
    it('returns only validator-eligible models', () => {
      const validators = getValidatorEligibleModels()
      expect(validators.length).toBeGreaterThan(0)
      expect(validators.every(m => m.validator_eligible)).toBe(true)
    })

    it('validator models support reasoning', () => {
      const validators = getValidatorEligibleModels()
      const reasoningCount = validators.filter(m => m.supports_reasoning).length
      expect(reasoningCount).toBeGreaterThan(0)
    })
  })

  describe('getModelsForDomain', () => {
    it('finds specialist models for coding domain', () => {
      const codingModels = getModelsForDomain('coding')
      expect(codingModels.length).toBeGreaterThan(0)
    })

    it('returns empty for very niche domain', () => {
      const result = getModelsForDomain('quantum_physics')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getCheapestModelForCapability', () => {
    it('returns cheapest chat model', () => {
      const cheapest = getCheapestModelForCapability('supports_chat')
      expect(cheapest).toBeDefined()
      expect(cheapest?.supports_chat).toBe(true)
    })
  })

  describe('getPremiumModelForCapability', () => {
    it('returns premium reasoning model', () => {
      const premium = getPremiumModelForCapability('supports_reasoning')
      expect(premium).toBeDefined()
      expect(premium?.supports_reasoning).toBe(true)
    })
  })

  describe('getDefaultModelForProvider', () => {
    it('returns default model for active providers', () => {
      const providers = ['groq', 'together', 'huggingface']
      for (const provider of providers) {
        const defaultModel = getDefaultModelForProvider(provider)
        expect(defaultModel).toBeTruthy()
        expect(defaultModel).not.toBe('unknown')
      }
    })

    it('throws for unknown provider', () => {
      expect(() => getDefaultModelForProvider('nonexistent')).toThrow(
        'No default model configured for provider "nonexistent"'
      )
    })
  })

  describe('TTS / voice model support', () => {
    it('has at least one TTS-capable model', () => {
      const registry = getModelRegistry()
      const ttsModels = registry.filter(m => m.supports_tts === true)
      expect(ttsModels.length).toBeGreaterThan(0)
    })

    it('TTS models use tts role', () => {
      const registry = getModelRegistry()
      const ttsModels = registry.filter(m => m.supports_tts === true)
      for (const model of ttsModels) {
        expect(['tts', 'voice_interaction']).toContain(model.primary_role)
      }
    })

    it('getModelsByRole returns tts models', () => {
      const ttsModels = getModelsByRole('tts')
      expect(ttsModels.length).toBeGreaterThan(0)
    })
  })

  describe('Provider Health Cache', () => {
    afterEach(() => {
      clearProviderHealthCache()
    })

    it('getProviderHealth returns unconfigured when cache is empty', () => {
      expect(getProviderHealth('groq')).toBe('unconfigured')
    })

    it('setProviderHealth stores and retrieves health status', () => {
      setProviderHealth('groq', 'healthy')
      expect(getProviderHealth('groq')).toBe('healthy')
    })

    it('clearProviderHealthCache resets all entries', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'error')
      clearProviderHealthCache()
      expect(getProviderHealth('groq')).toBe('unconfigured')
      expect(getProviderHealth('together')).toBe('unconfigured')
    })

    it('getProviderHealthSnapshot returns all cached entries', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'degraded')
      const snapshot = getProviderHealthSnapshot()
      expect(snapshot.size).toBe(2)
      expect(snapshot.get('groq')?.status).toBe('healthy')
      expect(snapshot.get('together')?.status).toBe('degraded')
    })

    it('isProviderUsable returns false when cache is empty (strict — prevents false availability)', () => {
      expect(isProviderUsable('groq')).toBe(false)
      expect(isProviderUsable('nonexistent')).toBe(false)
    })

    it('isProviderUsable returns true for healthy or configured providers', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'configured')
      expect(isProviderUsable('groq')).toBe(true)
      expect(isProviderUsable('together')).toBe(true)
    })

    it('isProviderUsable returns false for unconfigured, error, or disabled providers', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'unconfigured')
      setProviderHealth('huggingface', 'error')
      setProviderHealth('mimo', 'disabled')
      expect(isProviderUsable('together')).toBe(false)
      expect(isProviderUsable('huggingface')).toBe(false)
      expect(isProviderUsable('mimo')).toBe(false)
    })

    it('isProviderUsable returns false for degraded providers (not usable, just not excluded)', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'degraded')
      expect(isProviderUsable('together')).toBe(false)
    })

    it('isProviderDegraded correctly identifies degraded providers', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'degraded')
      expect(isProviderDegraded('groq')).toBe(false)
      expect(isProviderDegraded('together')).toBe(true)
    })

    it('getModelEffectiveHealth returns unconfigured when cache is empty', () => {
      const model = getModelById('groq', 'llama-3.3-70b-versatile')!
      expect(getModelEffectiveHealth(model)).toBe('unconfigured')
    })

    it('getModelEffectiveHealth returns provider health when cache is populated', () => {
      setProviderHealth('groq', 'healthy')
      const model = getModelById('groq', 'llama-3.3-70b-versatile')!
      expect(getModelEffectiveHealth(model)).toBe('healthy')
    })

    it('getUsableModels returns zero models when cache is empty (strict mode)', () => {
      const usable = getUsableModels()
      expect(usable.length).toBe(0)
    })

    it('getUsableModels excludes models from unhealthy providers', () => {
      const allEnabled = getEnabledModels()
      const groqCount = allEnabled.filter(m => m.provider === 'groq').length

      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'unconfigured')
      setProviderHealth('huggingface', 'error')
      setProviderHealth('mimo', 'disabled')
      setProviderHealth('genx', 'unconfigured')

      const usable = getUsableModels()
      expect(usable.length).toBe(groqCount)
      expect(usable.every(m => m.provider === 'groq')).toBe(true)
    })

    it('getUsableModels includes models from both healthy and configured providers', () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'configured')
      setProviderHealth('huggingface', 'error')
      setProviderHealth('mimo', 'unconfigured')
      setProviderHealth('genx', 'unconfigured')

      const usable = getUsableModels()
      const providers = new Set(usable.map(m => m.provider))
      expect(providers.has('groq')).toBe(true)
      expect(providers.has('together')).toBe(true)
      expect(providers.has('huggingface')).toBe(false)
    })
  })
})
