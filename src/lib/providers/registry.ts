import { getCapability } from './capability-registry'
import { getCanonicalProviderHealth } from './health'
import { discoverModelsForCapability } from './model-discovery'
import { PROVIDER_TRUTH } from './provider-truth'
import { scoreProviderModel } from './provider-scoring'
import { getRoutingProfile } from './routing-profiles'
import type {
  CapabilityId,
  DynamicRoutePlan,
  ProviderId,
  ProviderTruthDefinition,
  RoutingPreferences,
  RoutingProfileId,
} from './provider-types'

export function listProviderTruth(): readonly ProviderTruthDefinition[] {
  return PROVIDER_TRUTH
}

export function getProviderTruth(id: string): ProviderTruthDefinition | null {
  return PROVIDER_TRUTH.find((provider) => provider.id === id) ?? null
}

export function providersForCapability(capability: CapabilityId): ProviderTruthDefinition[] {
  return PROVIDER_TRUTH.filter((provider) => provider.capabilities.includes(capability))
}

export function isCanonicalProvider(id: string): id is ProviderId {
  return PROVIDER_TRUTH.some((provider) => provider.id === id)
}

export async function planDynamicCapabilityRoute(input: {
  capability: CapabilityId
  profile?: RoutingProfileId
  preferences?: RoutingPreferences
}): Promise<DynamicRoutePlan> {
  const capability = getCapability(input.capability)
  const profile = getRoutingProfile(input.profile ?? 'balanced', input.preferences)
  if (!capability) {
    return {
      capability: input.capability,
      profile: profile.id,
      selected: null,
      candidates: [],
      reason: 'Capability is not registered.',
    }
  }
  const discoveries = await discoverModelsForCapability(capability.id)
  const candidates = (await Promise.all(discoveries.flatMap(({ snapshot, models }) =>
    models.map(async (model) => {
      const provider = getProviderTruth(snapshot.provider)!
      const health = await getCanonicalProviderHealth(provider.id)
      return scoreProviderModel({ provider, model, capability, health, profile })
    }),
  ))).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.score - left.score)
  return {
    capability: capability.id,
    profile: profile.id,
    selected: candidates[0] ?? null,
    candidates,
    reason: candidates.length
      ? `${profile.id} selected the highest-scoring discovered model using model metadata or a provider capability contract.`
      : 'No configured provider returned a discovered model with model metadata or provider-contract evidence for this request.',
  }
}
