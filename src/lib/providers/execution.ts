import { getCapability, resolveCanonicalCapability } from './capability-registry'
import { discoverProvider } from './provider-discovery'
import { getCanonicalProviderHealth } from './health'
import { modelsForCapability } from './model-discovery'
import { planDynamicCapabilityRoute } from './registry'
import { PROVIDER_TRUTH } from './provider-truth'
import type {
  CanonicalExecutionPlan,
  ProviderId,
  RoutingPreferences,
  RoutingProfileId,
} from './provider-types'

export async function planCanonicalExecution(input: {
  capability: string
  profile?: RoutingProfileId
  preferences?: RoutingPreferences
  fallbackAllowed?: boolean
}): Promise<CanonicalExecutionPlan> {
  const capability = resolveCanonicalCapability(input.capability)
  if (!capability || !getCapability(capability)) {
    return noRoute(input.capability, input.profile, 'Capability is not registered in provider truth.')
  }
  const plan = await planDynamicCapabilityRoute({
    capability,
    profile: input.profile,
    preferences: input.preferences,
    fallbackAllowed: input.fallbackAllowed,
  })
  const candidates = plan.candidates.map((candidate) => ({
    provider: candidate.provider,
    model: candidate.model,
    score: candidate.score,
    scoreBreakdown: candidate.scoreBreakdown,
    health: candidate.health,
    adapter: `${candidate.provider}_capability_adapter` as const,
  }))
  const fallbackChain = plan.fallbackChain.map((candidate) => ({
    provider: candidate.provider,
    model: candidate.model,
    score: candidate.score,
    scoreBreakdown: candidate.scoreBreakdown,
    health: candidate.health,
    adapter: `${candidate.provider}_capability_adapter` as const,
  }))
  return {
    capability,
    profile: plan.profile,
    selected: candidates[0] ?? null,
    candidates,
    fallbackChain,
    rejectedCandidates: plan.rejectedCandidates,
    code: candidates.length ? 'ROUTE_FOUND' : 'NO_ROUTE_FOUND',
    reason: plan.reason,
  }
}

export async function getCanonicalProviderRuntimeTruth(provider: ProviderId) {
  const [discovery, health] = await Promise.all([
    discoverProvider(provider),
    getCanonicalProviderHealth(provider),
  ])
  const providerTruth = PROVIDER_TRUTH.find((entry) => entry.id === provider)!
  const routes = providerTruth.capabilities.map((capability) => {
    const models = modelsForCapability(discovery, capability)
    return {
      capability,
      models: models.map((model) => model.id),
      evidence: [...new Set(models.map((model) => model.capabilityEvidence))],
      executable: health.configured && models.length > 0,
    }
  })
  return {
    provider,
    health,
    discoveryStatus: discovery.status,
    models: discovery.models,
    declaredCapabilities: [...providerTruth.capabilities],
    capabilities: routes.filter((route) => route.executable).map((route) => route.capability),
    routes,
    streaming: discovery.models.some((model) => model.streaming === true),
    asyncJobs: discovery.models.some((model) => model.raw.async === true || model.raw.async_jobs === true),
    artifacts: discovery.models.some((model) => model.artifactSupport),
    adultCompatibility: discovery.models
      .filter((model) => model.adult === true)
      .flatMap((model) => model.capabilities),
    pricingMetadata: discovery.models.map((model) => ({
      model: model.id,
      cost: model.cost,
      source: model.cost === null ? 'not_published' : 'provider_catalog',
    })),
    privateEndpoints: discovery.privateEndpoints,
    dedicatedEndpoints: discovery.dedicatedEndpoints,
    discoveredAt: discovery.discoveredAt,
    error: discovery.error,
  }
}

function noRoute(
  capability: string,
  profile: RoutingProfileId | undefined,
  reason: string,
): CanonicalExecutionPlan {
  return {
    capability: resolveCanonicalCapability(capability) ?? 'chat',
    profile: profile ?? 'balanced',
    selected: null,
    candidates: [],
    fallbackChain: [],
    rejectedCandidates: [],
    code: 'NO_ROUTE_FOUND',
    reason,
  }
}
