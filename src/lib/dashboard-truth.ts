/**
 * Compatibility view for older dashboard consumers.
 *
 * Runtime readiness is owned by runtime-capability-truth.ts. This module only
 * reshapes that truth for the legacy /api/admin/truth response.
 */
import { getAppProfile } from '@/lib/app-profiles'
import {
  getProviderHealth,
  isProviderUsable,
  MODEL_REGISTRY,
  type ModelEntry,
} from '@/lib/model-registry'
import {
  getDashboardRuntimeTruth,
  type RuntimeReadinessState,
} from '@/lib/runtime-capability-truth'

export type ProviderState = RuntimeReadinessState
export type CapabilityState = RuntimeReadinessState
export type ImplementationState = RuntimeReadinessState

export interface ProviderTruth {
  providerKey: string
  displayName: string
  state: ProviderState
  isActive: boolean
  launchRequired: boolean
  healthStatus: string
  healthMessage: string
  lastCheckedAt: string | null
  modelCount: number
  supportedCapabilities: string[]
}

export interface CapabilityTruth {
  capability: string
  displayName: string
  category: string
  state: CapabilityState
  implementationState: ImplementationState
  routeExists: boolean
  hasCapableModel: boolean
  hasActiveProvider: boolean
  blockedBySettings: boolean
  reason: string
}

export interface ModelTruth {
  provider: string
  modelId: string
  displayName: string
  category: string
  isUsableNow: boolean
  providerState: ProviderState
  costTier: string
  latencyTier: string
  capabilities: string[]
}

export const CAP_TO_MODEL_FLAG: Record<string, keyof ModelEntry> = {
  general_chat: 'supports_chat',
  deep_reasoning: 'supports_reasoning',
  coding: 'supports_code',
  image_generation: 'supports_image_generation',
  image_editing: 'supports_image_generation',
  voice_stt: 'supports_stt',
  voice_tts: 'supports_tts',
  realtime_voice: 'supports_voice_interaction',
  embeddings: 'supports_embeddings',
  reranking: 'supports_reranking',
  video_planning: 'supports_video_planning',
  video_generation: 'supports_video_generation',
  multimodal_vision: 'supports_vision',
  agent_planning: 'supports_agent_planning',
  multilingual: 'supports_multilingual',
  structured_output: 'supports_structured_output',
  tool_use: 'supports_tool_use',
  moderation: 'supports_moderation',
  music_generation: 'supports_music_generation',
  adult_text: 'supports_chat',
  adult_image: 'supports_image_generation',
  adult_video: 'supports_video_generation',
  adult_voice: 'supports_tts',
}

export async function getProviderTruth(): Promise<ProviderTruth[]> {
  const runtime = await getDashboardRuntimeTruth()
  return runtime.providers
    .filter((provider) => provider.capabilities?.some((capability) => ['text', 'image', 'video', 'audio', 'tts', 'stt'].includes(capability)))
    .map((provider) => ({
      providerKey: provider.key,
      displayName: provider.displayName,
      state: provider.status,
      isActive: provider.status === 'READY',
      launchRequired: provider.key === 'genx',
      healthStatus: getProviderHealth(provider.key),
      healthMessage: provider.reason,
      lastCheckedAt: null,
      modelCount: MODEL_REGISTRY.filter((model) => model.provider === provider.key).length,
      supportedCapabilities: provider.capabilities ?? [],
    }))
}

export async function getCapabilityTruth(appSlug?: string): Promise<CapabilityTruth[]> {
  const runtime = await getDashboardRuntimeTruth()
  const profile = appSlug ? getAppProfile(appSlug) : null
  const appAdultEnabled = profile?.adult_mode === true
  const standard = runtime.capabilities.map((capability) => ({
    capability: capabilityId(capability.name),
    displayName: capability.name,
    category: capabilityId(capability.name).split('_')[0],
    state: capability.status,
    implementationState: capability.status,
    routeExists: true,
    hasCapableModel: capability.models.length > 0,
    hasActiveProvider: capability.status === 'READY',
    blockedBySettings: false,
    reason: capability.blocker ?? `Ready through ${capability.models.join(', ')}.`,
  }))
  const adultCapabilities = ['adult_text', 'adult_image', 'adult_video', 'adult_voice'].map((capability) => {
    const policyAllowed = runtime.adultGate.enabled && appAdultEnabled
    return {
      capability,
      displayName: capability.replace('_', ' '),
      category: 'adult',
      state: policyAllowed ? 'READY' as const : 'BLOCKED' as const,
      implementationState: policyAllowed ? 'READY' as const : 'BLOCKED' as const,
      routeExists: true,
      hasCapableModel: runtime.adultGate.providerAvailable,
      hasActiveProvider: runtime.adultGate.providerAvailable,
      blockedBySettings: !policyAllowed,
      reason: policyAllowed
        ? 'Adult route is enabled by global operator opt-in and app policy.'
        : 'Adult mode requires both global operator opt-in and app-level adult_mode=true.',
    }
  })
  return [...standard, ...adultCapabilities]
}

export function getModelTruth(): ModelTruth[] {
  return MODEL_REGISTRY.map((model) => ({
    provider: model.provider,
    modelId: model.model_id,
    displayName: model.model_name,
    category: model.category,
    isUsableNow: model.enabled && isProviderUsable(model.provider),
    providerState: isProviderUsable(model.provider) ? 'READY' : 'NEEDS_CONFIGURATION',
    costTier: model.cost_tier,
    latencyTier: model.latency_tier,
    capabilities: Object.entries(CAP_TO_MODEL_FLAG)
      .filter(([, flag]) => model[flag] === true)
      .map(([capability]) => capability),
  }))
}

export async function getDashboardSummary() {
  const [providers, capabilities] = await Promise.all([getProviderTruth(), getCapabilityTruth()])
  const models = getModelTruth()
  const activeProviders = providers.filter((provider) => provider.state === 'READY').length
  const availableCapabilities = capabilities.filter((capability) => capability.state === 'READY').length
  const blockers = capabilities.filter((capability) => capability.state === 'BLOCKED' || capability.state === 'NEEDS_CONFIGURATION').length
  const usableModels = models.filter((model) => model.isUsableNow).length
  return {
    totalProviders: providers.length,
    activeProviders,
    configuredProviders: providers.filter((provider) => provider.state !== 'NEEDS_CONFIGURATION').length,
    totalModels: models.length,
    usableModels,
    totalCapabilities: capabilities.length,
    availableCapabilities,
    blockedCapabilities: blockers,
    unavailableCapabilities: capabilities.filter((capability) => capability.state === 'UNAVAILABLE').length,
    notImplemented: 0,
    systemHealth: providers.length && capabilities.length
      ? Math.round(((activeProviders / providers.length) + (availableCapabilities / capabilities.length)) * 50)
      : 0,
  }
}

function capabilityId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
