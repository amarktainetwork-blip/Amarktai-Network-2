import {
  APPROVED_AI_PROVIDERS,
  HUGGING_FACE_TASK_ROUTES,
  isApprovedAIProvider,
  type ApprovedProviderKey,
  type CostMode,
} from '@/lib/approved-ai-catalog'
import { STATIC_PROVIDER_MODELS, type ProviderModelOption } from '@/lib/ai-model-catalog'

export type AiCapability =
  | 'chat'
  | 'reasoning'
  | 'coding'
  | 'research'
  | 'image'
  | 'video'
  | 'voice_tts'
  | 'voice_stt'
  | 'avatar_video'
  | 'moderation'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'

export type ModelStrategy = CostMode | 'custom'

export interface LiveRouteInput {
  capability: AiCapability
  appSlug?: string
  selectedProvider?: string
  selectedModel?: string
  costMode?: CostMode
  adultPolicy?: 'off' | 'allowed'
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
  video: ['vision'],
  voice_tts: ['chat'],
  voice_stt: ['chat'],
  avatar_video: ['vision'],
  moderation: ['chat'],
  adult_text: ['chat'],
  adult_image: ['vision'],
  adult_video: ['vision'],
  adult_voice: ['chat'],
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
  'video',
  'voice_tts',
  'voice_stt',
  'avatar_video',
  'moderation',
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
] as const

export function routeLiveModel(input: LiveRouteInput): LiveRouteResult {
  const costMode = input.costMode ?? 'balanced'
  const appSlug = input.appSlug ?? 'dashboard'
  if (input.capability.startsWith('adult_') && input.adultPolicy !== 'allowed') {
    return blocked(input, costMode, 'Adult capabilities are off for this app.')
  }

  if (typeof input.budgetRemainingUsd === 'number' && input.budgetRemainingUsd < COST_ESTIMATE[costMode]) {
    return blocked(input, costMode, 'Estimated spend exceeds the remaining budget.')
  }

  const explicit = explicitSelection(input)
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

function explicitSelection(input: LiveRouteInput): LiveRouteResult | null {
  if (!input.selectedProvider || input.selectedProvider === 'auto') return null
  if (!isApprovedAIProvider(input.selectedProvider)) {
    return blocked(input, input.costMode ?? 'balanced', 'Selected provider is not approved.')
  }

  const providerModels = STATIC_PROVIDER_MODELS[input.selectedProvider] ?? []
  const selectedModel = input.selectedModel || providerModels[0]?.modelId || null
  const selected = providerModels.find((model) => model.modelId === selectedModel)
  if (!selected && input.selectedProvider !== 'huggingface') {
    return blocked(input, input.costMode ?? 'balanced', 'Selected model is not in the approved catalog.')
  }

  const task = input.selectedProvider === 'huggingface'
    ? (HUGGING_FACE_TASK_ROUTES.find((route) => route.id === selectedModel)?.id ?? 'task:text')
    : null

  return {
    selectedProvider: input.selectedProvider,
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
  const roles = CAPABILITY_TO_ROLE[capability]
  const entries = Object.values(STATIC_PROVIDER_MODELS)
    .flat()
    .filter((model) => isApprovedAIProvider(model.provider))
    .filter((model) => model.enabled)
    .filter((model) => {
      if (requiresMedia && !model.modalities.some((modality) => ['image', 'video', 'multimodal'].includes(modality))) return false
      if (capability === 'voice_tts') return model.modalities.includes('voice_tts') || model.provider === 'minimax' || model.provider === 'openai'
      if (capability === 'voice_stt') return model.modalities.includes('voice_stt') || model.provider === 'groq' || model.provider === 'openai'
      if (capability === 'image' || capability === 'adult_image') return model.modalities.includes('image') || model.modalities.includes('multimodal')
      if (capability === 'video' || capability === 'avatar_video' || capability === 'adult_video') return model.modalities.includes('video') || model.modalities.includes('multimodal')
      return model.roles.some((role) => roles.includes(role))
    })

  return entries.sort((a, b) => {
    const costRank = COST_ORDER[costMode].indexOf(a.costTier) - COST_ORDER[costMode].indexOf(b.costTier)
    if (costRank !== 0) return costRank
    return providerRank(a.provider) - providerRank(b.provider)
  })
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
