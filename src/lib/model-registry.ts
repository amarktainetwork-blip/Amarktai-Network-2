/**
 * @module model-registry
 *
 * Compatibility adapter only.
 *
 * The old 6k-line legacy model registry has been retired because it duplicated
 * provider/model truth and kept stale providers alive. Runtime truth now comes
 * from:
 *
 * - ai-model-catalog.ts
 * - provider-capability-governance.ts
 * - media-capability-registry.ts
 * - provider-mesh.ts
 * - runtime-capability-truth.ts
 *
 * This file remains only because older runtime modules still import its public
 * contract. Do not add new provider/model source-of-truth logic here.
 */

import { STATIC_PROVIDER_MODELS, type ProviderModelOption } from '@/lib/ai-model-catalog'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { getProviderMeshNode } from '@/lib/provider-mesh'

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

export type ModelCategory =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'code'
  | 'multimodal'
  | 'music'
  | 'moderation'
  | 'embeddings'

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

export type ProviderHealthStatus = ModelEntry['health_status']

interface ProviderHealthEntry {
  status: ProviderHealthStatus
  lastChecked: Date
}

const providerHealthCache = new Map<string, ProviderHealthEntry>()

const COST_NORMALIZE: Record<string, CostTier> = {
  free: 'free',
  very_low: 'very_low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  premium: 'premium',
  unknown: 'medium',
}

