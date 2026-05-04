/**
 * Provider Governance Tests
 *
 * Verifies:
 *  - setupGroup grouping functions return correct providers
 *  - Qwen aliases resolve correctly (dashscope → qwen)
 *  - MiniMax/Mimo aliases resolve correctly (mimo → minimax)
 *  - HuggingFace aliases resolve correctly (hf → huggingface)
 *  - xAI/Grok aliases resolve correctly (grok → xai)
 *  - Hidden/backlog providers do not appear in primary or specialist setup lists
 *  - Deprecated providers do not appear in setup lists
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
import { getIntegrationKey, getEnvKeyForProvider } from '@/lib/provider-config'

// ── Grouping helper tests ─────────────────────────────────────────────────────

describe('getPrimarySetupProviders()', () => {
  it('returns providers with setupGroup === primary', () => {
    const primary = getPrimarySetupProviders()
    expect(primary.every(p => p.setupGroup === 'primary')).toBe(true)
  })

  it('includes all required primary providers', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    const required = ['genx', 'github', 'qwen', 'minimax', 'deepseek', 'gemini', 'huggingface', 'groq', 'together', 'firecrawl', 'mem0', 'webdock']
    for (const key of required) {
      expect(keys.has(key), `Primary providers should include '${key}'`).toBe(true)
    }
  })

  it('does NOT include xai/grok in primary (it is advanced)', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(keys.has('xai')).toBe(false)
  })

  it('does NOT include openrouter in primary (it is advanced)', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(keys.has('openrouter')).toBe(false)
  })

  it('does NOT include moonshot in primary (it is advanced)', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(keys.has('moonshot')).toBe(false)
  })

  it('does NOT include zhipu in primary (it is advanced)', () => {
    const keys = new Set(getPrimarySetupProviders().map(p => p.key))
    expect(keys.has('zhipu')).toBe(false)
  })
})

describe('getSpecialistSetupProviders()', () => {
  it('returns providers with setupGroup === specialist', () => {
    const specialist = getSpecialistSetupProviders()
    expect(specialist.every(p => p.setupGroup === 'specialist')).toBe(true)
  })

  it('includes replicate, elevenlabs, and deepgram', () => {
    const keys = new Set(getSpecialistSetupProviders().map(p => p.key))
    expect(keys.has('replicate')).toBe(true)
    expect(keys.has('elevenlabs')).toBe(true)
    expect(keys.has('deepgram')).toBe(true)
  })
})

describe('getAdvancedSetupProviders()', () => {
  it('returns providers with setupGroup === advanced', () => {
    const advanced = getAdvancedSetupProviders()
    expect(advanced.every(p => p.setupGroup === 'advanced')).toBe(true)
  })

  it('includes openai, openrouter, xai, moonshot, zhipu', () => {
    const keys = new Set(getAdvancedSetupProviders().map(p => p.key))
    expect(keys.has('openai')).toBe(true)
    expect(keys.has('openrouter')).toBe(true)
    expect(keys.has('xai')).toBe(true)
    expect(keys.has('moonshot')).toBe(true)
    expect(keys.has('zhipu')).toBe(true)
  })
})

describe('getHiddenProviders()', () => {
  it('returns providers with setupGroup === hidden', () => {
    const hidden = getHiddenProviders()
    expect(hidden.every(p => p.setupGroup === 'hidden')).toBe(true)
  })

  it('includes cohere and mistral as hidden', () => {
    const keys = new Set(getHiddenProviders().map(p => p.key))
    expect(keys.has('cohere')).toBe(true)
    expect(keys.has('mistral')).toBe(true)
  })
})

describe('getBacklogProviders()', () => {
  it('returns providers with setupGroup === backlog from both sources', () => {
    const backlog = getBacklogProviders()
    expect(backlog.every(p => p.setupGroup === 'backlog')).toBe(true)
  })

  it('includes suno and udio from main governance backlog', () => {
    const keys = new Set(getBacklogProviders().map(p => p.key))
    expect(keys.has('suno')).toBe(true)
    expect(keys.has('udio')).toBe(true)
  })

  it('includes perplexity, tavily, jina from PROPOSED_PROVIDER_BACKLOG', () => {
    const keys = new Set(getBacklogProviders().map(p => p.key))
    expect(keys.has('perplexity')).toBe(true)
    expect(keys.has('tavily')).toBe(true)
    expect(keys.has('jina')).toBe(true)
  })

  it('includes runpod, fal, fireworks, cerebras from PROPOSED_PROVIDER_BACKLOG', () => {
    const keys = new Set(getBacklogProviders().map(p => p.key))
    expect(keys.has('runpod')).toBe(true)
    expect(keys.has('fal')).toBe(true)
    expect(keys.has('fireworks')).toBe(true)
    expect(keys.has('cerebras')).toBe(true)
  })
})

// ── Hidden providers do not appear in setup lists ─────────────────────────────

describe('Hidden/backlog/deprecated providers not in primary or specialist lists', () => {
  const hiddenAndBacklogKeys = new Set([
    'cohere', 'mistral', 'suno', 'udio',
    'perplexity', 'tavily', 'jina', 'runpod', 'fal', 'fireworks', 'cerebras',
  ])

  it('none of the hidden/backlog providers appear in primary setup', () => {
    const primary = new Set(getPrimarySetupProviders().map(p => p.key))
    for (const key of hiddenAndBacklogKeys) {
      expect(primary.has(key), `'${key}' should not be in primary setup`).toBe(false)
    }
  })

  it('none of the hidden/backlog providers appear in specialist setup', () => {
    const specialist = new Set(getSpecialistSetupProviders().map(p => p.key))
    for (const key of hiddenAndBacklogKeys) {
      expect(specialist.has(key), `'${key}' should not be in specialist setup`).toBe(false)
    }
  })

  it('hidden providers have showInPrimarySetup=false', () => {
    const hidden = getHiddenProviders()
    expect(hidden.every(p => p.showInPrimarySetup === false)).toBe(true)
  })

  it('advanced providers have showInPrimarySetup=false', () => {
    const advanced = getAdvancedSetupProviders()
    expect(advanced.every(p => p.showInPrimarySetup === false)).toBe(true)
  })
})

// ── Alias tests (via provider-config.ts) ──────────────────────────────────────

describe('Qwen / DashScope aliases', () => {
  it('getIntegrationKey("qwen") returns "qwen"', () => {
    expect(getIntegrationKey('qwen')).toBe('qwen')
  })

  it('getIntegrationKey("dashscope") resolves to "qwen"', () => {
    expect(getIntegrationKey('dashscope')).toBe('qwen')
  })

  it('getEnvKeyForProvider("qwen") checks QWEN_API_KEY', () => {
    process.env.QWEN_API_KEY = 'test-qwen-key'
    const key = getEnvKeyForProvider('qwen')
    expect(key).toBe('test-qwen-key')
    delete process.env.QWEN_API_KEY
  })

  it('getEnvKeyForProvider("dashscope") resolves via DASHSCOPE_API_KEY alias', () => {
    process.env.DASHSCOPE_API_KEY = 'test-dashscope-key'
    const key = getEnvKeyForProvider('dashscope')
    expect(key).toBe('test-dashscope-key')
    delete process.env.DASHSCOPE_API_KEY
  })
})

describe('MiniMax / Mimo aliases', () => {
  it('getIntegrationKey("minimax") returns "minimax"', () => {
    expect(getIntegrationKey('minimax')).toBe('minimax')
  })

  it('getIntegrationKey("mimo") resolves to "minimax"', () => {
    expect(getIntegrationKey('mimo')).toBe('minimax')
  })

  it('getEnvKeyForProvider("minimax") checks MINIMAX_API_KEY', () => {
    process.env.MINIMAX_API_KEY = 'test-minimax-key'
    const key = getEnvKeyForProvider('minimax')
    expect(key).toBe('test-minimax-key')
    delete process.env.MINIMAX_API_KEY
  })

  it('getEnvKeyForProvider("mimo") resolves via MIMO_API_KEY alias', () => {
    process.env.MIMO_API_KEY = 'test-mimo-key'
    const key = getEnvKeyForProvider('mimo')
    expect(key).toBe('test-mimo-key')
    delete process.env.MIMO_API_KEY
  })
})

describe('xAI / Grok aliases', () => {
  it('getIntegrationKey("xai") returns "xai"', () => {
    expect(getIntegrationKey('xai')).toBe('xai')
  })

  it('getIntegrationKey("grok") resolves to "xai"', () => {
    expect(getIntegrationKey('grok')).toBe('xai')
  })

  it('getEnvKeyForProvider("xai") checks XAI_API_KEY', () => {
    process.env.XAI_API_KEY = 'test-xai-key'
    const key = getEnvKeyForProvider('xai')
    expect(key).toBe('test-xai-key')
    delete process.env.XAI_API_KEY
  })

  it('getEnvKeyForProvider("grok") resolves via GROK_API_KEY alias', () => {
    process.env.GROK_API_KEY = 'test-grok-key'
    const key = getEnvKeyForProvider('grok')
    expect(key).toBe('test-grok-key')
    delete process.env.GROK_API_KEY
  })
})

describe('HuggingFace / HF aliases', () => {
  it('getIntegrationKey("huggingface") returns "huggingface"', () => {
    expect(getIntegrationKey('huggingface')).toBe('huggingface')
  })

  it('getIntegrationKey("hf") resolves to "huggingface"', () => {
    expect(getIntegrationKey('hf')).toBe('huggingface')
  })

  it('getEnvKeyForProvider("huggingface") checks HUGGINGFACE_API_KEY', () => {
    process.env.HUGGINGFACE_API_KEY = 'test-hf-key'
    const key = getEnvKeyForProvider('huggingface')
    expect(key).toBe('test-hf-key')
    delete process.env.HUGGINGFACE_API_KEY
  })

  it('getEnvKeyForProvider("huggingface") also checks HUGGINGFACEHUB_API_TOKEN', () => {
    process.env.HUGGINGFACEHUB_API_TOKEN = 'test-hfhub-key'
    const key = getEnvKeyForProvider('huggingface')
    expect(key).toBe('test-hfhub-key')
    delete process.env.HUGGINGFACEHUB_API_TOKEN
  })

  it('getEnvKeyForProvider("huggingface") also checks HF_TOKEN', () => {
    process.env.HF_TOKEN = 'test-hf-token'
    const key = getEnvKeyForProvider('huggingface')
    expect(key).toBe('test-hf-token')
    delete process.env.HF_TOKEN
  })

  it('getEnvKeyForProvider("hf") resolves via HF_TOKEN alias', () => {
    process.env.HF_TOKEN = 'test-hf-token-alias'
    const key = getEnvKeyForProvider('hf')
    expect(key).toBe('test-hf-token-alias')
    delete process.env.HF_TOKEN
  })
})

describe('Replicate aliases', () => {
  it('getEnvKeyForProvider("replicate") checks REPLICATE_API_TOKEN first', () => {
    process.env.REPLICATE_API_TOKEN = 'test-r8-token'
    const key = getEnvKeyForProvider('replicate')
    expect(key).toBe('test-r8-token')
    delete process.env.REPLICATE_API_TOKEN
  })

  it('getEnvKeyForProvider("replicate") falls back to REPLICATE_API_KEY', () => {
    process.env.REPLICATE_API_KEY = 'test-r8-key'
    const key = getEnvKeyForProvider('replicate')
    expect(key).toBe('test-r8-key')
    delete process.env.REPLICATE_API_KEY
  })
})

// ── Adult specialist providers ────────────────────────────────────────────────

describe('getAdultSpecialistProviderKeys()', () => {
  it('includes together, huggingface, replicate, xai', () => {
    const keys = getAdultSpecialistProviderKeys()
    expect(keys.has('together')).toBe(true)
    expect(keys.has('huggingface')).toBe(true)
    expect(keys.has('replicate')).toBe(true)
    expect(keys.has('xai')).toBe(true)
  })
})

// ── getRuntimeProviderGovernance excludes proposed/backlog ───────────────────

describe('getRuntimeProviderGovernance()', () => {
  it('does not include backlog providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const keys = new Set(runtime.map(p => p.key))
    // suno and udio are backlog
    expect(keys.has('suno')).toBe(false)
    expect(keys.has('udio')).toBe(false)
  })

  it('does not include proposed providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const runtimeSet = new Set(runtime.map(p => p.key))
    // All PROPOSED_PROVIDER_BACKLOG keys should not appear in runtime
    for (const p of PROPOSED_PROVIDER_BACKLOG) {
      expect(runtimeSet.has(p.key), `Backlog provider '${p.key}' should not be in runtime governance`).toBe(false)
    }
  })

  it('includes active primary and specialist providers', () => {
    const runtime = getRuntimeProviderGovernance()
    const keys = new Set(runtime.map(p => p.key))
    expect(keys.has('genx')).toBe(true)
    expect(keys.has('qwen')).toBe(true)
    expect(keys.has('minimax')).toBe(true)
    expect(keys.has('deepseek')).toBe(true)
    expect(keys.has('replicate')).toBe(true)
    expect(keys.has('elevenlabs')).toBe(true)
    expect(keys.has('deepgram')).toBe(true)
  })
})

// ── Governance completeness checks ────────────────────────────────────────────

describe('AI_PROVIDER_GOVERNANCE completeness', () => {
  it('all entries have a setupGroup', () => {
    for (const entry of AI_PROVIDER_GOVERNANCE) {
      expect(entry.setupGroup, `Entry '${entry.key}' is missing setupGroup`).toBeDefined()
    }
  })

  it('all entries have envVarAliases defined for aliased providers', () => {
    const aliasedProviders = ['qwen', 'minimax', 'huggingface', 'xai', 'replicate']
    for (const key of aliasedProviders) {
      const entry = AI_PROVIDER_GOVERNANCE.find(p => p.key === key)
      expect(entry?.envVarAliases, `Provider '${key}' should have envVarAliases`).toBeDefined()
      expect(entry?.envVarAliases?.length, `Provider '${key}' should have at least 2 env var aliases`).toBeGreaterThanOrEqual(2)
    }
  })

  it('Qwen notes mentions DASHSCOPE_API_KEY alias', () => {
    const qwen = AI_PROVIDER_GOVERNANCE.find(p => p.key === 'qwen')
    expect(qwen?.notes ?? '').toContain('DASHSCOPE_API_KEY')
  })

  it('MiniMax notes mentions MIMO_API_KEY alias', () => {
    const mm = AI_PROVIDER_GOVERNANCE.find(p => p.key === 'minimax')
    expect(mm?.notes ?? '').toContain('MIMO_API_KEY')
  })

  it('HuggingFace notes mentions HUGGINGFACEHUB_API_TOKEN alias', () => {
    const hf = AI_PROVIDER_GOVERNANCE.find(p => p.key === 'huggingface')
    expect(hf?.notes ?? '').toContain('HUGGINGFACEHUB_API_TOKEN')
  })
})
