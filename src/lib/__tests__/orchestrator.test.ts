/**
 * Orchestrator Tests
 *
 * Validates compatibility classification, confidence scoring, and specialist
 * profiles. Provider/model selection belongs to canonical discovery tests.
 */
import { describe, it, expect } from 'vitest'
import {
  classifyTask,
  computeConfidenceScore,
  getSpecialistProfile,
  SPECIALIST_PROFILES,
} from '@/lib/orchestrator'

describe('Orchestrator', () => {
  describe('classifyTask', () => {
    it('classifies short generic message as simple', () => {
      const result = classifyTask('generic', 'chat', 'Hello!')
      expect(result.taskComplexity).toBe('simple')
      expect(result.executionMode).toBe('direct')
    })

    it('classifies analysis task as complex', () => {
      const result = classifyTask('finance', 'analysis', 'Analyze the market trends for Bitcoin')
      expect(result.taskComplexity).toBe('complex')
      expect(['review', 'consensus']).toContain(result.executionMode)
    })

    it('classifies financial non-generic as complex', () => {
      const result = classifyTask('crypto', 'trading', 'What should I buy?')
      expect(result.taskComplexity).toBe('complex')
    })

    it('classifies moderate tasks correctly', () => {
      const result = classifyTask('generic', 'content', 'Write me a blog post about AI')
      expect(result.taskComplexity).toBe('moderate')
      expect(result.executionMode).toBe('specialist')
    })

    it('detects consensus task type', () => {
      const result = classifyTask('generic', 'consensus', 'Compare two approaches')
      expect(result.executionMode).toBe('consensus')
    })

    it('sets validation flag for review mode', () => {
      const result = classifyTask('finance', 'analysis', 'Full portfolio review')
      expect(result.requiresValidation).toBe(true)
    })

    it('sets memoryRetrievalNeeded to false (reserved)', () => {
      const result = classifyTask('generic', 'chat', 'test')
      expect(result.memoryRetrievalNeeded).toBe(false)
    })

    it('sets lowLatencyRequired for direct mode', () => {
      const result = classifyTask('generic', 'chat', 'Hi')
      expect(result.lowLatencyRequired).toBe(true)
    })
  })

  describe('computeConfidenceScore', () => {
    const healthyProvider = {
      healthStatus: 'healthy',
      isHealthy: true,
    }

    it('returns base score for healthy provider', () => {
      const score = computeConfidenceScore({
        primaryProvider: healthyProvider,
        fallbackUsed: false,
        validationPassed: null,
        warnings: [],
      })
      expect(score).toBe(0.85) // 0.70 base + 0.15 healthy
    })

    it('reduces score when fallback is used', () => {
      const score = computeConfidenceScore({
        primaryProvider: healthyProvider,
        fallbackUsed: true,
        validationPassed: null,
        warnings: [],
      })
      expect(score).toBe(0.75) // 0.70 + 0.15 - 0.10
    })

    it('reduces score when validation fails', () => {
      const score = computeConfidenceScore({
        primaryProvider: healthyProvider,
        fallbackUsed: false,
        validationPassed: false,
        warnings: [],
      })
      expect(score).toBe(0.75) // 0.70 + 0.15 - 0.10
    })

    it('clamps to [0.10, 0.99]', () => {
      const lowScore = computeConfidenceScore({
        primaryProvider: { ...healthyProvider, isHealthy: false, healthStatus: 'error' },
        fallbackUsed: true,
        validationPassed: false,
        warnings: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13'],
      })
      expect(lowScore).toBeGreaterThanOrEqual(0.10)
      expect(lowScore).toBeLessThanOrEqual(0.99)
    })
  })

  describe('getSpecialistProfile', () => {
    it('returns crypto profile for crypto category', () => {
      const profile = getSpecialistProfile('crypto')
      expect(profile).toContain('cryptocurrency')
    })

    it('returns marketing profile for marketing category', () => {
      const profile = getSpecialistProfile('marketing')
      expect(profile).toContain('marketing')
    })

    it('returns generic profile for unknown category', () => {
      const profile = getSpecialistProfile('unknown')
      expect(profile).toBe(SPECIALIST_PROFILES.generic)
    })
  })
})
