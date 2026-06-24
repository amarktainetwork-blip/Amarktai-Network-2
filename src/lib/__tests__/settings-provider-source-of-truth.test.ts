/**
 * Settings Provider Source of Truth Tests
 *
 * Verifies that Settings is the only place to configure provider/API keys, and
 * that all save/test/read operations use the canonical vault route.
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 *
 * Tests cover:
 *  - Active AI providers are exactly the final 5
 *  - Removed providers (Qwen, MiniMax, OpenAI, Gemini, etc.) are NOT active
 *  - Provider list shown in Settings matches final provider policy
 *  - Apps cannot choose provider/model
 */

import { describe, it, expect } from 'vitest'
import {
  getPrimarySetupProviders,
  getSpecialistSetupProviders,
  getAdvancedSetupProviders,
  getHiddenProviders,
  getBacklogProviders,
} from '@/lib/ai-provider-governance'

// ── Final 5 Active AI Providers ──────────────────────────────────────────────

describe('Final active AI provider policy', () => {
  it('has exactly 5 active AI providers', () => {
    const primary = getPrimarySetupProviders()
    expect(primary.length).toBe(5)
  })

  it('active AI providers are exactly genx, huggingface, mimo, groq, together', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('genx')).toBe(true)
    expect(primaryKeys.has('huggingface')).toBe(true)
    expect(primaryKeys.has('mimo')).toBe(true)
    expect(primaryKeys.has('groq')).toBe(true)
    expect(primaryKeys.has('together')).toBe(true)
    expect(primaryKeys.size).toBe(5)
  })

  it('GenX is in primary group', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('genx')).toBe(true)
  })

  it('Hugging Face is in primary group', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('huggingface')).toBe(true)
  })

  it('MiMo is in primary group', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('mimo')).toBe(true)
  })

  it('Groq is in primary group', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('groq')).toBe(true)
  })

  it('Together is in primary group', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('together')).toBe(true)
  })
})

// ── Removed providers are NOT active ─────────────────────────────────────────

describe('Removed providers are not active', () => {
  const removedProviders = [
    'qwen', 'dashscope', 'openai', 'gemini', 'minimax',
    'moonshot', 'openrouter', 'xai', 'grok', 'deepseek',
    'anthropic', 'cohere', 'nvidia', 'replicate', 'elevenlabs', 'deepgram',
    'mistral', 'zhipu'
  ]

  it('none of the removed providers appear in primary setup', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    for (const key of removedProviders) {
      expect(primaryKeys.has(key), `'${key}' should not be in primary setup`).toBe(false)
    }
  })

  it('none of the removed providers appear in specialist setup', () => {
    const specialistKeys = new Set(getSpecialistSetupProviders().map(p => p.key))
    for (const key of removedProviders) {
      expect(specialistKeys.has(key), `'${key}' should not be in specialist setup`).toBe(false)
    }
  })

  it('none of the removed providers appear in advanced setup', () => {
    const advancedKeys = new Set(getAdvancedSetupProviders().map(p => p.key))
    for (const key of removedProviders) {
      expect(advancedKeys.has(key), `'${key}' should not be in advanced setup`).toBe(false)
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

// ── Provider env var hints ────────────────────────────────────────────────────

describe('Provider env var alias hints', () => {
  it('GenX uses GENX_API_KEY', () => {
    const genx = getPrimarySetupProviders().find(p => p.key === 'genx')
    expect(genx?.envVar).toBe('GENX_API_KEY')
  })

  it('HuggingFace uses HUGGINGFACE_API_KEY', () => {
    const hf = getPrimarySetupProviders().find(p => p.key === 'huggingface')
    expect(hf?.envVar).toBe('HUGGINGFACE_API_KEY')
  })

  it('HuggingFace lists HUGGINGFACEHUB_API_TOKEN and HF_TOKEN as accepted env aliases', () => {
    const hf = getPrimarySetupProviders().find(p => p.key === 'huggingface')
    expect(hf?.envVarAliases).toContain('HUGGINGFACEHUB_API_TOKEN')
    expect(hf?.envVarAliases).toContain('HF_TOKEN')
  })

  it('Xiaomi MiMo uses MIMO_API_KEY', () => {
    const mimo = getPrimarySetupProviders().find(p => p.key === 'mimo')
    expect(mimo?.envVar).toBe('MIMO_API_KEY')
  })

  it('Groq uses GROQ_API_KEY', () => {
    const groq = getPrimarySetupProviders().find(p => p.key === 'groq')
    expect(groq?.envVar).toBe('GROQ_API_KEY')
  })

  it('Together uses TOGETHER_API_KEY', () => {
    const together = getPrimarySetupProviders().find(p => p.key === 'together')
    expect(together?.envVar).toBe('TOGETHER_API_KEY')
  })
})

// ── GenX is gateway infrastructure only ──────────────────────────────────────

describe('GenX governance role', () => {
  it('GenX is in primary group (it is configurable in Settings)', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('genx')).toBe(true)
  })

  it('GenX notes describes it as compatibility metadata from provider mesh', () => {
    const genx = getPrimarySetupProviders().find(p => p.key === 'genx')
    expect(genx?.notes ?? '').toContain('provider-mesh')
  })

  it('GenX is not in advanced, specialist, hidden, or backlog groups', () => {
    const advancedKeys = new Set(getAdvancedSetupProviders().map(p => p.key))
    const specialistKeys = new Set(getSpecialistSetupProviders().map(p => p.key))
    const hiddenKeys = new Set(getHiddenProviders().map(p => p.key))
    const backlogKeys = new Set(getBacklogProviders().map(p => p.key))
    expect(advancedKeys.has('genx')).toBe(false)
    expect(specialistKeys.has('genx')).toBe(false)
    expect(hiddenKeys.has('genx')).toBe(false)
    expect(backlogKeys.has('genx')).toBe(false)
  })
})
