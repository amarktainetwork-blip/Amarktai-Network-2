import { getServiceKey, isUsableServiceKey } from '@/lib/service-vault'

export type CoreProvider =
  | 'genx'
  | 'openai'
  | 'groq'
  | 'gemini'
  | 'replicate'
  | 'suno'
  | 'github'
  | 'together'
  | 'qwen'

const PROVIDER_ENV: Record<CoreProvider, string[]> = {
  genx: ['GENX_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  groq: ['GROQ_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
  replicate: ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY'],
  suno: ['SUNO_API_KEY'],
  github: ['GITHUB_TOKEN'],
  together: ['TOGETHER_API_KEY'],
  qwen: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
}

const PROVIDER_INTEGRATION_KEY: Record<CoreProvider, string> = {
  genx: 'genx',
  openai: 'openai',
  groq: 'groq',
  gemini: 'gemini',
  replicate: 'replicate',
  suno: 'suno',
  github: 'github',
  together: 'together',
  qwen: 'qwen',
}

export async function getProviderKey(provider: CoreProvider): Promise<string | null> {
  for (const envVar of PROVIDER_ENV[provider]) {
    const key = await getServiceKey(PROVIDER_INTEGRATION_KEY[provider], envVar)
    if (key) return key
  }
  return null
}

export async function isProviderConfigured(provider: CoreProvider): Promise<boolean> {
  return !!await getProviderKey(provider)
}

export function maskSecret(raw: string | null | undefined): string | null {
  if (!isUsableServiceKey(raw)) return null
  const trimmed = raw.trim()
  if (trimmed.length <= 8) return 'configured'
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}

export async function getMaskedProviderStatus(provider: CoreProvider): Promise<{
  configured: boolean
  maskedKey: string | null
}> {
  const key = await getProviderKey(provider)
  return { configured: !!key, maskedKey: maskSecret(key) }
}