const PROVIDER_TIER: Record<string, ProviderTier> = {
  genx: 'premium',
  huggingface: 'backbone',
  qwen: 'backbone',
  mimo: 'backbone',
  groq: 'backbone',
  together: 'backbone',
  minimax: 'backbone',
  deepseek: 'backbone',
  gemini: 'multimodal',
  replicate: 'multimodal',
  elevenlabs: 'backbone',
  deepgram: 'backbone',
  openrouter: 'backbone',
  xai: 'premium',
  firecrawl: 'retrieval',
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function normalizeCostTier(value: string | undefined): CostTier {
  return COST_NORMALIZE[value || 'medium'] ?? 'medium'
}

function categoryFrom(option: ProviderModelOption): ModelCategory {
  if (option.modalities.includes('image')) return 'image'
  if (option.modalities.includes('video')) return 'video'
  if (option.modalities.includes('voice_tts') || option.modalities.includes('voice_stt')) return 'voice'
  if (option.modalities.includes('music')) return 'music'
  if (option.modalities.includes('embedding')) return 'embeddings'
  if (option.modalities.includes('rerank')) return 'embeddings'
  if (option.modalities.includes('multimodal')) return 'multimodal'
  if (option.roles.includes('coding')) return 'code'
  return 'text'
}

function primaryRoleFrom(option: ProviderModelOption): ModelRole {
  if (option.roles[0]) return option.roles[0]
  if (option.modalities.includes('image')) return 'image_generation'
  if (option.modalities.includes('video')) return 'video_generation'
  if (option.modalities.includes('voice_tts')) return 'tts'
  if (option.modalities.includes('voice_stt')) return 'voice_interaction'
  if (option.modalities.includes('embedding')) return 'embeddings'
  if (option.modalities.includes('rerank')) return 'reranking'
  return 'chat'
}

function modelFromProviderOption(option: ProviderModelOption, fallbackPriority: number): ModelEntry {
  const roles = unique(option.roles)
  const modalities = unique(option.modalities)
  const primary = primaryRoleFrom(option)
  const category = categoryFrom(option)

  return {
    provider: option.provider,
    provider_tier: PROVIDER_TIER[option.provider] ?? 'backbone',
    model_id: option.modelId,
    model_name: option.displayName,
    family: option.family,
    primary_role: primary,
    secondary_roles: unique(roles.filter((role) => role !== primary)),

    supports_chat: modalities.includes('text') || modalities.includes('multimodal') || roles.includes('chat'),
    supports_reasoning: roles.includes('reasoning'),
    supports_code: roles.includes('coding'),
    supports_tool_use: roles.includes('agent_planning'),
    supports_multilingual: ['qwen', 'mimo', 'huggingface', 'genx'].includes(option.provider),
    supports_structured_output: modalities.includes('text') || modalities.includes('multimodal'),
    supports_embeddings: modalities.includes('embedding'),
    supports_reranking: modalities.includes('rerank'),
    supports_vision: modalities.includes('image') || modalities.includes('video') || modalities.includes('multimodal') || roles.includes('vision'),
    supports_image_generation: modalities.includes('image'),
    supports_video_planning: roles.includes('vision') && !modalities.includes('video'),
    supports_video_generation: modalities.includes('video'),
    supports_stt: modalities.includes('voice_stt'),
    supports_tts: modalities.includes('voice_tts'),
    supports_voice_interaction: modalities.includes('voice_tts') && modalities.includes('voice_stt'),
    supports_moderation: roles.includes('moderation'),
    supports_agent_planning: roles.includes('agent_planning'),
    supports_music_generation: modalities.includes('music'),

    context_window: option.contextWindow ?? 32_000,
    latency_tier: option.provider === 'groq' ? 'ultra_low' : option.provider === 'huggingface' ? 'medium' : 'low',
    cost_tier: normalizeCostTier(option.costTier),
    enabled: option.enabled,
    health_status: 'unconfigured',
    fallback_priority: fallbackPriority,
    validator_eligible: roles.includes('reasoning') || roles.includes('coding'),
    specialist_domains: unique([
      ...roles,
      ...modalities,
      category,
      ...(option.notes ? [option.notes.toLowerCase()] : []),
    ]),
    category,
  }
}

function modelFromMediaRoute(route: typeof MEDIA_CAPABILITY_ROUTES[keyof typeof MEDIA_CAPABILITY_ROUTES], provider: typeof MEDIA_CAPABILITY_ROUTES[keyof typeof MEDIA_CAPABILITY_ROUTES]['providers'][number], index: number): ModelEntry {
  const capability = route.capability
  const node = getProviderMeshNode(provider.provider)
  const category: ModelCategory =
    capability.includes('image') ? 'image'
      : capability.includes('video') ? 'video'
        : capability.includes('voice') || capability === 'tts' || capability === 'stt' ? 'voice'
          : capability.includes('music') || capability.includes('song') ? 'music'
            : 'text'

  const primaryRole: ModelRole =
    category === 'image' ? 'image_generation'
      : category === 'video' ? 'video_generation'
        : category === 'voice' ? 'tts'
          : 'chat'

  return {
    provider: provider.provider,
    provider_tier: PROVIDER_TIER[provider.provider] ?? 'backbone',
    model_id: provider.model,
    model_name: provider.model,
    family: node?.displayName ?? provider.provider,
    primary_role: primaryRole,
    secondary_roles: category === 'voice' ? ['voice_interaction'] : [],

    supports_chat: capability === 'adult_text',
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: capability === 'adult_text',
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: category === 'image' || category === 'video',
    supports_image_generation: category === 'image',
    supports_video_planning: false,
    supports_video_generation: category === 'video',
    supports_stt: capability === 'stt',
    supports_tts: category === 'voice' || capability === 'tts',
    supports_voice_interaction: category === 'voice',
    supports_moderation: false,
    supports_agent_planning: false,
    supports_music_generation: category === 'music',

    context_window: 16_000,
    latency_tier: 'medium',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 20 + index,
    validator_eligible: false,
    specialist_domains: [capability, category],
    category,
  }
}

function buildRegistry(): ModelEntry[] {
  const rows: ModelEntry[] = []

  Object.values(STATIC_PROVIDER_MODELS).forEach((models) => {
    models.forEach((model, index) => rows.push(modelFromProviderOption(model, index + 1)))
  })

  Object.values(MEDIA_CAPABILITY_ROUTES).forEach((route) => {
    route.providers.forEach((provider, index) => rows.push(modelFromMediaRoute(route, provider, index)))
  })

  const merged = new Map<string, ModelEntry>()
  for (const row of rows) {
    const key = `${row.provider}:${row.model_id}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, row)
      continue
    }

    merged.set(key, {
      ...existing,
      secondary_roles: unique([...existing.secondary_roles, row.primary_role, ...row.secondary_roles]),
      supports_chat: existing.supports_chat || row.supports_chat,
      supports_reasoning: existing.supports_reasoning || row.supports_reasoning,
      supports_code: existing.supports_code || row.supports_code,
      supports_tool_use: existing.supports_tool_use || row.supports_tool_use,
      supports_multilingual: existing.supports_multilingual || row.supports_multilingual,
      supports_structured_output: existing.supports_structured_output || row.supports_structured_output,
      supports_embeddings: existing.supports_embeddings || row.supports_embeddings,
      supports_reranking: existing.supports_reranking || row.supports_reranking,
      supports_vision: existing.supports_vision || row.supports_vision,
      supports_image_generation: existing.supports_image_generation || row.supports_image_generation,
      supports_video_planning: existing.supports_video_planning || row.supports_video_planning,
      supports_video_generation: existing.supports_video_generation || row.supports_video_generation,
      supports_stt: existing.supports_stt || row.supports_stt,
      supports_tts: existing.supports_tts || row.supports_tts,
      supports_voice_interaction: existing.supports_voice_interaction || row.supports_voice_interaction,
      supports_moderation: existing.supports_moderation || row.supports_moderation,
      supports_agent_planning: existing.supports_agent_planning || row.supports_agent_planning,
      supports_music_generation: existing.supports_music_generation || row.supports_music_generation,
      specialist_domains: unique([...existing.specialist_domains, ...row.specialist_domains]),
    })
  }

  return [...merged.values()].sort((a, b) => a.provider.localeCompare(b.provider) || a.fallback_priority - b.fallback_priority)
}

export const MODEL_REGISTRY: readonly ModelEntry[] = buildRegistry()

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
  const snapshotHasEntries = providerHealthCache.size > 0
  if (!snapshotHasEntries) return false
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

type BooleanCapabilityKey = Exclude<{
  [K in keyof ModelEntry]: ModelEntry[K] extends boolean | undefined ? K : never
}[keyof ModelEntry], undefined>

export function getModelsByCapability(capability: BooleanCapabilityKey): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => Boolean(model[capability]))
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
  const needle = domain.toLowerCase()
  return MODEL_REGISTRY.filter((model) =>
    model.specialist_domains.some((entry) => entry.toLowerCase().includes(needle)),
  )
}

export function getModelsByCategory(category: ModelCategory): ModelEntry[] {
  return MODEL_REGISTRY.filter((model) => model.category === category)
}

export function getCategorySummary(): Record<ModelCategory, number> {
  const categories: ModelCategory[] = ['text', 'image', 'video', 'voice', 'code', 'multimodal', 'music', 'moderation', 'embeddings']
  return Object.fromEntries(categories.map((category) => [category, getModelsByCategory(category).length])) as Record<ModelCategory, number>
}

export function getCheapestModelForCapability(capability: BooleanCapabilityKey): ModelEntry | undefined {
  const order: Record<CostTier, number> = { free: 0, very_low: 1, low: 2, medium: 3, high: 4, premium: 5 }
  return [...getModelsByCapability(capability)]
    .filter((model) => model.enabled)
    .sort((a, b) => order[a.cost_tier] - order[b.cost_tier])[0]
}

export function getPremiumModelForCapability(capability: BooleanCapabilityKey): ModelEntry | undefined {
  const order: Record<CostTier, number> = { free: 0, very_low: 1, low: 2, medium: 3, high: 4, premium: 5 }
  return [...getModelsByCapability(capability)]
    .filter((model) => model.enabled)
    .sort((a, b) => order[b.cost_tier] - order[a.cost_tier])[0]
}

export function getDefaultModelForProvider(providerKey: string): string {
  const model = MODEL_REGISTRY.find((entry) => entry.provider === providerKey && entry.enabled)
  if (!model) throw new Error(`No canonical model registered for provider "${providerKey}".`)
  return model.model_id
}
