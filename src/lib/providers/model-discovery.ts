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

  const compatibleEvidence = available
    .filter((model) => compatibleCapabilities(normalizedCapability)
      .some((candidateCapability) => model.capabilities.includes(candidateCapability)))
  if (compatibleEvidence.length > 0) {
    return compatibleEvidence.map((model) => ({
      ...model,
      capabilities: [...new Set([...model.capabilities, normalizedCapability])],
      raw: {
        ...model.raw,
        capability_evidence: model.capabilityEvidence,
        capability_contract: normalizedCapability,
        compatible_capability_source: model.capabilities,
      },
    }))
  }

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
  if (provider === 'groq') return ['chat', 'reasoning', 'coding', 'tts', 'stt'].includes(capability)
  if (provider === 'mimo') return ['chat', 'reasoning', 'coding', 'tts'].includes(capability)
  if (provider === 'qwen') return ['chat', 'reasoning', 'coding', 'translation', 'embeddings', 'image', 'image_edit', 'video'].includes(capability)
  if (provider === 'together') return ['chat', 'reasoning', 'coding', 'image', 'image_edit', 'tts', 'stt', 'embeddings', 'rerank', 'agents'].includes(capability)
  if (provider === 'genx') return ['chat', 'reasoning', 'coding', 'image', 'image_edit', 'video', 'avatar', 'music', 'tts', 'stt'].includes(capability)
  return false
}

function compatibleCapabilities(capability: CapabilityId): CapabilityId[] {
  if (capability === 'reasoning' || capability === 'coding' || capability === 'research' || capability === 'agents') return ['chat']
  if (capability === 'avatar' || capability === 'adult_image') return ['image']
  if (capability === 'image_edit') return ['image']
  if (capability === 'adult_video') return ['video', 'image_to_video']
  return []
}
