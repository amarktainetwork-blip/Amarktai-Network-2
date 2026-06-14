/**
 * Compatibility adapter.
 *
 * Removal target: callers should migrate to universal-model-catalog.ts.
 * This module contains no model declarations; every entry is derived from
 * UNIVERSAL_MODEL_ROUTES.
 */
import {
  UNIVERSAL_MODEL_ROUTES,
  type UniversalCapabilityGroup,
  type UniversalModelRoute,
} from '@/lib/universal-model-catalog'

export type ProviderTier = 'premium' | 'backbone' | 'retrieval' | 'multimodal'
export type CostTier = 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium'
export type LatencyTier = 'ultra_low' | 'low' | 'medium' | 'high'
export type ModelRole =
  | 'reasoning'
  | 'chat'
  | 'coding'
  | 'embeddings'
  | 'reranking'
  | 'creative'
  | 'validation'
  | 'agent_planning'
  | 'multilingual'
  | 'vision'
  | 'image_generation'
  | 'video_generation'
  | 'tts'
  | 'voice_interaction'
  | 'moderation'

export type ModelCategory = 'text' | 'image' | 'video' | 'voice' | 'code' | 'multimodal' | 'music' | 'moderation' | 'embeddings'

export interface ModelEntry {
  provider: string
  provider_tier: ProviderTier
  model_id: string
  model_name: string
  family: string
  primary_role: ModelRole
  secondary_roles: ModelRole[]
  supports_chat: boolean
  supports_reasoning: boolean
  supports_code: boolean
  supports_tool_use: boolean
  supports_multilingual: boolean
  supports_structured_output: boolean
  supports_embeddings: boolean
  supports_reranking: boolean
  supports_vision: boolean
  supports_image_generation: boolean
  supports_video_planning: boolean
  supports_video_generation?: boolean
  supports_stt?: boolean
  supports_tts?: boolean
  supports_voice_interaction?: boolean
  supports_moderation?: boolean
  supports_agent_planning: boolean
  supports_music_generation?: boolean
  context_window: number
  latency_tier: LatencyTier
  cost_tier: CostTier
  enabled: boolean
  health_status: 'healthy' | 'configured' | 'degraded' | 'error' | 'unconfigured' | 'disabled'
  fallback_priority: number
  validator_eligible: boolean
  specialist_domains: string[]
  category: ModelCategory
}

export const MODEL_REGISTRY: readonly ModelEntry[] = UNIVERSAL_MODEL_ROUTES.map(toLegacyModel)

function toLegacyModel(model: UniversalModelRoute, index: number): ModelEntry {
  const groups = new Set(model.capabilities)
  const roles = modelRoles(model.capabilities)
  const primaryRole = roles[0] ?? 'chat'
  return {
    provider: model.provider,
    provider_tier: providerTier(model),
    model_id: model.modelId,
    model_name: model.displayName,
    family: model.family,
    primary_role: primaryRole,
    secondary_roles: roles.slice(1),
    supports_chat: groups.has('chat'),
    supports_reasoning: groups.has('reasoning'),
    supports_code: groups.has('coding'),
    supports_tool_use: model.providerCapabilities.includes('tools'),
    supports_multilingual: groups.has('chat'),
    supports_structured_output: groups.has('chat') || groups.has('coding'),
    supports_embeddings: groups.has('embeddings/moderation'),
    supports_reranking: model.providerCapabilities.includes('rerank'),
    supports_vision: groups.has('image') && !model.providerCapabilities.includes('image'),
    supports_image_generation: model.providerCapabilities.includes('image'),
    supports_video_planning: groups.has('video') && groups.has('reasoning'),
    supports_video_generation: model.providerCapabilities.includes('video'),
    supports_stt: groups.has('STT'),
    supports_tts: groups.has('voice/TTS'),
    supports_voice_interaction: groups.has('STT') && groups.has('voice/TTS'),
    supports_moderation: groups.has('embeddings/moderation'),
    supports_agent_planning: groups.has('reasoning') && (groups.has('coding') || groups.has('chat')),
    supports_music_generation: groups.has('music/audio'),
    context_window: model.contextWindow,
    latency_tier: model.latencyTier,
    cost_tier: model.costTier === 'unknown' ? 'medium' : model.costTier,
    enabled: model.enabled,
    health_status: 'unconfigured',
    fallback_priority: index + 1,
    validator_eligible: groups.has('reasoning'),
    specialist_domains: specialistDomains(model),
    category: category(model),
  }
}

function modelRoles(capabilities: UniversalCapabilityGroup[]): ModelRole[] {
  const roles = new Set<ModelRole>()
  if (capabilities.includes('reasoning')) roles.add('reasoning')
  if (capabilities.includes('chat')) roles.add('chat')
  if (capabilities.includes('coding')) roles.add('coding')
  if (capabilities.includes('image')) roles.add('vision')
  if (capabilities.includes('video')) roles.add('video_generation')
  if (capabilities.includes('voice/TTS')) roles.add('tts')
  if (capabilities.includes('embeddings/moderation')) roles.add('embeddings')
  if (capabilities.includes('music/audio')) roles.add('creative')
  return [...roles]
}

