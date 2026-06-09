import { afterEach, describe, expect, it } from 'vitest'
import {
  getEnvKeyForProvider,
  getIntegrationKey,
  getProviderKeyWithSource,
  isProviderConfigured,
} from '@/lib/provider-config'

const ENV_KEYS = [
  'GENX_API_KEY',
  'QWEN_API_KEY',
  'DASHSCOPE_API_KEY',
  'HUGGINGFACE_API_KEY',
  'HUGGINGFACEHUB_API_TOKEN',
  'HF_TOKEN',
  'MIMO_API_KEY',
  'XIAOMI_API_KEY',
  'GROQ_API_KEY',
  'TOGETHER_API_KEY',
  'GITHUB_PAT',
  'GITHUB_TOKEN',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'MINIMAX_API_KEY',
  'REPLICATE_API_KEY',
  'DEEPSEEK_API_KEY',
  'XAI_API_KEY',
] as const

const originalEnv = new Map<string, string | undefined>()

for (const key of ENV_KEYS) {
  originalEnv.set(key, process.env[key])
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalEnv.get(key)
    if (original === undefined) delete process.env[key]
    else process.env[key] = original
  }
})

describe('provider-config source-of-truth lock', () => {
  it('keeps supported aliases for approved providers only', () => {
    expect(getIntegrationKey('dashscope')).toBe('qwen')
    expect(getIntegrationKey('hf')).toBe('huggingface')
    expect(getIntegrationKey('genx')).toBe('genx')
    expect(getIntegrationKey('groq')).toBe('groq')
  })

  it('resolves env aliases for approved providers and platform services', () => {
    process.env.QWEN_API_KEY = 'test-qwen-key'
    process.env.HF_TOKEN = 'test-hf-key'
    process.env.GITHUB_PAT = 'test-github-key'

    expect(getEnvKeyForProvider('qwen')).toBe('test-qwen-key')
    expect(getEnvKeyForProvider('dashscope')).toBe('test-qwen-key')
    expect(getEnvKeyForProvider('huggingface')).toBe('test-hf-key')
    expect(getEnvKeyForProvider('hf')).toBe('test-hf-key')
    expect(getEnvKeyForProvider('github')).toBe('test-github-key')
  })

  it('does not resolve stale direct provider env keys', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.MINIMAX_API_KEY = 'test-minimax-key'
    process.env.REPLICATE_API_KEY = 'test-replicate-key'
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'
    process.env.XAI_API_KEY = 'test-xai-key'

    for (const provider of ['openai', 'gemini', 'minimax', 'replicate', 'deepseek', 'xai']) {
      expect(getEnvKeyForProvider(provider)).toBeNull()
      await expect(getProviderKeyWithSource(provider)).resolves.toEqual({ key: null, source: 'missing' })
      await expect(isProviderConfigured(provider)).resolves.toBe(false)
    }
  })

  it('keeps approved env provider resolution available', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key'
    await expect(getProviderKeyWithSource('groq')).resolves.toEqual({ key: 'test-groq-key', source: 'env' })
    await expect(isProviderConfigured('groq')).resolves.toBe(true)
  })
})
