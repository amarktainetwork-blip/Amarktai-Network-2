import type {
  CapabilityDefinition,
  CapabilityId,
  DiscoveredModel,
  ProviderHealthSnapshot,
  ProviderId,
  ProviderTruthDefinition,
} from './provider-types'

export type ProviderCapabilityBlockerType =
  | 'missing_credential'
  | 'endpoint_required'
  | 'specialist_endpoint_required'
  | 'adapter_missing'
  | 'runtime_flag_disabled'
  | 'tool_plan_only'
  | 'policy_blocked'
  | 'unsupported'
  | 'model_unavailable'

export interface ProviderCapabilityContract {
  provider: ProviderId
  modelId: string
  capability: CapabilityId
  supportsCapability: boolean
  modelDiscovered: boolean
  modelMetadataConfidence: 'model_metadata' | 'provider_contract' | 'policy_gate' | 'unknown'
  endpointTypeRequired: 'none' | 'provider_endpoint' | 'dedicated_endpoint' | 'specialist_endpoint'
  adapterAvailable: boolean
  adapterContractName: `${ProviderId}_capability_adapter`
  accountKeyAvailable: boolean
  runtimeFlagState: 'enabled' | 'disabled' | 'not_applicable'
  runtimeExecutableNow: boolean
  requiresDedicatedEndpoint: boolean
  requiresSpecialistEndpoint: boolean
  requiresOpenSourceLocalTool: string[]
  requiresAppPolicyApproval: boolean
  requiresAdultToggle: boolean
  toolPlanOnly: boolean
  liveProven: boolean
  lastEvidence: string | null
  reason: string
  nextAction: string
  blockerType: ProviderCapabilityBlockerType | null
}

export function evaluateProviderCapabilityContract(input: {
  provider: ProviderTruthDefinition
  model: DiscoveredModel
  capability: CapabilityDefinition
  health: ProviderHealthSnapshot
}): ProviderCapabilityContract {
  const { provider, model, capability, health } = input
  const supportsCapability = provider.capabilities.includes(capability.id)
    && model.capabilities.includes(capability.id)
    && model.status !== 'unavailable'
  const adapterAvailable = model.metadata?.executable !== 'ADAPTER_MISSING'
  const requiresSpecialistEndpoint = provider.id === 'huggingface'
    && (
      model.metadata?.routeType === 'hf_specialist_endpoint'
      || ['rerank', 'image_edit', 'video', 'image_to_video', 'music', 'tts', 'stt', 'adult_video'].includes(capability.id)
    )
    && !hfSpecialistConfigured(capability.id)
  const requiresDedicatedEndpoint = model.metadata?.executable === 'REQUIRES_DEDICATED_ENDPOINT'
    || provider.id === 'together' && capability.id === 'rerank' && !process.env.TOGETHER_DEDICATED_ENDPOINTS_JSON?.trim()
  const togetherVideoBlocked = provider.id === 'together'
    && ['video', 'image_to_video', 'adult_video'].includes(capability.id)
    && process.env.TOGETHER_VIDEO_RUNTIME_ENABLED?.trim().toLowerCase() !== 'true'
  const toolPlanOnly = provider.id === 'mimo'
    && ['tts', 'stt', 'agents'].includes(capability.id)
    && process.env.MIMO_RUNTIME_API_ENABLED?.trim().toLowerCase() !== 'true'
  const policyBlocked = model.metadata?.adultGate === true || model.metadata?.executable === 'CATALOG_ONLY'
  const requiresAdultToggle = capability.requiresAdultPermission || model.metadata?.adultGate === true
  const localTools = localToolsFor(capability.id)
  const blocker = firstBlocker([
    model.status === 'unavailable' ? 'model_unavailable' : null,
    !supportsCapability ? 'unsupported' : null,
    !health.configured ? 'missing_credential' : null,
    !adapterAvailable ? 'adapter_missing' : null,
    requiresSpecialistEndpoint ? 'specialist_endpoint_required' : null,
    requiresDedicatedEndpoint ? 'endpoint_required' : null,
    togetherVideoBlocked ? 'runtime_flag_disabled' : null,
    toolPlanOnly ? 'tool_plan_only' : null,
    policyBlocked ? 'policy_blocked' : null,
  ])
  const runtimeExecutableNow = blocker === null
  const reason = reasonFor(blocker, provider.id, model.id, capability.id)
  return {
    provider: provider.id,
    modelId: model.id,
    capability: capability.id,
    supportsCapability,
    modelDiscovered: true,
    modelMetadataConfidence: model.capabilityEvidence,
    endpointTypeRequired: requiresSpecialistEndpoint
      ? 'specialist_endpoint'
      : requiresDedicatedEndpoint
        ? 'dedicated_endpoint'
        : 'none',
    adapterAvailable,
    adapterContractName: `${provider.id}_capability_adapter`,
    accountKeyAvailable: health.configured,
    runtimeFlagState: togetherVideoBlocked || toolPlanOnly ? 'disabled' : 'not_applicable',
    runtimeExecutableNow,
    requiresDedicatedEndpoint,
    requiresSpecialistEndpoint,
    requiresOpenSourceLocalTool: localTools,
    requiresAppPolicyApproval: policyBlocked,
    requiresAdultToggle,
    toolPlanOnly,
    liveProven: false,
    lastEvidence: null,
    reason,
    nextAction: nextActionFor(blocker, provider.id, capability.id),
    blockerType: blocker,
  }
}

