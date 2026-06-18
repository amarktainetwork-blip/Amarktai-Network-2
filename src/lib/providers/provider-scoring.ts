import type {
  CapabilityDefinition,
  DiscoveredModel,
  ProviderHealthSnapshot,
  ProviderRouteRejection,
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
  if (rejectionForProviderModel(input)) return null
  const allowDegradedFallback = provider.id === 'genx'
    && model.capabilityEvidence === 'provider_contract'
    && model.raw.source === 'genx_static_runtime_fallback'
  const allowLiveAuthenticatedDegraded = model.discoverySource === 'live_authenticated'
  const availability = model.status === 'available' ? 1 : 0.5
  const evidence = model.capabilityEvidence === 'model_metadata' ? 1 : 0.55
  const healthScore = health.state === 'healthy'
      ? 1
    : health.state === 'unknown'
      ? 0.5
      : allowDegradedFallback || allowLiveAuthenticatedDegraded ? 0.25 : 0
  const genxPremiumBoost = profile.id === 'premium' && provider.id === 'genx' ? 0.9 : 0
  const cheapCostBoost = profile.id === 'cheap' ? inverse(model.cost) * 0.35 : 0
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
    genxPremium: genxPremiumBoost,
    cheapCost: cheapCostBoost,
  }
  return {
    provider: provider.id,
    model,
    health,
    score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0),
    scoreBreakdown,
  }
}

export function rejectionForProviderModel(input: {
  provider: ProviderTruthDefinition
  model: DiscoveredModel
  capability: CapabilityDefinition
  health: ProviderHealthSnapshot
  profile: RoutingProfile
}): ProviderRouteRejection | null {
  const { provider, model, capability, health, profile } = input
  const allowDegradedFallback = provider.id === 'genx'
    && model.capabilityEvidence === 'provider_contract'
    && model.raw.source === 'genx_static_runtime_fallback'
  const allowLiveAuthenticatedDegraded = model.discoverySource === 'live_authenticated'
  const base = {
    provider: provider.id,
    modelId: model.id,
    capability: capability.id,
  }
  if (profile.preferences.providerPreference?.length && !profile.preferences.providerPreference.includes(provider.id)) {
    return { ...base, code: 'PROVIDER_NOT_PINNED', reason: 'Provider does not match the pinned provider preference.' }
  }
  if (profile.preferences.modelPreference?.length && !profile.preferences.modelPreference.includes(model.id)) {
    return { ...base, code: 'MODEL_NOT_PINNED', reason: 'Model does not match the pinned model preference.' }
  }
  if (model.status === 'unavailable') return { ...base, code: 'MODEL_UNAVAILABLE', reason: 'Model catalog marks this model unavailable.' }
  if (!model.capabilities.includes(capability.id)) return { ...base, code: 'CAPABILITY_UNSUPPORTED', reason: 'Model does not advertise or inherit the requested capability.' }
  if (model.metadata?.executable === 'REQUIRES_DEDICATED_ENDPOINT') return { ...base, code: 'DEDICATED_ENDPOINT_REQUIRED', reason: 'Model requires a dedicated provider endpoint before execution.' }
  if (model.metadata?.executable === 'CATALOG_ONLY') return { ...base, code: 'CATALOG_ONLY', reason: 'Model is catalog-only and must not be routed for live execution.' }
  if (model.metadata?.adultGate === true && profile.preferences.adult !== true) return { ...base, code: 'ADULT_GATE_REQUIRED', reason: 'Model requires an explicit adult policy/app gate.' }
  if (!health.configured) return { ...base, code: 'PROVIDER_NOT_CONFIGURED', reason: 'Provider credential is not configured or not visible to runtime.' }
  if (health.state === 'degraded' && !allowDegradedFallback && !allowLiveAuthenticatedDegraded) return { ...base, code: 'PROVIDER_DEGRADED', reason: 'Provider health is degraded and this model lacks live-authenticated fallback evidence.' }
  if (capability.requiresAdultPermission && profile.preferences.adult !== true) return { ...base, code: 'ADULT_GATE_REQUIRED', reason: 'Capability requires explicit adult policy/app permission.' }
  if (profile.preferences.streaming === true && model.streaming !== true && !provider.features.streaming) {
    return { ...base, code: 'STREAMING_UNSUPPORTED', reason: 'Profile requires streaming, but the model/provider does not advertise streaming support.' }
  }
  if (profile.preferences.artifactSupport === true && !model.artifactSupport) return { ...base, code: 'ARTIFACT_UNSUPPORTED', reason: 'Profile requires artifact support, but this model does not advertise durable output support.' }
  if (
    provider.billing.paidEnabledEnv
    && model.raw.free_quota_eligible === false
    && process.env[provider.billing.paidEnabledEnv]?.trim().toLowerCase() !== 'true'
  ) return { ...base, code: 'BILLING_DISABLED', reason: `Provider paid model execution requires ${provider.billing.paidEnabledEnv}=true.` }
  return null
}

function normalized(value: number | null): number {
  if (value === null) return 0.5
  if (value >= 0 && value <= 1) return value
  return Math.max(0, Math.min(1, value / 100))
}

function inverse(value: number | null): number {
  return value === null ? 0.5 : 1 - normalized(value)
}
