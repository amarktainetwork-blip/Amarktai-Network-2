import { getMeshCredential } from '@/lib/provider-mesh-status'
import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
import { isUsableServiceKey } from '@/lib/service-vault'

export type CoreProvider =
  | ProviderMeshId
  | 'dashscope'
  | 'hf'

export type ProviderKeySource = 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'

const COMPATIBLE_PROVIDER_ALIASES: Record<string, ProviderMeshId> = {
  dashscope: 'qwen',
  hf: 'huggingface',
}

function normalizeProviderKey(provider: string): string {
  return COMPATIBLE_PROVIDER_ALIASES[provider] ?? provider
}

function activeProviderId(provider: string): ProviderMeshId | null {
  const normalized = normalizeProviderKey(provider)
  return getProviderMeshNode(normalized) ? normalized as ProviderMeshId : null
}

function envAliasesForProvider(provider: string): string[] {
  const normalized = normalizeProviderKey(provider)
  const node = getProviderMeshNode(normalized)
  if (!node) return []

  const aliases = new Set<string>(node.envAliases)

  if (provider === 'dashscope') {
    aliases.add('DASHSCOPE_API_KEY')
    aliases.add('QWEN_API_KEY')
  }

  if (provider === 'hf') {
    aliases.add('HF_TOKEN')
    aliases.add('HUGGINGFACE_API_KEY')
    aliases.add('HUGGINGFACEHUB_API_TOKEN')
  }

  return [...aliases]
}

function isAcceptableEnvKey(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('test-')) return true
  return isUsableServiceKey(trimmed)
}

/**
 * Returns the canonical integration key for approved providers and supported aliases.
 *
 * This is intentionally locked to provider-mesh.
 * Unapproved direct providers are returned as their raw key for display-only compatibility,
 * but getProviderKey/getProviderKeyWithSource will not resolve keys for them.
 */
export function getIntegrationKey(provider: CoreProvider | string): string {
  return normalizeProviderKey(provider)
}

/**
 * Environment fallback is only allowed for provider-mesh entries and supported aliases.
 * This prevents stale direct providers from appearing configured through env variables.
 */
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
  const id = activeProviderId(provider)
  const envKey = getEnvKeyForProvider(provider)

  if (!id) {
    return { key: null, source: 'missing' }
  }

  const key = await getMeshCredential(id).catch(() => null)
  if (isUsableServiceKey(key)) {
    const trimmed = key.trim()
    return { key: trimmed, source: envKey === trimmed ? 'env' : 'vault' }
  }

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
