import { getCapability } from './capability-registry'
import { getCanonicalProviderHealth } from './health'
import { discoverModelsForCapability } from './model-discovery'
import { PROVIDER_TRUTH } from './provider-truth'
import { rejectionForProviderModel, scoreProviderModel } from './provider-scoring'
import { getRoutingProfile } from './routing-profiles'
import type {
  CapabilityId,
  DynamicRoutePlan,
  ProviderId,
  ProviderRouteRejection,
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
  fallbackAllowed?: boolean
}): Promise<DynamicRoutePlan> {
  const capability = getCapability(input.capability)
  const profile = getRoutingProfile(input.profile ?? 'balanced', input.preferences)
  const fallbackAllowed = input.fallbackAllowed ?? true
  const providerPin = profile.preferences.providerPreference?.[0] ?? null
  const modelPin = profile.preferences.modelPreference?.[0] ?? null
  if (!capability) {
    return {
      capability: input.capability,
      profile: profile.id,
      selected: null,
      candidates: [],
      fallbackChain: [],
      rejectedCandidates: [],
      fallbackAllowed,
      providerPin,
      modelPin,
      reason: 'Capability is not registered.',
    }
  }
  const discoveries = await discoverModelsForCapability(capability.id)
  const rejectedCandidates: ProviderRouteRejection[] = []
  const candidates = (await Promise.all(discoveries.flatMap(({ snapshot, models }) => {
    if (models.length === 0) {
      const provider = getProviderTruth(snapshot.provider)!
      rejectedCandidates.push({
        provider: provider.id,
        modelId: null,
        capability: capability.id,
        code: snapshot.status === 'not_configured' ? 'PROVIDER_NOT_CONFIGURED' : 'CAPABILITY_UNSUPPORTED',
        reason: snapshot.error ?? 'Provider discovery returned no executable model for this capability.',
      })
      return []
    }
    return models.map(async (model) => {
      const provider = getProviderTruth(snapshot.provider)!
      const health = await getCanonicalProviderHealth(provider.id)
      const rejection = rejectionForProviderModel({ provider, model, capability, health, profile })
      if (rejection) rejectedCandidates.push(rejection)
      return scoreProviderModel({ provider, model, capability, health, profile })
    })
  }))).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.score - left.score)
  const selected = candidates[0] ?? null
  return {
    capability: capability.id,
    profile: profile.id,
    selected,
    candidates,
    fallbackChain: fallbackAllowed ? candidates.slice(1) : [],
    rejectedCandidates,
    fallbackAllowed,
    providerPin,
    modelPin,
    reason: candidates.length
      ? routeReason(profile.id, selected?.provider ?? null, fallbackAllowed)
      : noRouteReason(rejectedCandidates, fallbackAllowed),
  }
}

function routeReason(profileId: RoutingProfileId, selectedProvider: ProviderId | null, fallbackAllowed: boolean): string {
  if (profileId === 'premium' && selectedProvider === 'genx') {
    return 'Premium selected GenX first because GenX has executable evidence for this capability.'
  }
  if (profileId === 'premium') {
    return fallbackAllowed
      ? 'Premium could not select GenX for this capability, so it used the highest-scoring executable fallback.'
      : 'Premium selected the highest-scoring executable candidate with fallback disabled.'
  }
  if (profileId === 'cheap') return 'Cheap selected the lowest-cost executable candidate that satisfies capability and policy gates.'
  if (profileId === 'pinned') return 'Pinned routing selected the highest-scoring candidate that matched the provider/model pin.'
  return `${profileId} selected the highest-scoring discovered model using model metadata or a provider capability contract.`
}

function noRouteReason(rejections: ProviderRouteRejection[], fallbackAllowed: boolean): string {
  const topReasons = [...new Set(rejections.slice(0, 4).map((entry) => entry.reason))]
  const fallbackNote = fallbackAllowed ? 'Fallback was allowed.' : 'Fallback was disabled.'
  const base = 'No configured provider returned a discovered model with model metadata or provider-contract evidence for this request.'
  return topReasons.length
    ? `${base} No executable provider/model satisfied this request. ${fallbackNote} Top blockers: ${topReasons.join(' ')}`
    : `${base} ${fallbackNote}`
}
