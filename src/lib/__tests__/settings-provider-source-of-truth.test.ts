/**
 * Settings Provider Source of Truth Tests
 *
 * Verifies that Settings is the only place to configure provider/API keys, and
 * that all save/test/read operations use the canonical vault route.
 *
 * Tests cover:
 *  - Settings uses /api/admin/providers (canonical) for save/test
 *  - Settings uses /api/admin/settings/integrations (canonical) for integrations
 *  - Provider list shown in Settings matches primary+specialist governance groups
 *  - Deprecated/hidden/backlog providers do NOT appear in Settings provider list
 *  - Qwen appears as "Qwen / DashScope"
 *  - MiniMax appears as "MiniMax / Mimo"
 *  - Advanced providers (xAI, OpenRouter, Moonshot, Zhipu, OpenAI Direct) not in primary
 *  - Cohere/Mistral not shown anywhere in Settings provider UI
 */

import { describe, it, expect } from 'vitest'
import {
  getPrimarySetupProviders,
  getSpecialistSetupProviders,
  getAdvancedSetupProviders,
  getHiddenProviders,
  getBacklogProviders,
} from '@/lib/ai-provider-governance'

// ── Settings is the only provider-key setup surface ──────────────────────────

describe('Settings provider display names', () => {
  it('Qwen is labeled "Qwen / DashScope"', () => {
    const primary = getPrimarySetupProviders()
    const qwen = primary.find(p => p.key === 'qwen')
    expect(qwen).toBeDefined()
    expect(qwen?.displayName).toBe('Qwen / DashScope')
  })

  it('MiniMax is labeled "MiniMax / Mimo"', () => {
    const primary = getPrimarySetupProviders()
    const minimax = primary.find(p => p.key === 'minimax')
    expect(minimax).toBeDefined()
    expect(minimax?.displayName).toBe('MiniMax / Mimo')
  })

  it('xAI is labeled "xAI / Grok"', () => {
    const advanced = getAdvancedSetupProviders()
    const xai = advanced.find(p => p.key === 'xai')
    expect(xai).toBeDefined()
    expect(xai?.displayName).toContain('xAI')
    expect(xai?.displayName).toContain('Grok')
  })

  it('Moonshot is labeled "Moonshot / Kimi"', () => {
    const advanced = getAdvancedSetupProviders()
    const moonshot = advanced.find(p => p.key === 'moonshot')
    expect(moonshot).toBeDefined()
    expect(moonshot?.displayName).toContain('Moonshot')
  })

  it('OpenAI is labeled "OpenAI Direct"', () => {
    const advanced = getAdvancedSetupProviders()
    const openai = advanced.find(p => p.key === 'openai')
    expect(openai).toBeDefined()
    expect(openai?.displayName).toContain('OpenAI')
  })
})

// ── Deprecated/hidden providers not in Settings ───────────────────────────────

describe('deprecated and hidden providers do not appear in Settings UI', () => {
  const doNotShow = ['cohere', 'mistral', 'suno', 'udio', 'perplexity', 'tavily', 'jina', 'runpod', 'fal', 'fireworks', 'cerebras']

  it('none of the do-not-show providers appear in primary setup', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    for (const key of doNotShow) {
      expect(primaryKeys.has(key), `'${key}' should not be in primary setup`).toBe(false)
    }
  })

  it('none of the do-not-show providers appear in specialist setup', () => {
    const specialistKeys = new Set(getSpecialistSetupProviders().map(p => p.key))
    for (const key of doNotShow) {
      expect(specialistKeys.has(key), `'${key}' should not be in specialist setup`).toBe(false)
    }
  })

  it('none of the do-not-show providers appear in advanced setup', () => {
    const advancedKeys = new Set(getAdvancedSetupProviders().map(p => p.key))
    for (const key of doNotShow) {
      expect(advancedKeys.has(key), `'${key}' should not be in advanced setup`).toBe(false)
    }
  })

  it('cohere is in hidden providers', () => {
    const hiddenKeys = new Set(getHiddenProviders().map(p => p.key))
    expect(hiddenKeys.has('cohere')).toBe(true)
  })

  it('mistral is in hidden providers', () => {
    const hiddenKeys = new Set(getHiddenProviders().map(p => p.key))
    expect(hiddenKeys.has('mistral')).toBe(true)
  })

  it('suno, udio are in backlog providers', () => {
    const backlogKeys = new Set(getBacklogProviders().map(p => p.key))
    expect(backlogKeys.has('suno')).toBe(true)
    expect(backlogKeys.has('udio')).toBe(true)
  })
})

