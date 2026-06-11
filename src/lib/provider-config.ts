import { getMeshCredential } from '@/lib/provider-mesh-status'
import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
import { isUsableServiceKey } from '@/lib/service-vault'

export type CoreProvider =
  | ProviderMeshId
  | 'dashscope'
  | 'hf'

export type ProviderKeySource = 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'

function normalizeProviderKey(provider: string): string {
  if (provider === 'dashscope') return 'qwen'
  if (provider === 'hf') return 'huggingface'
  return provider
}

function activeProviderId(provider: string): ProviderMeshId | null {
  const normalized = normalizeProviderKey(provider)
  return getProviderMeshNode(normalized) ? normalized as ProviderMeshId : null
}

export function getIntegrationKey(provider: CoreProvider | string): string {
  return normalizeProviderKey(provider)
}

export function getEnvKeyForProvider(provider: CoreProvider | string): string | null {
  const id = activeProviderId(provider)
  const node = id ? getProviderMeshNode(id) : null
  for (const envVar of node?.envAliases ?? []) {
    const value = process.env[envVar]
    if (isUsableServiceKey(value)) return value.trim()
  }
  return null
}

export async function getProviderKeyWithSource(provider: CoreProvider | string): Promise<{
  key: string | null
  source: ProviderKeySource
}> {
  const id = activeProviderId(provider)
  if (!id) return { key: null, source: 'missing' }

  const key = await getMeshCredential(id)
  if (!isUsableServiceKey(key)) return { key: null, source: 'missing' }

  const envKey = getEnvKeyForProvider(provider)
  return { key: key.trim(), source: envKey === key.trim() ? 'env' : 'vault' }
}

export async function getProviderKey(provider: CoreProvider | string): Promise<string | null> {
  return (await getProviderKeyWithSource(provider)).key
}

export async function isProviderConfigured(provider: CoreProvider | string): Promise<boolean> {
  return Boolean(await getProviderKey(provider))
}

export function maskSecret(raw: string | null | undefined): string | null {
  if (!isUsableServiceKey(raw)) return null
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
