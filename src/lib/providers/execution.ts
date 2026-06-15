import { getCapability, resolveCanonicalCapability } from './capability-registry'
import { discoverProvider } from './provider-discovery'
import { getCanonicalProviderHealth } from './health'
import { planDynamicCapabilityRoute } from './registry'
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
}): Promise<CanonicalExecutionPlan> {
  const capability = resolveCanonicalCapability(input.capability)
  if (!capability || !getCapability(capability)) {
    return noRoute(input.capability, input.profile, 'Capability is not registered in provider truth.')
  }
  const plan = await planDynamicCapabilityRoute({
    capability,
    profile: input.profile,
    preferences: input.preferences,
  })
  const candidates = plan.candidates.map((candidate) => ({
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
    code: candidates.length ? 'ROUTE_FOUND' : 'NO_ROUTE_FOUND',
    reason: plan.reason,
  }
}

export async function getCanonicalProviderRuntimeTruth(provider: ProviderId) {
  const [discovery, health] = await Promise.all([
    discoverProvider(provider),
    getCanonicalProviderHealth(provider),
  ])
  return {
    provider,
    health,
    models: discovery.models,
    capabilities: [...new Set(discovery.models.flatMap((model) => model.capabilities))],
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
    code: 'NO_ROUTE_FOUND',
    reason,
  }
}
