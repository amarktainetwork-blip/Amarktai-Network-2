import {
  APPROVED_AI_PROVIDERS,
  HUGGING_FACE_TASK_ROUTES,
  isApprovedAIProvider,
  type ApprovedProviderKey,
  type CostMode,
} from '@/lib/approved-ai-catalog'
import { STATIC_PROVIDER_MODELS, type ProviderModelOption } from '@/lib/ai-model-catalog'
import {
  getModelsForCapability,
  isTogetherAdultFallbackEnabled,
  normalizeGovernedCapability,
  validateCapabilitySelection,
  type GovernedCapability,
  type GovernedModel,
} from '@/lib/provider-capability-governance'
import { normalizeProviderMeshId } from '@/lib/provider-mesh'
import { isV1ProductionAIProviderKey } from '@/lib/provider-runtime'
import { adultPolicyAllows, normalizeAdultPolicy, type AdultPolicyValue } from '@/lib/universal-model-catalog'

export type AiCapability =
  | 'chat'
  | 'reasoning'
  | 'coding'
  | 'research'
  | 'image'
  | 'image_generation'
  | 'image_editing'
  | 'image_to_video'
  | 'video'
  | 'video_generation'
  | 'music_generation'
  | 'song_generation'
  | 'lyrics_generation'
  | 'instrumental_music'
  | 'voice_tts'
  | 'voice_stt'
  | 'tts'
  | 'stt'
  | 'voice_selection'
  | 'voice_cloning'
  | 'avatar_video'
  | 'moderation'
  | 'embeddings'
  | 'rerank'
  | 'rag'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'audio'
  | 'repo_audit'
  | 'crawling'
  | 'browser_qa'
  | 'app_memory'
  | 'artifacts'
  | 'operations'

export type ModelStrategy = CostMode | 'custom'

export interface LiveRouteInput {
  capability: AiCapability
  appSlug?: string
  selectedProvider?: string
  selectedModel?: string
  costMode?: CostMode
  adultPolicy?: AdultPolicyValue | 'allowed' | 'full_adult'
  budgetRemainingUsd?: number
  requiresStreaming?: boolean
  requiresMedia?: boolean
}

export interface LiveRouteResult {
  selectedProvider: ApprovedProviderKey | null
  selectedModel: string | null
  selectedTask: string | null
  fallbackChain: Array<{ provider: ApprovedProviderKey; model: string; task?: string }>
  estimatedCostUsd: number
  reason: string
  blockedReason: string | null
  costMode: CostMode
  appSlug: string
}

const CAPABILITY_TO_ROLE: Record<AiCapability, string[]> = {
  chat: ['chat'],
  reasoning: ['reasoning', 'chat'],
  coding: ['coding', 'reasoning'],
  research: ['chat', 'reasoning'],
  image: ['vision'],
  image_generation: ['vision'],
  image_editing: ['vision'],
  image_to_video: ['vision'],
  video: ['vision'],
  video_generation: ['vision'],
  music_generation: ['chat'],
  song_generation: ['chat'],
  lyrics_generation: ['chat'],
  instrumental_music: ['chat'],
  voice_tts: ['chat'],
  voice_stt: ['chat'],
  tts: ['chat'],
  stt: ['chat'],
  voice_selection: ['chat'],
  voice_cloning: ['chat'],
  avatar_video: ['vision'],
  moderation: ['chat'],
  embeddings: ['chat'],
  rerank: ['reasoning', 'chat'],
  rag: ['chat'],
  adult_text: ['chat'],
  adult_image: ['vision'],
  adult_video: ['vision'],
  adult_voice: ['chat'],
  audio: ['chat'],
  repo_audit: ['coding', 'reasoning'],
  crawling: ['chat', 'reasoning'],
  browser_qa: ['chat', 'reasoning'],
  app_memory: ['chat', 'reasoning'],
  artifacts: ['chat', 'reasoning'],
  operations: ['chat', 'reasoning'],
}

const COST_ESTIMATE: Record<CostMode, number> = {
  cheap: 0.02,
  balanced: 0.12,
  premium: 0.75,
}

const COST_ORDER: Record<CostMode, string[]> = {
  cheap: ['free', 'very_low', 'low', 'medium', 'high', 'premium'],
  balanced: ['low', 'medium', 'high', 'premium', 'very_low', 'free'],
  premium: ['premium', 'high', 'medium', 'low', 'very_low', 'free'],
}

