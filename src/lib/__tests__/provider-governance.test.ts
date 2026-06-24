/**
 * Provider Governance Tests
 *
 * Verifies:
 *  - Final 5 active AI providers are correctly defined
 *  - Removed providers are NOT active
 *  - setupGroup grouping functions return correct providers
 *  - HuggingFace aliases resolve correctly (hf → huggingface)
 *  - Only supported providers appear in visible lists
 */

import { describe, it, expect } from 'vitest'
import {
  AI_PROVIDER_GOVERNANCE,
  PROPOSED_PROVIDER_BACKLOG,
  getPrimarySetupProviders,
  getSpecialistSetupProviders,
  getAdvancedSetupProviders,
  getHiddenProviders,
  getBacklogProviders,
  getAdultSpecialistProviderKeys,
  getRuntimeProviderGovernance,
} from '@/lib/ai-provider-governance'
import { getIntegrationKey } from '@/lib/provider-config'

// ── Final 5 Active AI Providers ──────────────────────────────────────────────

describe('Final active AI provider policy', () => {
  it('has exactly 5 active AI providers in primary setup', () => {
    const primary = getPrimarySetupProviders()
    expect(primary.length).toBe(5)
  })

  it('active AI providers are exactly genx, huggingface, mimo, groq, together', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(keys.has('genx')).toBe(true)
    expect(keys.has('huggingface')).toBe(true)
    expect(keys.has('mimo')).toBe(true)
    expect(keys.has('groq')).toBe(true)
    expect(keys.has('together')).toBe(true)
    expect(keys.size).toBe(5)
  })

  it('returns providers with setupGroup === primary', () => {
    const primary = getPrimarySetupProviders()
    expect(primary.every(p => p.setupGroup === 'primary')).toBe(true)
  })
})

// ── Removed providers are NOT active ─────────────────────────────────────────

describe('Removed providers are not active', () => {
  const removedProviders = [
    'qwen', 'dashscope', 'openai', 'gemini', 'minimax',
    'moonshot', 'openrouter', 'xai', 'grok', 'deepseek',
    'anthropic', 'cohere', 'nvidia', 'replicate', 'elevenlabs', 'deepgram',
    'mistral', 'zhipu', 'github', 'redis', 'qdrant', 'local-crawler',
    'playwright', 'scrapy', 'trafilatura', 'ffmpeg', 'storage', 'smtp'
  ]

  it('none of the removed providers appear in primary setup', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    for (const key of removedProviders) {
      expect(primaryKeys.has(key), `'${key}' should not be in primary setup`).toBe(false)
    }
  })

  it('Qwen is not active', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('qwen')).toBe(false)
  })

  it('MiniMax is not active', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('minimax')).toBe(false)
  })

  it('OpenAI is not active', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('openai')).toBe(false)
  })

  it('Gemini is not active', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('gemini')).toBe(false)
  })
})

// ── Grouping helper tests ─────────────────────────────────────────────────────

describe('getSpecialistSetupProviders()', () => {
  it('returns providers with setupGroup === specialist', () => {
    const specialist = getSpecialistSetupProviders()
    expect(specialist.every(p => p.setupGroup === 'specialist')).toBe(true)
  })
})

describe('getAdvancedSetupProviders()', () => {
  it('returns providers with setupGroup === advanced', () => {
    const advanced = getAdvancedSetupProviders()
    expect(advanced.every(p => p.setupGroup === 'advanced')).toBe(true)
  })
})

describe('getHiddenProviders()', () => {
  it('returns empty array (no hidden providers in final policy)', () => {
    const hidden = getHiddenProviders()
    expect(hidden.length).toBe(0)
  })
})

describe('getBacklogProviders()', () => {
  it('returns empty array (no backlog providers in final policy)', () => {
    const backlog = getBacklogProviders()
    expect(backlog.length).toBe(0)
  })
})

// ── Alias tests (via provider-config.ts) ──────────────────────────────────────

describe('HuggingFace / HF aliases', () => {
  it('getIntegrationKey("huggingface") returns "huggingface"', () => {
    expect(getIntegrationKey('huggingface')).toBe('huggingface')
  })

  it('getIntegrationKey("hf") resolves to "huggingface"', () => {
    expect(getIntegrationKey('hf')).toBe('huggingface')
  })
})

describe('MiMo aliases', () => {
  it('getIntegrationKey("mimo") returns "mimo"', () => {
    expect(getIntegrationKey('mimo')).toBe('mimo')
  })
})

// ── Adult specialist providers ────────────────────────────────────────────────

describe('getAdultSpecialistProviderKeys()', () => {
  it('includes genx, huggingface, together', () => {
    const keys = getAdultSpecialistProviderKeys()
    expect(keys.has('genx')).toBe(true)
    expect(keys.has('huggingface')).toBe(true)
    expect(keys.has('together')).toBe(true)
  })
})

// ── getRuntimeProviderGovernance excludes proposed/backlog ───────────────────

describe('getRuntimeProviderGovernance()', () => {
  it('does not include backlog providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const keys = new Set(runtime.map(p => p.key))
    expect(keys.has('suno')).toBe(false)
    expect(keys.has('udio')).toBe(false)
  })

  it('does not include proposed providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const runtimeSet = new Set(runtime.map(p => p.key))
    for (const p of PROPOSED_PROVIDER_BACKLOG) {
      expect(runtimeSet.has(p.key), `Backlog provider '${p.key}' should not be in runtime governance`).toBe(false)
    }
  })

  it('includes only active providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const keys = new Set(runtime.map(p => p.key))
    expect(keys.has('genx')).toBe(true)
    expect(keys.has('huggingface')).toBe(true)
    expect(keys.has('mimo')).toBe(true)
    expect(keys.has('groq')).toBe(true)
    expect(keys.has('together')).toBe(true)
  })
})

// ── Governance completeness checks ────────────────────────────────────────────

describe('AI_PROVIDER_GOVERNANCE completeness', () => {
  it('all entries have a setupGroup', () => {
    for (const entry of AI_PROVIDER_GOVERNANCE) {
      expect(entry.setupGroup, `Entry '${entry.key}' is missing setupGroup`).toBeDefined()
    }
  })
})