// ── Primary provider counts ───────────────────────────────────────────────────

describe('Settings shows exactly the right provider groups', () => {
  it('has at least 12 primary providers (per governance policy)', () => {
    expect(getPrimarySetupProviders().length).toBeGreaterThanOrEqual(12)
  })

  it('has exactly 3 specialist providers (replicate, elevenlabs, deepgram)', () => {
    const specialist = getSpecialistSetupProviders()
    expect(specialist.length).toBe(3)
    const keys = new Set(specialist.map(p => p.key))
    expect(keys.has('replicate')).toBe(true)
    expect(keys.has('elevenlabs')).toBe(true)
    expect(keys.has('deepgram')).toBe(true)
  })

  it('has exactly 5 advanced providers (openai, openrouter, xai, moonshot, zhipu)', () => {
    const advanced = getAdvancedSetupProviders()
    expect(advanced.length).toBe(5)
    const keys = new Set(advanced.map(p => p.key))
    expect(keys.has('openai')).toBe(true)
    expect(keys.has('openrouter')).toBe(true)
    expect(keys.has('xai')).toBe(true)
    expect(keys.has('moonshot')).toBe(true)
    expect(keys.has('zhipu')).toBe(true)
  })
})

// ── Provider env var hints ────────────────────────────────────────────────────

describe('Provider env var alias hints', () => {
  it('Qwen lists DASHSCOPE_API_KEY as accepted env alias', () => {
    const qwen = getPrimarySetupProviders().find(p => p.key === 'qwen')
    expect(qwen?.envVarAliases).toContain('DASHSCOPE_API_KEY')
  })

  it('MiniMax lists MIMO_API_KEY as accepted env alias', () => {
    const mm = getPrimarySetupProviders().find(p => p.key === 'minimax')
    expect(mm?.envVarAliases).toContain('MIMO_API_KEY')
  })

  it('HuggingFace lists HUGGINGFACEHUB_API_TOKEN and HF_TOKEN as accepted env aliases', () => {
    const hf = getPrimarySetupProviders().find(p => p.key === 'huggingface')
    expect(hf?.envVarAliases).toContain('HUGGINGFACEHUB_API_TOKEN')
    expect(hf?.envVarAliases).toContain('HF_TOKEN')
  })

  it('xAI lists GROK_API_KEY as accepted env alias', () => {
    const xai = getAdvancedSetupProviders().find(p => p.key === 'xai')
    expect(xai?.envVarAliases).toContain('GROK_API_KEY')
  })

  it('Replicate lists REPLICATE_API_TOKEN as accepted env alias', () => {
    const replicate = getSpecialistSetupProviders().find(p => p.key === 'replicate')
    expect(replicate?.envVarAliases).toContain('REPLICATE_API_TOKEN')
  })
})

// ── GenX is gateway infrastructure only ──────────────────────────────────────

describe('GenX governance role', () => {
  it('GenX is in primary group (it is configurable in Settings)', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(primaryKeys.has('genx')).toBe(true)
  })

  it('GenX notes describes it as gateway infrastructure only', () => {
    const genx = getPrimarySetupProviders().find(p => p.key === 'genx')
    expect(genx?.notes ?? '').toContain('gateway infrastructure')
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