export const LIVE_ROUTING_CAPABILITIES: readonly AiCapability[] = [
  'chat',
  'reasoning',
  'coding',
  'research',
  'image',
  'image_generation',
  'image_editing',
  'image_to_video',
  'video',
  'video_generation',
  'music_generation',
  'song_generation',
  'lyrics_generation',
  'instrumental_music',
  'voice_tts',
  'voice_stt',
  'tts',
  'stt',
  'voice_selection',
  'voice_cloning',
  'avatar_video',
  'moderation',
  'embeddings',
  'rerank',
  'rag',
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
  'audio',
  'repo_audit',
  'crawling',
  'browser_qa',
  'app_memory',
  'artifacts',
  'operations',
] as const

export function routeLiveModel(input: LiveRouteInput): LiveRouteResult {
  const costMode = input.costMode ?? 'balanced'
  const appSlug = input.appSlug ?? 'dashboard'
  const normalizedProvider = normalizeLiveProvider(input.selectedProvider)
  if (normalizedProvider.error) return blocked(input, costMode, normalizedProvider.error)
  const routeInput: LiveRouteInput = {
    ...input,
    selectedProvider: normalizedProvider.provider ?? undefined,
  }
  const governedCapability = normalizeGovernedCapability(input.capability)
  if (!governedCapability) return blocked(input, costMode, `Unknown capability: ${input.capability}`)
  const adultPolicy = input.adultPolicy === 'allowed' ? 'full_adult_app_mode' : normalizeAdultPolicy(input.adultPolicy)
  if (input.capability.startsWith('adult_') && !adultPolicyAllows(adultPolicy, input.capability)) {
    return blocked(input, costMode, 'Adult capability needs an app policy that allows this content type.')
  }
  const governanceValidation = validateCapabilitySelection({
    appSlug,
    capability: governedCapability,
    provider: routeInput.selectedProvider,
    modelId: input.selectedModel,
    adultPolicyAllows: !input.capability.startsWith('adult_') || adultPolicyAllows(adultPolicy, input.capability),
    budgetAllows: typeof input.budgetRemainingUsd !== 'number' || input.budgetRemainingUsd >= COST_ESTIMATE[costMode],
  })
  if (!governanceValidation.allowed && routeInput.selectedProvider) {
    return blocked(input, costMode, governanceValidation.reason)
  }

  if (typeof input.budgetRemainingUsd === 'number' && input.budgetRemainingUsd < COST_ESTIMATE[costMode]) {
    return blocked(input, costMode, 'Estimated spend exceeds the remaining budget.')
  }

  const explicit = explicitSelection(routeInput)
  if (explicit) return explicit

  const candidates = modelCandidates(input.capability, costMode, input.requiresMedia)
  const selected = candidates[0]
  if (!selected) return blocked(input, costMode, 'No approved provider/model route is available for this capability.')

  return {
    selectedProvider: selected.provider as ApprovedProviderKey,
    selectedModel: selected.modelId,
    selectedTask: selected.provider === 'huggingface' ? selected.modelId : null,
    fallbackChain: candidates.slice(1, 5).map((model) => ({
      provider: model.provider as ApprovedProviderKey,
      model: model.modelId,
      task: model.provider === 'huggingface' ? model.modelId : undefined,
    })),
    estimatedCostUsd: COST_ESTIMATE[costMode],
    reason: `${providerName(selected.provider)} matches ${input.capability} with ${costMode} cost routing.`,
    blockedReason: null,
    costMode,
    appSlug,
  }
}

function normalizeLiveProvider(provider?: string | null): { provider: ApprovedProviderKey | null; error: string | null } {
  if (!provider || provider === 'auto') return { provider: null, error: null }
  const normalized = normalizeProviderMeshId(provider)
  if (!normalized || !isApprovedAIProvider(normalized)) {
    return { provider: null, error: 'Provider is not approved by the provider mesh.' }
  }
  if (!isV1ProductionAIProviderKey(normalized)) {
    return { provider: null, error: 'MiMo Token Plan is reserved for developer/repo/tooling or V2; V1 production backend routing is disabled.' }
  }
  return { provider: normalized as ApprovedProviderKey, error: null }
}

