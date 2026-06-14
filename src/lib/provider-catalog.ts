import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'
import { PROVIDER_REGISTRY } from '@/lib/provider-registry'

export interface CanonicalProviderEntry {
  readonly key: ApprovedDirectProviderId
  readonly displayName: string
  readonly defaultBaseUrl: string
  readonly healthCheckSupported: boolean
  readonly supportedCapabilityFamilies: readonly string[]
  readonly sortOrder: number
  readonly launchRequired: boolean
}

const CAPABILITY_FAMILIES: Record<ApprovedDirectProviderId, readonly string[]> = {
  genx: ['chat', 'reasoning', 'code', 'image_generation', 'voice', 'agent_planning'],
  huggingface: ['task_text', 'task_image', 'task_voice', 'embeddings'],
  qwen: ['chat', 'reasoning', 'code', 'vision', 'image_generation', 'video_generation', 'voice'],
  mimo: ['chat', 'reasoning', 'code', 'vision', 'voice', 'video_understanding', 'tools'],
  groq: ['chat', 'reasoning', 'code', 'voice'],
  together: ['chat', 'code', 'image_generation'],
}

export const CANONICAL_PROVIDERS: readonly CanonicalProviderEntry[] = PROVIDER_REGISTRY.map((provider, sortOrder) => ({
  key: provider.id,
  displayName: provider.displayName,
  defaultBaseUrl: provider.baseUrl,
  healthCheckSupported: true,
  supportedCapabilityFamilies: CAPABILITY_FAMILIES[provider.id],
  sortOrder,
  launchRequired: provider.id === 'genx',
}))

export function getCanonicalProvider(key: string): CanonicalProviderEntry | undefined {
  return CANONICAL_PROVIDERS.find((provider) => provider.key === key)
}

export function getCanonicalProviderKeys(): string[] {
  return CANONICAL_PROVIDERS.map((provider) => provider.key)
}