function providerTier(model: UniversalModelRoute): ProviderTier {
  if (model.provider === 'genx') return 'premium'
  if (model.capabilities.some((value) => ['image', 'video', 'music/audio'].includes(value))) return 'multimodal'
  if (model.capabilities.includes('embeddings/moderation')) return 'retrieval'
  return 'backbone'
}

function specialistDomains(model: UniversalModelRoute): string[] {
  const domains = new Set(model.capabilities.map((value) => value.replace('/', '_').toLowerCase()))
  if (model.recommendedFor?.includes('repo_workbench')) domains.add('coding')
  if (model.supportsAdult) domains.add('adult')
  return [...domains]
}

function category(model: UniversalModelRoute): ModelCategory {
  if (model.capabilities.includes('music/audio')) return 'music'
  if (model.capabilities.includes('voice/TTS') || model.capabilities.includes('STT')) return 'voice'
  if (model.capabilities.includes('video')) return 'video'
  if (model.capabilities.includes('image')) return 'image'
  if (model.capabilities.includes('embeddings/moderation')) return 'embeddings'
  if (model.capabilities.includes('coding') && !model.capabilities.includes('chat')) return 'code'
  return 'text'
}

type BooleanCapabilityKey = {
  [K in keyof ModelEntry]-?: NonNullable<ModelEntry[K]> extends boolean ? K : never
}[keyof ModelEntry]

export type ProviderHealthStatus = ModelEntry['health_status']

interface ProviderHealthEntry {
  status: ProviderHealthStatus
  lastChecked: Date
}

const providerHealthCache = new Map<string, ProviderHealthEntry>()

export function setProviderHealth(providerKey: string, status: ProviderHealthStatus): void {
  providerHealthCache.set(providerKey, { status, lastChecked: new Date() })
}

export function getProviderHealth(providerKey: string): ProviderHealthStatus {
  return providerHealthCache.get(providerKey)?.status ?? 'unconfigured'
}

export function getProviderHealthSnapshot(): ReadonlyMap<string, Readonly<ProviderHealthEntry>> {
  return providerHealthCache
}

export function clearProviderHealthCache(): void {
  providerHealthCache.clear()
}

export function isProviderUsable(providerKey: string): boolean {
  const status = getProviderHealth(providerKey)
  return status === 'healthy' || status === 'configured'
}

export function isProviderDegraded(providerKey: string): boolean {
  return getProviderHealth(providerKey) === 'degraded'
}

export function getModelEffectiveHealth(model: ModelEntry): ProviderHealthStatus {
  return getProviderHealth(model.provider)
}

export function getUsableModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.enabled && isProviderUsable(model.provider))
}

export function getModelRegistry(): readonly ModelEntry[] {
  return MODEL_REGISTRY
}

export function getModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.provider === provider)
}

export function getModelsByCapability(capability: BooleanCapabilityKey): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model[capability] === true)
}

export function getModelsByRole(role: ModelRole): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.primary_role === role || model.secondary_roles.includes(role))
}

export function getModelById(provider: string, modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((model) => model.provider === provider && model.model_id === modelId)
}

export function getEnabledModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.enabled)
}

export function getValidatorEligibleModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.enabled && model.validator_eligible)
}

export function getModelsForDomain(domain: string): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.enabled && model.specialist_domains.includes(domain))
}

export function getModelsByCategory(modelCategory: ModelCategory): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.category === modelCategory)
}

export function getCategorySummary(): Record<ModelCategory, number> {
  const categories: ModelCategory[] = ['text', 'image', 'video', 'voice', 'code', 'multimodal', 'music', 'moderation', 'embeddings']
  return Object.fromEntries(categories.map((value) => [value, getModelsByCategory(value).length])) as Record<ModelCategory, number>
}

const COST_ORDER: Record<CostTier, number> = {
  free: 0,
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  premium: 5,
}

export function getCheapestModelForCapability(capability: BooleanCapabilityKey): ModelEntry | undefined {
  return getModelsByCapability(capability)
    .filter((model) => model.enabled)
    .sort((a, b) => COST_ORDER[a.cost_tier] - COST_ORDER[b.cost_tier] || a.fallback_priority - b.fallback_priority)[0]
}

export function getPremiumModelForCapability(capability: BooleanCapabilityKey): ModelEntry | undefined {
  return getModelsByCapability(capability)
    .filter((model) => model.enabled)
    .sort((a, b) => COST_ORDER[b.cost_tier] - COST_ORDER[a.cost_tier] || a.fallback_priority - b.fallback_priority)[0]
}

export function getDefaultModelForProvider(providerKey: string): string {
  const models = UNIVERSAL_MODEL_ROUTES.filter((model) => model.provider === providerKey)
  const recommended = models.find((model) => model.recommendedFor?.includes('assistant'))
    ?? models.find((model) => model.recommendedFor?.includes('repo_workbench'))
    ?? models[0]
  if (!recommended) {
    throw new Error(`No default model configured for approved provider "${providerKey}".`)
  }
  return recommended.modelId
}