function explicitSelection(input: LiveRouteInput): LiveRouteResult | null {
  if (!input.selectedProvider || input.selectedProvider === 'auto') return null
  const adultPolicy = input.adultPolicy === 'allowed' ? 'full_adult_app_mode' : normalizeAdultPolicy(input.adultPolicy)
  if (input.selectedProvider === 'together' && input.capability.startsWith('adult_') && !isTogetherAdultFallbackEnabled(input.capability)) {
    return blocked(input, input.costMode ?? 'balanced', `Together adult fallback is blocked until TOGETHER_ADULT_FALLBACK_ENABLED=true and an approved ${input.capability} model env is configured.`)
  }
  const configuredTogetherAdultModel = input.selectedProvider === 'together' && input.capability.startsWith('adult_')
    ? input.capability === 'adult_image'
      ? process.env.TOGETHER_ADULT_IMAGE_MODEL
      : input.capability === 'adult_video'
        ? process.env.TOGETHER_ADULT_VIDEO_MODEL
        : input.capability === 'adult_voice'
          ? process.env.TOGETHER_ADULT_VOICE_MODEL
          : process.env.TOGETHER_ADULT_TEXT_MODEL
    : null
  const validation = validateCapabilitySelection({
    appSlug: input.appSlug,
    capability: input.capability,
    provider: input.selectedProvider,
    modelId: input.selectedModel,
    adultPolicyAllows: !input.capability.startsWith('adult_') || adultPolicyAllows(adultPolicy, input.capability),
  })
  if (!validation.allowed) return blocked(input, input.costMode ?? 'balanced', validation.reason)

  const providerModels = STATIC_PROVIDER_MODELS[input.selectedProvider] ?? []
  const governedCapability = normalizeGovernedCapability(input.capability)
  const governedModels = governedCapability
    ? getModelsForCapability(governedCapability, { provider: input.selectedProvider })
    : []
  const selectedModel = input.selectedModel || configuredTogetherAdultModel || governedModels[0]?.modelId || providerModels[0]?.modelId || null
  const selected = providerModels.find((model) => model.modelId === selectedModel)
  const governedSelected = governedModels.find((model) => model.modelId === selectedModel)
  if (!selected && !governedSelected && !configuredTogetherAdultModel && input.selectedProvider !== 'huggingface') {
    return blocked(input, input.costMode ?? 'balanced', 'Selected model is not in the approved catalog.')
  }

  const task = input.selectedProvider === 'huggingface'
    ? (HUGGING_FACE_TASK_ROUTES.find((route) => route.id === selectedModel)?.id ?? 'task:text')
    : null

  return {
    selectedProvider: input.selectedProvider as ApprovedProviderKey,
    selectedModel: selectedModel ?? task,
    selectedTask: task,
    fallbackChain: modelCandidates(input.capability, input.costMode ?? 'balanced', input.requiresMedia)
      .filter((model) => model.provider !== input.selectedProvider)
      .slice(0, 4)
      .map((model) => ({ provider: model.provider as ApprovedProviderKey, model: model.modelId })),
    estimatedCostUsd: COST_ESTIMATE[input.costMode ?? 'balanced'],
    reason: `${providerName(input.selectedProvider)} was selected for this run.`,
    blockedReason: null,
    costMode: input.costMode ?? 'balanced',
    appSlug: input.appSlug ?? 'dashboard',
  }
}

