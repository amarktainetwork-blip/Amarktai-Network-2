import { discoverProvider, type ProviderDiscoveryOptions } from './provider-discovery'
import { resolveCanonicalCapability } from './capability-registry'
import { PROVIDER_TRUTH } from './provider-truth'
import type {
  CapabilityId,
  DiscoveredModel,
  ProviderDiscoverySnapshot,
  ProviderId,
} from './provider-types'

export async function discoverModels(
  provider: ProviderId,
  options: ProviderDiscoveryOptions = {},
): Promise<DiscoveredModel[]> {
  return (await discoverProvider(provider, options)).models
}

export async function discoverModelsForCapability(
  capability: CapabilityId,
  options: ProviderDiscoveryOptions = {},
): Promise<Array<{ snapshot: ProviderDiscoverySnapshot; models: DiscoveredModel[] }>> {
  return Promise.all(PROVIDER_TRUTH
    .filter((provider) => provider.capabilities.includes(capability))
    .map(async (provider) => {
    const snapshot = await discoverProvider(provider.id, {
      ...options,
      capability: provider.id === 'huggingface' ? capability : options.capability,
    })
    return {
      snapshot,
      models: modelsForCapability(snapshot, capability),
    }
  }))
}

export function modelsForCapability(
  snapshot: ProviderDiscoverySnapshot,
  capability: CapabilityId,
): DiscoveredModel[] {
  const normalizedCapability = resolveCanonicalCapability(capability) ?? capability
  const available = snapshot.models.filter((model) => model.status !== 'unavailable')
  const modelEvidence = available.filter((model) =>
    model.capabilities.includes(capability) || model.capabilities.includes(normalizedCapability),
  )
  if (modelEvidence.length > 0) return modelEvidence

  const provider = PROVIDER_TRUTH.find((entry) => entry.id === snapshot.provider)
  if (
    snapshot.status !== 'ready'
    || !provider?.capabilities.includes(normalizedCapability)
  ) return []

  const contractEligible = available.filter((model) =>
    model.capabilities.length === 0
    && providerContractEligible(snapshot.provider, normalizedCapability),
  )

  return contractEligible.map((model) => ({
    ...model,
    capabilities: [normalizedCapability],
    capabilityEvidence: 'provider_contract' as const,
    raw: {
      ...model.raw,
      capability_evidence: 'provider_contract',
      capability_contract: normalizedCapability,
    },
  }))
}

function providerContractEligible(provider: ProviderId, capability: CapabilityId) {
  if (provider === 'huggingface') return false
  if (provider === 'groq') return ['chat', 'reasoning', 'coding'].includes(capability)
  if (provider === 'mimo') return ['chat', 'reasoning', 'coding', 'tts'].includes(capability)
  if (provider === 'qwen') return ['chat', 'reasoning', 'coding', 'translation', 'embeddings'].includes(capability)
  if (provider === 'together') return ['chat', 'reasoning', 'coding', 'embeddings', 'rerank', 'agents'].includes(capability)
  if (provider === 'genx') return ['chat', 'reasoning', 'coding', 'music', 'tts'].includes(capability)
  return false
}
