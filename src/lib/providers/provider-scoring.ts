import type {
  CapabilityDefinition,
  DiscoveredModel,
  ProviderHealthSnapshot,
  ProviderRouteRejection,
  ProviderRouteCandidate,
  ProviderTruthDefinition,
  RoutingProfile,
} from './provider-types'
import { evaluateProviderCapabilityContract } from './provider-capability-contracts'

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
  const contract = evaluateProviderCapabilityContract({ provider, model, capability, health })
  if (!contract.runtimeExecutableNow) {
    if (contract.blockerType === 'missing_credential') return { ...base, code: 'PROVIDER_NOT_CONFIGURED', reason: contract.reason }
    if (contract.blockerType === 'adapter_missing') return { ...base, code: 'ADAPTER_MISSING', reason: contract.reason }
    if (contract.blockerType === 'specialist_endpoint_required' || contract.blockerType === 'endpoint_required') {
      return { ...base, code: 'DEDICATED_ENDPOINT_REQUIRED', reason: `${contract.reason} Next action: ${contract.nextAction}` }
    }
    if (contract.blockerType === 'runtime_flag_disabled') {
      return {
        ...base,
        code: provider.id === 'together' && ['video', 'image_to_video', 'adult_video'].includes(capability.id)
          ? 'DEDICATED_ENDPOINT_REQUIRED'
          : 'RUNTIME_FLAG_DISABLED',
        reason: `${contract.reason} Next action: ${contract.nextAction}`,
      }
    }
    if (contract.blockerType === 'tool_plan_only') return { ...base, code: 'TOOL_PLAN_ONLY', reason: `${contract.reason} Next action: ${contract.nextAction}` }
    if (contract.blockerType === 'policy_blocked') return { ...base, code: 'POLICY_BLOCKED', reason: `${contract.reason} Next action: ${contract.nextAction}` }
  }
  if (requiresTogetherVideoRuntimeProof(provider.id, capability.id)) {
    return {
      ...base,
      code: 'DEDICATED_ENDPOINT_REQUIRED',
      reason: 'Together video models are visible in catalog, but /videos returned HTTP 404 in VPS proof; set TOGETHER_VIDEO_RUNTIME_ENABLED=true only after endpoint proof.',
    }
  }
  if (requiresRerankEndpoint(provider.id, capability.id)) {
    return {
      ...base,
      code: 'DEDICATED_ENDPOINT_REQUIRED',
      reason: provider.id === 'together'
        ? 'Together rerank models are catalog-visible, but rerank execution requires a dedicated endpoint/account contract before routing.'
        : 'Hugging Face rerank models are catalog-visible, but rerank execution requires a specialist endpoint before routing.',
    }
  }
  if (model.metadata?.executable === 'REQUIRES_DEDICATED_ENDPOINT') return { ...base, code: 'DEDICATED_ENDPOINT_REQUIRED', reason: 'Model requires a dedicated provider endpoint before execution.' }
  if (model.metadata?.executable === 'CATALOG_ONLY') return { ...base, code: 'CATALOG_ONLY', reason: 'Model is catalog-only and must not be routed for live execution.' }
  if (model.metadata?.executable === 'ADAPTER_MISSING') return { ...base, code: 'ADAPTER_MISSING', reason: 'Model is visible in the provider catalog, but no canonical adapter is wired for this capability.' }
  if (
    profile.preferences.durationSeconds
    && model.metadata?.providerLimitSeconds
    && profile.preferences.durationSeconds > model.metadata.providerLimitSeconds
  ) {
    return {
      ...base,
      code: 'DURATION_LIMITED',
      reason: `Requested duration ${profile.preferences.durationSeconds}s exceeds provider/model limit ${model.metadata.providerLimitSeconds}s.`,
    }
  }
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

function requiresTogetherVideoRuntimeProof(provider: string, capability: string) {
  return provider === 'together'
    && ['video', 'image_to_video', 'adult_video'].includes(capability)
    && process.env.TOGETHER_VIDEO_RUNTIME_ENABLED?.trim().toLowerCase() !== 'true'
}

function requiresRerankEndpoint(provider: string, capability: string) {
  if (capability !== 'rerank') return false
  if (provider === 'together') {
    return !process.env.TOGETHER_DEDICATED_ENDPOINTS_JSON?.trim()
  }
  if (provider === 'huggingface') {
    return !process.env.HF_ENDPOINT_RERANK?.trim()
      && !process.env.HF_SPECIALIST_ENDPOINTS_JSON?.trim()
  }
  return false
}

function normalized(value: number | null): number {
  if (value === null) return 0.5
  if (value >= 0 && value <= 1) return value
  return Math.max(0, Math.min(1, value / 100))
}

function inverse(value: number | null): number {
  return value === null ? 0.5 : 1 - normalized(value)
}
