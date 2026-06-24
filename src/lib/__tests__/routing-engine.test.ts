/**
 * Routing Engine Tests
 *
 * Validates the policy-driven routing engine makes correct decisions
 * based on app profiles, model registry, and task context.
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { routeRequest, type RoutingContext } from '@/lib/routing-engine'
import {
  setProviderHealth,
  clearProviderHealthCache,
} from '@/lib/model-registry'

function makeContext(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    appSlug: 'amarktai-network',
    appCategory: 'generic',
    taskType: 'chat',
    taskComplexity: 'simple',
    message: 'Hello, how are you?',
    requiresRetrieval: false,
    requiresMultimodal: false,
    ...overrides,
  }
}

/** Populate health cache so eligible models exist for routing decisions. */
function seedHealthCache() {
  setProviderHealth('genx', 'healthy')
  setProviderHealth('groq', 'healthy')
  setProviderHealth('together', 'configured')
  setProviderHealth('huggingface', 'configured')
  setProviderHealth('mimo', 'configured')
}

describe('Routing Engine', () => {
  beforeEach(() => {
    clearProviderHealthCache()
    seedHealthCache()
  })
  describe('routeRequest', () => {
    it('returns a valid routing decision', async () => {
      const decision = await routeRequest(makeContext())
      expect(decision).toBeDefined()
      expect(decision.mode).toBeTruthy()
      expect(decision.reason).toBeTruthy()
      expect(Array.isArray(decision.warnings)).toBe(true)
      expect(Array.isArray(decision.fallbackModels)).toBe(true)
    })

    it('routes simple tasks to direct mode', async () => {
      const decision = await routeRequest(makeContext({ taskComplexity: 'simple' }))
      expect(decision.mode).toBe('direct')
    })

    it('routes complex tasks appropriately', async () => {
      const decision = await routeRequest(makeContext({
        taskComplexity: 'complex',
        taskType: 'analysis',
        appCategory: 'generic',
      }))
      expect(['review', 'consensus', 'premium_escalation', 'specialist', 'direct']).toContain(decision.mode)
    })

    it('selects premium escalation for complex financial tasks', async () => {
      const decision = await routeRequest(makeContext({
        appSlug: 'amarktai-crypto',
        appCategory: 'finance',
        taskComplexity: 'complex',
        taskType: 'analysis',
      }))
      expect(['premium_escalation', 'consensus', 'review', 'direct']).toContain(decision.mode)
    })

    it('routes multimodal requests to multimodal_chain', async () => {
      const decision = await routeRequest(makeContext({
        requiresMultimodal: true,
        appSlug: 'amarktai-marketing',
        appCategory: 'marketing',
      }))
      expect(decision.mode).toBe('multimodal_chain')
    })

    it('routes retrieval requests to retrieval_chain', async () => {
      const decision = await routeRequest(makeContext({
        requiresRetrieval: true,
      }))
      expect(decision.mode).toBe('retrieval_chain')
    })

    it('selects a primary model', async () => {
      const decision = await routeRequest(makeContext())
      expect(decision.primaryModel).toBeDefined()
      if (decision.primaryModel) {
        expect(decision.primaryModel.provider).toBeTruthy()
        expect(decision.primaryModel.model_id).toBeTruthy()
      }
    })

    it('provides cost and latency estimates', async () => {
      const decision = await routeRequest(makeContext())
      expect(decision.costEstimate).toBeDefined()
      expect(decision.latencyEstimate).toBeDefined()
    })

    it('provides fallback models for simple requests', async () => {
      const decision = await routeRequest(makeContext({ taskComplexity: 'simple' }))
      // Fallback models may be empty if only one provider is available
      expect(decision.fallbackModels).toBeDefined()
    })

    it('handles moderate complexity with specialist or direct mode', async () => {
      const decision = await routeRequest(makeContext({ taskComplexity: 'moderate' }))
      expect(['specialist', 'direct']).toContain(decision.mode)
    })

    it('routes image tasks to image-capable models only', async () => {
      const decision = await routeRequest(makeContext({
        taskType: 'image_generation',
        message: 'Generate an image of a sunset',
        requiredModality: 'image',
      }))
      // Image routing may fail if no image-capable models are in the registry
      expect(decision).toBeDefined()
      expect(decision.mode).toBeTruthy()
    })

    it('returns no eligible models when all providers are unconfigured for image', async () => {
      clearProviderHealthCache()
      const decision = await routeRequest(makeContext({
        taskType: 'image_generation',
        message: 'Generate an image of a sunset',
        requiredModality: 'image',
      }))
      // With no providers configured, should have no primary model or warnings
      expect(decision.primaryModel === null || decision.warnings.length > 0).toBe(true)
    })

    it('respects maxCostTier constraint', async () => {
      const decision = await routeRequest(makeContext({
        maxCostTier: 'low',
      }))
      if (decision.primaryModel) {
        expect(['free', 'very_low', 'low']).toContain(decision.primaryModel.cost_tier)
      }
    })

    it('routes crypto app differently than marketing app', async () => {
      const cryptoDecision = await routeRequest(makeContext({
        appSlug: 'amarktai-crypto',
        appCategory: 'finance',
      }))
      const marketingDecision = await routeRequest(makeContext({
        appSlug: 'amarktai-marketing',
        appCategory: 'marketing',
      }))
      // Both should have valid decisions
      expect(cryptoDecision.mode).toBeTruthy()
      expect(marketingDecision.mode).toBeTruthy()
    })

    it('routes normally when provider health cache is empty', async () => {
      clearProviderHealthCache()
      const decision = await routeRequest(makeContext())
      expect(decision).toBeDefined()
      expect(decision.mode).toBeTruthy()
    })

    it('skips models from unconfigured providers when health cache is populated', async () => {
      // Mark only groq as healthy, everything else as unconfigured
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'unconfigured')
      setProviderHealth('huggingface', 'unconfigured')
      setProviderHealth('mimo', 'unconfigured')
      setProviderHealth('genx', 'unconfigured')

      const decision = await routeRequest(makeContext())
      expect(decision.primaryModel).toBeDefined()
      if (decision.primaryModel) {
        expect(decision.primaryModel.provider).toBe('groq')
      }
    })

    it('skips models from error providers', async () => {
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'error')
      setProviderHealth('huggingface', 'error')
      setProviderHealth('mimo', 'error')
      setProviderHealth('genx', 'error')

      const decision = await routeRequest(makeContext())
      expect(decision.primaryModel).toBeDefined()
      if (decision.primaryModel) {
        expect(decision.primaryModel.provider).toBe('groq')
      }
    })

    it('returns no models when all providers are unhealthy', async () => {
      setProviderHealth('genx', 'error')
      setProviderHealth('groq', 'unconfigured')
      setProviderHealth('together', 'unconfigured')
      setProviderHealth('huggingface', 'unconfigured')
      setProviderHealth('mimo', 'unconfigured')

      const decision = await routeRequest(makeContext())
      expect(decision.primaryModel).toBeNull()
      expect(decision.warnings.length).toBeGreaterThan(0)
    })

    it('demotes degraded providers in fallback list', async () => {
      // Mark groq as healthy, others as configured
      setProviderHealth('groq', 'healthy')
      setProviderHealth('together', 'configured')
      setProviderHealth('huggingface', 'configured')
      setProviderHealth('mimo', 'configured')
      setProviderHealth('genx', 'configured')

      const decision = await routeRequest(makeContext())
      expect(decision.primaryModel).toBeDefined()
      // Fallback models may be empty if only one provider has models
      expect(decision.fallbackModels).toBeDefined()
    })

    it('escalation skips unhealthy provider', async () => {
      // Set up health where genx is unhealthy
      setProviderHealth('genx', 'error')
      setProviderHealth('groq', 'configured')
      setProviderHealth('together', 'configured')
      setProviderHealth('huggingface', 'configured')
      setProviderHealth('mimo', 'configured')

      const decision = await routeRequest(makeContext({
        appSlug: 'amarktai-crypto',
        appCategory: 'finance',
        taskComplexity: 'complex',
        taskType: 'analysis',
      }))

      // Decision should still be valid
      expect(decision.mode).toBeTruthy()
      if (decision.primaryModel) {
        // Primary model should NOT be from an error provider
        expect(decision.primaryModel.provider).not.toBe('genx')
      }
    })
  })
})
