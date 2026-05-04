import { getServiceKey, isUsableServiceKey } from '@/lib/service-vault'
import { decryptVaultKey } from '@/lib/crypto-vault'
import { prisma } from '@/lib/prisma'

export type CoreProvider =
  | 'genx'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'gemini'
  | 'replicate'
  | 'suno'
  | 'github'
  | 'together'
  | 'qwen'
  | 'dashscope'
  | 'huggingface'
  | 'hf'
  | 'xai'
  | 'grok'
  | 'openrouter'
  | 'minimax'
  | 'mimo'
  | 'mistral'
  | 'cohere'
  | 'firecrawl'
  | 'mem0'
  | 'webdock'
  | 'elevenlabs'
  | 'deepgram'
  | 'deepseek'
  | 'moonshot'
  | 'zhipu'
  | 'udio'
  | 'qdrant'
  | 'posthog'

const PROVIDER_ENV: Record<CoreProvider, string[]> = {
  genx: ['GENX_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  groq: ['GROQ_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
  replicate: ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY'],
  suno: ['SUNO_API_KEY'],
  github: ['GITHUB_TOKEN'],
  together: ['TOGETHER_API_KEY'],
  qwen: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
  dashscope: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
  huggingface: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
  hf: ['HF_TOKEN', 'HUGGINGFACEHUB_API_TOKEN', 'HUGGINGFACE_API_KEY'],
  xai: ['XAI_API_KEY', 'GROK_API_KEY'],
  grok: ['GROK_API_KEY', 'XAI_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  minimax: ['MINIMAX_API_KEY', 'MIMO_API_KEY'],
  mimo: ['MIMO_API_KEY', 'MINIMAX_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  cohere: ['COHERE_API_KEY'],
  firecrawl: ['FIRECRAWL_API_KEY'],
  mem0: ['MEM0_API_KEY'],
  webdock: ['WEBDOCK_API_KEY'],
  elevenlabs: ['ELEVENLABS_API_KEY'],
  deepgram: ['DEEPGRAM_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  moonshot: ['MOONSHOT_API_KEY'],
  zhipu: ['ZHIPU_API_KEY'],
  udio: ['UDIO_API_KEY'],
  qdrant: ['QDRANT_API_KEY'],
  posthog: ['POSTHOG_API_KEY'],
}

const PROVIDER_INTEGRATION_KEY: Record<CoreProvider, string> = {
  genx: 'genx',
  openai: 'openai',
  anthropic: 'anthropic',
  groq: 'groq',
  gemini: 'gemini',
  replicate: 'replicate',
  suno: 'suno',
  github: 'github',
  together: 'together',
  qwen: 'qwen',
  dashscope: 'qwen',
  huggingface: 'huggingface',
  hf: 'huggingface',
  xai: 'xai',
  grok: 'xai',
  openrouter: 'openrouter',
  minimax: 'minimax',
  mimo: 'minimax',
  mistral: 'mistral',
  cohere: 'cohere',
  firecrawl: 'firecrawl',
  mem0: 'mem0',
  webdock: 'webdock',
  elevenlabs: 'elevenlabs',
  deepgram: 'deepgram',
  deepseek: 'deepseek',
  moonshot: 'moonshot',
  zhipu: 'zhipu',
  udio: 'udio',
  qdrant: 'qdrant',
  posthog: 'posthog',
}

export type ProviderKeySource = 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'

function normalizeProviderKey(provider: CoreProvider): CoreProvider {
  if (provider === 'dashscope') return 'qwen'
  if (provider === 'grok') return 'xai'
  if (provider === 'mimo') return 'minimax'
  if (provider === 'hf') return 'huggingface'
  return provider
}

/** Returns the canonical integration key for a given provider (resolves aliases). */
export function getIntegrationKey(provider: CoreProvider): string {
  return PROVIDER_INTEGRATION_KEY[provider]
}

/** Returns the first matching env var value for a provider (env only, no vault). Useful for diagnostics. */
export function getEnvKeyForProvider(provider: CoreProvider): string | null {
  const normalized = normalizeProviderKey(provider)
  const aliases = new Set<string>([normalized])
  if (normalized === 'xai') aliases.add('grok')
  if (normalized === 'qwen') aliases.add('dashscope')
  if (normalized === 'minimax') aliases.add('mimo')
  if (normalized === 'huggingface') aliases.add('hf')

  for (const alias of aliases) {
    const envVars = PROVIDER_ENV[alias as CoreProvider] ?? []
    for (const envVar of envVars) {
      const val = process.env[envVar]
      if (val?.trim()) return val.trim()
    }
  }
  return null
}

async function getAiProviderKey(provider: CoreProvider): Promise<string | null> {
  const normalized = normalizeProviderKey(provider)
  const aliases = new Set<string>([normalized])
  if (normalized === 'xai') aliases.add('grok')
  if (normalized === 'qwen') aliases.add('dashscope')
  if (normalized === 'minimax') aliases.add('mimo')
  if (normalized === 'huggingface') aliases.add('hf')

  try {
    const row = await prisma.aiProvider.findFirst({
      where: { providerKey: { in: [...aliases] } },
      select: { apiKey: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (row?.apiKey) {
      const decrypted = decryptVaultKey(row.apiKey)
      if (isUsableServiceKey(decrypted)) return decrypted.trim()
    }
  } catch {
    // DB unavailable; env fallback below remains safe for CI/local.
  }
  return null
}

async function getLegacyGitHubToken(): Promise<string | null> {
  try {
    const row = await prisma.gitHubConfig.findFirst({
      orderBy: { id: 'desc' },
      select: { accessToken: true },
    })
    return isUsableServiceKey(row?.accessToken) ? row!.accessToken.trim() : null
  } catch {
    return null
  }
}

export async function getProviderKeyWithSource(provider: CoreProvider): Promise<{
  key: string | null
  source: ProviderKeySource
}> {
  const normalized = normalizeProviderKey(provider)

  for (const envVar of PROVIDER_ENV[provider]) {
    const key = await getServiceKey(PROVIDER_INTEGRATION_KEY[provider], envVar)
    if (key) {
      const envValue = process.env[envVar]
      return { key, source: envValue && key === envValue.trim() ? 'env' : 'vault' }
    }
  }

  const aiProviderKey = await getAiProviderKey(normalized)
  if (aiProviderKey) return { key: aiProviderKey, source: 'ai_provider' }

  if (normalized === 'github') {
    const legacyToken = await getLegacyGitHubToken()
    if (legacyToken) return { key: legacyToken, source: 'legacy_github' }
  }

  return { key: null, source: 'missing' }
}

export async function getProviderKey(provider: CoreProvider): Promise<string | null> {
  return (await getProviderKeyWithSource(provider)).key
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
