import { discoverProvider, type ProviderDiscoveryOptions } from './provider-discovery'
import { providersForCapability } from './registry'
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
  return Promise.all(providersForCapability(capability).map(async (provider) => {
    const snapshot = await discoverProvider(provider.id, options)
    return {
      snapshot,
      models: snapshot.models.filter((model) =>
        model.status !== 'unavailable'
        && model.capabilities.includes(capability),
      ),
    }
  }))
}
