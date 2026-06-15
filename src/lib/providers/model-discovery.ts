import { discoverProvider, type ProviderDiscoveryOptions } from './provider-discovery'
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
  const available = snapshot.models.filter((model) => model.status !== 'unavailable')
  const modelEvidence = available.filter((model) => model.capabilities.includes(capability))
  if (modelEvidence.length > 0) return modelEvidence

  const provider = PROVIDER_TRUTH.find((entry) => entry.id === snapshot.provider)
  if (
    snapshot.status !== 'ready'
    || !provider?.capabilities.includes(capability)
  ) return []

  return available
    .filter((model) => model.capabilities.length === 0)
    .map((model) => ({
      ...model,
      capabilities: [capability],
      capabilityEvidence: 'provider_contract' as const,
      raw: {
        ...model.raw,
        capability_evidence: 'provider_contract',
        capability_contract: capability,
      },
    }))
}
