import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDER_GOVERNANCE,
  PROPOSED_PROVIDER_BACKLOG,
  getAdultSpecialistProviderKeys,
  getAdvancedSetupProviders,
  getBacklogProviders,
  getHiddenProviders,
  getPrimarySetupProviders,
  getRuntimeProviderGovernance,
  getSpecialistSetupProviders,
} from '@/lib/ai-provider-governance'
import { getIntegrationKey } from '@/lib/provider-config'

describe('V1 provider governance', () => {
  it('primary setup providers are exactly genx, together, and groq', () => {
    expect(getPrimarySetupProviders().map((provider) => provider.key).sort()).toEqual(['genx', 'groq', 'together'])
  })

  it('keeps MiMo as advanced future/workbench only', () => {
    const advanced = getAdvancedSetupProviders()
    const mimo = advanced.find((provider) => provider.key === 'mimo')

    expect(mimo).toBeDefined()
    expect(mimo?.showInPrimarySetup).toBe(false)
    expect(mimo?.notes).toContain('Future/workbench-only')
  })

  it('keeps Hugging Face and removed providers out of active setup groups', () => {
    const visibleSetupKeys = new Set([
      ...getPrimarySetupProviders(),
      ...getSpecialistSetupProviders(),
      ...getHiddenProviders(),
      ...getBacklogProviders(),
    ].map((provider) => provider.key))

    for (const key of ['huggingface', 'qwen', 'dashscope', 'openai', 'gemini', 'minimax', 'anthropic', 'cohere', 'nvidia', 'replicate', 'mistral']) {
      expect(visibleSetupKeys.has(key), `${key} should not be active setup`).toBe(false)
    }
  })

  it('provider aliases can still normalize legacy names without making them active', () => {
    expect(getIntegrationKey('huggingface')).toBe('huggingface')
    expect(getIntegrationKey('hf')).toBe('huggingface')
    expect(getIntegrationKey('mimo')).toBe('mimo')
  })

  it('adult specialist providers are empty in active V1', () => {
    expect([...getAdultSpecialistProviderKeys()]).toEqual([])
  })

  it('runtime governance contains active V1 providers plus MiMo future only', () => {
    const keys = getRuntimeProviderGovernance()
      .map((provider) => provider.key)
      .filter((key) => ['genx', 'groq', 'mimo', 'together'].includes(key))
      .sort()
    expect(keys).toEqual(['genx', 'groq', 'mimo', 'together'])
    expect(getRuntimeProviderGovernance().map((provider) => provider.key)).not.toContain('huggingface')
  })

  it('does not include proposed backlog providers in runtime governance', () => {
    const runtimeSet = new Set(getRuntimeProviderGovernance().map((provider) => provider.key))
    for (const provider of PROPOSED_PROVIDER_BACKLOG) {
      expect(runtimeSet.has(provider.key), `Backlog provider '${provider.key}' should not be in runtime governance`).toBe(false)
    }
  })

  it('all governance entries have a setup group', () => {
    for (const entry of AI_PROVIDER_GOVERNANCE) {
      expect(entry.setupGroup, `Entry '${entry.key}' is missing setupGroup`).toBeDefined()
    }
  })
})
