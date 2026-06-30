import { describe, expect, it } from 'vitest'
import {
  getAdvancedSetupProviders,
  getBacklogProviders,
  getHiddenProviders,
  getPrimarySetupProviders,
  getSpecialistSetupProviders,
} from '@/lib/ai-provider-governance'

describe('V1 active AI provider policy', () => {
  it('active Settings providers are exactly genx, together, and groq', () => {
    const primaryKeys = getPrimarySetupProviders().map((provider) => provider.key).sort()
    expect(primaryKeys).toEqual(['genx', 'groq', 'together'])
  })

  it('keeps MiMo out of primary runtime setup as future/workbench only', () => {
    const primaryKeys = new Set(getPrimarySetupProviders().map((provider) => provider.key))
    const advanced = getAdvancedSetupProviders().find((provider) => provider.key === 'mimo')

    expect(primaryKeys.has('mimo')).toBe(false)
    expect(advanced).toBeDefined()
    expect(advanced?.showInPrimarySetup).toBe(false)
    expect(advanced?.notes ?? '').toContain('Future/workbench-only')
  })

  it('keeps Hugging Face and removed providers out of all active setup groups', () => {
    const activeGroups = [
      ...getPrimarySetupProviders(),
      ...getSpecialistSetupProviders(),
      ...getHiddenProviders(),
      ...getBacklogProviders(),
    ]
    const keys = new Set(activeGroups.map((provider) => provider.key))

    for (const key of [
      'huggingface',
      'qwen',
      'dashscope',
      'openai',
      'gemini',
      'minimax',
      'moonshot',
      'openrouter',
      'deepseek',
      'anthropic',
      'cohere',
      'nvidia',
      'replicate',
      'mistral',
    ]) {
      expect(keys.has(key), `${key} should not be active setup`).toBe(false)
    }
  })

  it('keeps Groq active with its key hint', () => {
    const groq = getPrimarySetupProviders().find((provider) => provider.key === 'groq')
    expect(groq?.envVar).toBe('GROQ_API_KEY')
  })

  it('keeps GenX and Together active with key hints', () => {
    const primary = getPrimarySetupProviders()
    expect(primary.find((provider) => provider.key === 'genx')?.envVar).toBe('GENX_API_KEY')
    expect(primary.find((provider) => provider.key === 'together')?.envVar).toBe('TOGETHER_API_KEY')
  })
})
