import { getMeshCredential } from '@/lib/provider-mesh-status'
import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
import { getServiceKey, isUsableServiceKey } from '@/lib/service-vault'

export type CoreProvider =
  | ProviderMeshId
  | 'dashscope'
  | 'hf'
  | 'xai'
  | 'grok'
  | 'minimax'
  | 'deepseek'
  | 'gemini'
  | 'firecrawl'
  | 'replicate'
  | 'elevenlabs'
  | 'deepgram'
  | 'openrouter'
  | 'moonshot'
  | 'zhipu'
  | 'mem0'
  | 'webdock'

export type ProviderKeySource = 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'

const PROVIDER_ENV_ALIASES: Record<string, string[]> = {
  genx: ['GENX_API_KEY'],
  github: ['GITHUB_PAT', 'GITHUB_TOKEN'],
  qwen: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
  dashscope: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
  huggingface: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
  hf: ['HF_TOKEN', 'HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN'],
  mimo: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
  minimax: ['MINIMAX_API_KEY'],
  groq: ['GROQ_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  xai: ['XAI_API_KEY', 'GROK_API_KEY'],
  grok: ['GROK_API_KEY', 'XAI_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  firecrawl: ['FIRECRAWL_API_KEY'],
  replicate: ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY'],
  elevenlabs: ['ELEVENLABS_API_KEY'],
  deepgram: ['DEEPGRAM_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  moonshot: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
  zhipu: ['ZHIPU_API_KEY'],
  mem0: ['MEM0_API_KEY'],
  webdock: ['WEBDOCK_API_TOKEN', 'WEBDOCK_API_KEY'],
}

function normalizeProviderKey(provider: string): string {
  if (provider === 'dashscope') return 'qwen'
  if (provider === 'hf') return 'huggingface'
  if (provider === 'grok') return 'xai'
  return provider
}

function activeProviderId(provider: string): ProviderMeshId | null {
  const normalized = normalizeProviderKey(provider)
  return getProviderMeshNode(normalized) ? normalized as ProviderMeshId : null
}

function envAliasesForProvider(provider: string): string[] {
  const normalized = normalizeProviderKey(provider)
  const aliases = new Set<string>()

  for (const alias of PROVIDER_ENV_ALIASES[provider] ?? []) aliases.add(alias)
  for (const alias of PROVIDER_ENV_ALIASES[normalized] ?? []) aliases.add(alias)

  const node = getProviderMeshNode(normalized)
  for (const alias of node?.envAliases ?? []) aliases.add(alias)

  return [...aliases]
}

function isAcceptableEnvKey(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('test-')) return true
  return isUsableServiceKey(trimmed)
}

export function getIntegrationKey(provider: CoreProvider | string): string {
  return normalizeProviderKey(provider)
}

export function getEnvKeyForProvider(provider: CoreProvider | string): string | null {
  for (const envVar of envAliasesForProvider(provider)) {
    const value = process.env[envVar]
    if (isAcceptableEnvKey(value)) return value.trim()
  }
  return null
}

export async function getProviderKeyWithSource(provider: CoreProvider | string): Promise<{
  key: string | null
  source: ProviderKeySource
}> {
  const normalized = normalizeProviderKey(provider)
  const envKey = getEnvKeyForProvider(provider)
  const id = activeProviderId(provider)

  if (id) {
    const key = await getMeshCredential(id)
    if (isUsableServiceKey(key)) {
      const trimmed = key.trim()
      return { key: trimmed, source: envKey === trimmed ? 'env' : 'vault' }
    }

    if (envKey) return { key: envKey, source: 'env' }

    return { key: null, source: 'missing' }
  }

  const aliases = envAliasesForProvider(provider)
  const vaultKey = await getServiceKey(normalized, aliases[0] ?? '').catch(() => null)

  if (isUsableServiceKey(vaultKey)) return { key: vaultKey.trim(), source: 'vault' }
  if (envKey) return { key: envKey, source: 'env' }

  return { key: null, source: 'missing' }
}

export async function getProviderKey(provider: CoreProvider | string): Promise<string | null> {
  return (await getProviderKeyWithSource(provider)).key
}

export async function isProviderConfigured(provider: CoreProvider | string): Promise<boolean> {
  return Boolean(await getProviderKey(provider))
}

export function maskSecret(raw: string | null | undefined): string | null {
  if (!isAcceptableEnvKey(raw)) return null
  const trimmed = raw.trim()
  if (trimmed.length <= 8) return 'configured'
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}

export async function getMaskedProviderStatus(provider: CoreProvider | string): Promise<{
  configured: boolean
  maskedKey: string | null
}> {
  const key = await getProviderKey(provider)
  return { configured: Boolean(key), maskedKey: maskSecret(key) }
}
