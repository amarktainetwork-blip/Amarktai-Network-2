import { APPROVED_AI_PROVIDERS, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
import { getProviderRuntime, type ArtifactHandling, type ProviderAudience } from '@/lib/provider-runtime'

export interface CanonicalProviderEntry {
  readonly key: ApprovedProviderKey
  readonly displayName: string
  readonly defaultBaseUrl: string
  readonly healthCheckSupported: boolean
  readonly supportedCapabilityFamilies: readonly string[]
  readonly testEndpointMap: Readonly<Record<string, string>>
  readonly asyncJobSupport: boolean
  readonly artifactHandling: ArtifactHandling
  readonly audience: ProviderAudience
  readonly sortOrder: number
  readonly launchRequired: boolean
}

const CAPABILITY_FAMILIES: Record<ApprovedProviderKey, readonly string[]> = {
  genx: ['chat', 'reasoning', 'code', 'media_requires_verification', 'voice_requires_verification', 'agent_planning'],
  groq: ['chat', 'streaming_chat', 'reasoning', 'code', 'speech_to_text'],
  together: ['chat', 'streaming_requires_verification', 'image_generation', 'embeddings_requires_verification', 'rerank_requires_verification'],
}

export const CANONICAL_PROVIDERS: readonly CanonicalProviderEntry[] = APPROVED_AI_PROVIDERS.map((provider) => {
  const runtime = getProviderRuntime(provider.key)

  return {
    key: provider.key,
    displayName: provider.displayName,
    defaultBaseUrl: provider.defaultBaseUrl,
    healthCheckSupported: Boolean(runtime?.taskEndpointMap.health),
    supportedCapabilityFamilies: CAPABILITY_FAMILIES[provider.key],
    testEndpointMap: runtime?.testEndpointMap ?? {},
    asyncJobSupport: runtime?.asyncJobSupport ?? false,
    artifactHandling: runtime?.artifactHandling ?? 'none',
    audience: runtime?.audience ?? 'normal_only',
    sortOrder: provider.sortOrder,
    launchRequired: provider.key === 'genx',
  }
})

export function getCanonicalProvider(key: string): CanonicalProviderEntry | undefined {
  return CANONICAL_PROVIDERS.find((provider) => provider.key === key)
}

export function getCanonicalProviderKeys(): string[] {
  return CANONICAL_PROVIDERS.map((provider) => provider.key)
}