function modelCandidates(capability: AiCapability, costMode: CostMode, requiresMedia = false): ProviderModelOption[] {
  const governed = governedCandidates(capability)
  if (governed.length > 0) {
    return governed.sort((a, b) => {
      const costRank = COST_ORDER[costMode].indexOf(a.costTier) - COST_ORDER[costMode].indexOf(b.costTier)
      if (costRank !== 0) return costRank
      return providerRank(a.provider) - providerRank(b.provider)
    })
  }
  const roles = CAPABILITY_TO_ROLE[capability]
  const entries = Object.values(STATIC_PROVIDER_MODELS)
    .flat()
    .filter((model) => isApprovedAIProvider(model.provider))
    .filter((model) => model.enabled)
    .filter((model) => {
      if (!isV1ProductionAIProviderKey(model.provider)) return false
      if (capability.startsWith('adult_') && model.provider === 'together' && !isTogetherAdultFallbackEnabled(capability)) return false
      if (requiresMedia && !model.modalities.some((modality) => ['image', 'video', 'multimodal'].includes(modality))) return false
      // Adult routes must NEVER use GenX. HF primary; Together only when explicitly enabled.
      if (capability === 'adult_text') return model.provider === 'huggingface' || (model.provider === 'together' && isTogetherAdultFallbackEnabled(capability))
      if (capability === 'adult_image') return model.provider === 'huggingface' || (model.provider === 'together' && isTogetherAdultFallbackEnabled(capability))
      if (capability === 'adult_video' || capability === 'adult_voice' || capability === 'audio') return false
      if (capability === 'voice_tts' || capability === 'tts' || capability === 'voice_selection') return model.modalities.includes('voice_tts') || model.provider === 'genx'
      if (capability === 'voice_stt' || capability === 'stt') return model.modalities.includes('voice_stt') || model.provider === 'groq' || model.provider === 'huggingface'
      if (capability === 'music_generation' || capability === 'song_generation' || capability === 'instrumental_music') return false
      if (capability === 'image' || capability === 'image_generation' || capability === 'image_editing') return model.modalities.includes('image') || model.modalities.includes('multimodal')
      if (capability === 'video' || capability === 'video_generation' || capability === 'image_to_video' || capability === 'avatar_video') return model.modalities.includes('video') || model.modalities.includes('multimodal')
      return model.roles.some((role) => roles.includes(role))
    })

  return entries.sort((a, b) => {
    const costRank = COST_ORDER[costMode].indexOf(a.costTier) - COST_ORDER[costMode].indexOf(b.costTier)
    if (costRank !== 0) return costRank
    return providerRank(a.provider) - providerRank(b.provider)
  })
}

function governedCandidates(capability: AiCapability): ProviderModelOption[] {
  const normalized = normalizeGovernedCapability(capability) as GovernedCapability | null
  if (!normalized) return []
  return getModelsForCapability(normalized)
    .filter((model) => isV1ProductionAIProviderKey(model.provider))
    // Adult routes must never use GenX
    .filter((model) => !(normalized.startsWith('adult_') && model.provider === 'genx'))
    // Together adult only when explicitly gate-enabled
    .filter((model) => !(normalized.startsWith('adult_') && model.provider === 'together' && !isTogetherAdultFallbackEnabled(normalized)))
    .map(governedModelToProviderOption)
}

function governedModelToProviderOption(model: GovernedModel): ProviderModelOption {
  const staticModel = STATIC_PROVIDER_MODELS[model.provider]?.find((entry) => entry.modelId === model.modelId)
  const modality = model.capabilities.includes('image_generation') || model.capabilities.includes('image_editing')
    ? 'image'
    : model.capabilities.includes('video_generation') || model.capabilities.includes('image_to_video')
      ? 'video'
      : model.capabilities.includes('tts')
        ? 'voice_tts'
        : model.capabilities.includes('stt')
          ? 'voice_stt'
          : model.capabilities.includes('music_generation')
            ? 'music'
            : 'text'
  const role = model.capabilities.includes('coding')
    ? 'coding'
    : model.capabilities.includes('reasoning')
      ? 'reasoning'
      : model.capabilities.includes('image_generation') || model.capabilities.includes('video_generation')
        ? 'vision'
        : 'chat'
  return {
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.label,
    family: model.providerLabel,
    modalities: [modality as ProviderModelOption['modalities'][number]],
    roles: [role as ProviderModelOption['roles'][number]],
    costTier: staticModel?.costTier ?? (model.provider === 'genx' ? 'medium' : 'low'),
    source: 'custom_supported',
    enabled: model.status !== 'available_not_wired' && model.status !== 'blocked',
    notes: model.notes,
  }
}

function blocked(input: LiveRouteInput, costMode: CostMode, blockedReason: string): LiveRouteResult {
  return {
    selectedProvider: null,
    selectedModel: null,
    selectedTask: null,
    fallbackChain: [],
    estimatedCostUsd: 0,
    reason: '',
    blockedReason,
    costMode,
    appSlug: input.appSlug ?? 'dashboard',
  }
}

function providerRank(provider: string) {
  return APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)?.sortOrder ?? 99
}

function providerName(provider: string) {
  return APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)?.displayName ?? provider
}
