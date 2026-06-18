import type {
  CapabilityDefinition,
  DiscoveredModel,
  ProviderHealthSnapshot,
  ProviderRouteCandidate,
  ProviderTruthDefinition,
  RoutingProfile,
} from './provider-types'

export function scoreProviderModel(input: {
  provider: ProviderTruthDefinition
  model: DiscoveredModel
  capability: CapabilityDefinition
  health: ProviderHealthSnapshot
  profile: RoutingProfile
}): ProviderRouteCandidate | null {
  const { provider, model, capability, health, profile } = input
  const allowDegradedFallback = provider.id === 'genx'
    && model.capabilityEvidence === 'provider_contract'
    && model.raw.source === 'genx_static_runtime_fallback'
  const allowLiveAuthenticatedDegraded = model.discoverySource === 'live_authenticated'
  if (model.status === 'unavailable') return null
  if (!model.capabilities.includes(capability.id)) return null
  if (!health.configured) return null
  if (health.state === 'degraded' && !allowDegradedFallback && !allowLiveAuthenticatedDegraded) return null
  if (capability.requiresAdultPermission && profile.preferences.adult !== true) return null
  if (profile.preferences.streaming === true && model.streaming !== true && !provider.features.streaming) {
    return null
  }
  if (profile.preferences.artifactSupport === true && !model.artifactSupport) return null
  if (
    provider.billing.paidEnabledEnv
    && model.raw.free_quota_eligible === false
    && process.env[provider.billing.paidEnabledEnv]?.trim().toLowerCase() !== 'true'
  ) return null
  if (
    profile.preferences.providerPreference?.length
    && !profile.preferences.providerPreference.includes(provider.id)
  ) return null
  if (
    profile.preferences.modelPreference?.length
    && !profile.preferences.modelPreference.includes(model.id)
  ) return null

  const availability = model.status === 'available' ? 1 : 0.5
  const evidence = model.capabilityEvidence === 'model_metadata' ? 1 : 0.55
  const healthScore = health.state === 'healthy'
      ? 1
    : health.state === 'unknown'
      ? 0.5
      : allowDegradedFallback || allowLiveAuthenticatedDegraded ? 0.25 : 0
  const scoreBreakdown = {
    quality: normalized(model.quality) * profile.weights.quality,
    speed: normalized(model.speed) * profile.weights.speed,
    cost: inverse(model.cost) * profile.weights.cost,
    availability: availability * profile.weights.availability,
    adult: (capability.requiresAdultPermission ? 1 : 0.5) * profile.weights.adult,
    research: (model.research === true ? 1 : 0.5) * profile.weights.research,
    streaming: (model.streaming === true || provider.features.streaming ? 1 : 0.5) * profile.weights.streaming,
    health: healthScore * profile.weights.health,
    artifactSupport: (model.artifactSupport ? 1 : 0) * profile.weights.artifactSupport,
    evidence: evidence * 0.2,
  }
  return {
    provider: provider.id,
    model,
    health,
    score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0),
    scoreBreakdown,
  }
}

function normalized(value: number | null): number {
  if (value === null) return 0.5
  if (value >= 0 && value <= 1) return value
  return Math.max(0, Math.min(1, value / 100))
}

function inverse(value: number | null): number {
  return value === null ? 0.5 : 1 - normalized(value)
}