export function buildProviderCapabilityContracts(input: {
  provider: ProviderTruthDefinition
  models: DiscoveredModel[]
  capabilities: readonly CapabilityDefinition[]
  health: ProviderHealthSnapshot
}): ProviderCapabilityContract[] {
  return input.models.flatMap((model) =>
    input.capabilities
      .filter((capability) => model.capabilities.includes(capability.id) || input.provider.capabilities.includes(capability.id))
      .map((capability) => evaluateProviderCapabilityContract({
        provider: input.provider,
        model,
        capability,
        health: input.health,
      })),
  )
}

function hfSpecialistConfigured(capability: CapabilityId): boolean {
  const specialistJson = process.env.HF_SPECIALIST_ENDPOINTS_JSON?.trim()
  if (specialistJson) return true
  const envByCapability: Partial<Record<CapabilityId, string[]>> = {
    rerank: ['HF_ENDPOINT_RERANK'],
    image_edit: ['HF_ENDPOINT_IMAGE_EDIT'],
    video: ['HF_ENDPOINT_TEXT_TO_VIDEO'],
    image_to_video: ['HF_ENDPOINT_IMAGE_TO_VIDEO'],
    music: ['HF_ENDPOINT_MUSIC_GENERATION'],
    tts: ['HF_ENDPOINT_TTS'],
    stt: ['HF_ENDPOINT_STT'],
    adult_video: ['HF_ENDPOINT_TEXT_TO_VIDEO'],
  }
  return (envByCapability[capability] ?? []).some((name) => Boolean(process.env[name]?.trim()))
}

function localToolsFor(capability: CapabilityId): string[] {
  if (['video', 'image_to_video', 'adult_video'].includes(capability)) return ['ffmpeg', 'ffprobe']
  return []
}

function firstBlocker(values: Array<ProviderCapabilityBlockerType | null>): ProviderCapabilityBlockerType | null {
  return values.find((value): value is ProviderCapabilityBlockerType => Boolean(value)) ?? null
}

function reasonFor(
  blocker: ProviderCapabilityBlockerType | null,
  provider: ProviderId,
  modelId: string,
  capability: CapabilityId,
): string {
  if (!blocker) return `${provider}/${modelId} is executable now for ${capability}.`
  const map: Record<ProviderCapabilityBlockerType, string> = {
    missing_credential: `${provider}/${modelId} has a route contract, but no credential is visible to runtime.`,
    endpoint_required: `${provider}/${modelId} is catalog-visible for ${capability}, but a dedicated provider endpoint/account contract is required.`,
    specialist_endpoint_required: `${provider}/${modelId} is catalog-visible for ${capability}, but a specialist endpoint is required.`,
    adapter_missing: `${provider}/${modelId} is visible, but no adapter contract can execute ${capability}.`,
    runtime_flag_disabled: `${provider}/${modelId} is blocked by a runtime flag for ${capability}.`,
    tool_plan_only: `${provider}/${modelId} is visible through a token/tool-plan surface, but backend runtime execution is not enabled.`,
    policy_blocked: `${provider}/${modelId} requires explicit policy approval before execution.`,
    unsupported: `${provider}/${modelId} does not have model metadata or provider-contract support for ${capability}.`,
    model_unavailable: `${provider}/${modelId} is marked unavailable in the provider catalog.`,
  }
  return map[blocker]
}

function nextActionFor(
  blocker: ProviderCapabilityBlockerType | null,
  provider: ProviderId,
  capability: CapabilityId,
): string {
  if (!blocker) return 'No action required; route can be attempted.'
  if (blocker === 'missing_credential') return `Configure ${provider} credential in integrationConfig/aiProvider/env.`
  if (blocker === 'specialist_endpoint_required') return `Configure the specialist endpoint env for ${provider}/${capability}.`
  if (blocker === 'endpoint_required') return `Configure the dedicated endpoint/account contract required for ${provider}/${capability}.`
  if (blocker === 'runtime_flag_disabled') {
    if (provider === 'together') return 'Together /videos returned HTTP 404 in VPS proof; set TOGETHER_VIDEO_RUNTIME_ENABLED=true only after endpoint proof succeeds.'
  }
  if (blocker === 'tool_plan_only') return 'Set MIMO_RUNTIME_API_ENABLED=true only after MiMo backend runtime API access is confirmed.'
  if (blocker === 'adapter_missing') return `Implement or enable the ${provider} adapter contract for ${capability}.`
  if (blocker === 'policy_blocked') return 'Enable the explicit app/provider policy gate before routing.'
  return `Select a provider/model that supports ${capability}, or add a truthful contract.`
}
