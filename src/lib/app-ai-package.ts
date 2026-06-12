import { AI_CAPABILITY_TAXONOMY, type AiCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import { getAllProviderModelCatalogs, type ProviderModelCatalog } from '@/lib/ai-model-catalog'
import { isApprovedAIProvider, type CostMode } from '@/lib/approved-ai-catalog'
import { routeLiveModel, type AiCapability, type ModelStrategy } from '@/lib/live-ai-routing'
import { normalizeAdultPolicy, type AdultPolicyValue } from '@/lib/universal-model-catalog'

export type AppAiPackageStatus = 'draft' | 'ready' | 'needs_configuration' | 'blocked'
export type AppType = 'coding' | 'marketing' | 'companion' | 'avatar/video' | 'research' | 'operations' | 'custom'

export interface AppAiModelSelection {
  capabilityId: AiCapability | string
  provider: string
  modelId: string
  endpointUrl?: string
  fallbackProvider?: string
  fallbackModelId?: string
  notes?: string
}

export interface AppAiPackage {
  appSlug: string
  appName: string
  domain?: string
  appType: AppType | string
  safetyProfile: string
  enabledCapabilityIds: Array<AiCapability | string>
  allowedCapabilities?: AiCapability[]
  modelStrategy?: ModelStrategy
  selections: AppAiModelSelection[]
  fallbackSelections?: AppAiModelSelection[]
  voice?: {
    provider: string
    modelId: string
    voiceId?: string
    label?: string
  }
  crawler?: {
    provider: 'firecrawl' | 'genx' | 'manual'
    websiteUrl?: string
    lastCrawledAt?: string
  }
  budget?: {
    mode: ModelStrategy
    monthlyUsd?: number
    maxPerRequestUsd?: number
    requiresApprovalAboveUsd?: number
  }
  adultPolicy?: AdultPolicyValue
  permissions: {
    canChat: boolean
    canUseTools: boolean
    canUseRepo: boolean
    canUseMedia: boolean
    canUseVoice: boolean
    canUseAdult: boolean
    canSendMarketing: boolean
    requiresApprovalForSpend: boolean
    requiresApprovalForExternalActions: boolean
  }
  status: AppAiPackageStatus
  blockers: string[]
}

export interface AppAiPackageRecommendationInput {
  appSlug: string
  appName: string
  appType: string
  safetyProfile?: string
  requestedCapabilityIds?: string[]
  websiteUrl?: string
  preferCheap?: boolean
  allowAdult?: boolean
}

const APP_TYPE_CAPABILITY_DEFAULTS: Record<string, string[]> = {
  coding: ['repo_coding_agent', 'text_generation', 'summarization'],
  marketing: ['text_generation', 'summarization', 'translation', 'text_to_image', 'website_crawl_intelligence', 'sentence_similarity'],
  companion: ['text_generation', 'question_answering', 'text_to_speech', 'automatic_speech_recognition'],
  'avatar/video': ['text_generation', 'text_to_speech', 'automatic_speech_recognition', 'text_to_image', 'image_text_to_text'],
  research: ['website_crawl_intelligence', 'summarization', 'question_answering'],
  operations: ['text_generation', 'repo_coding_agent', 'website_crawl_intelligence'],
  custom: ['text_generation', 'question_answering', 'summarization'],
  'learning-courses': ['text_generation', 'question_answering', 'summarization', 'translation', 'text_to_speech', 'automatic_speech_recognition'],
  'adult-companion': ['text_generation', 'text_to_speech', 'text_to_image', 'image_text_to_text'],
  'horse-equine-management': ['text_generation', 'question_answering', 'document_question_answering', 'image_text_to_text', 'website_crawl_intelligence'],
  'religious-content': ['text_generation', 'summarization', 'translation', 'text_to_speech', 'website_crawl_intelligence'],
  'travel-planning': ['text_generation', 'summarization', 'translation', 'website_crawl_intelligence', 'image_text_to_text'],
  'ai-operating-system': ['text_generation', 'repo_coding_agent', 'website_crawl_intelligence', 'text_to_speech', 'automatic_speech_recognition'],
  general: ['text_generation', 'question_answering', 'summarization'],
}

export async function recommendAppAiPackage(input: AppAiPackageRecommendationInput): Promise<AppAiPackage> {
  const catalogs = await getAllProviderModelCatalogs()
  const capabilities = resolveCapabilities(input)
  const selections = capabilities.map((capability) => selectForCapability(capability, catalogs, input.preferCheap === true))
  const blockers = selections.filter((selection) => !selection.provider || !selection.modelId).map((selection) => `No model/provider selected for ${selection.capabilityId}`)

  const adultRequested = capabilities.some((capability) => capability.id.includes('adult')) || input.allowAdult === true
  const mediaRequested = capabilities.some((capability) => capability.group === 'computer_vision' || capability.group === 'multimodal')
  const voiceRequested = capabilities.some((capability) => capability.group === 'audio' || capability.id === 'text_to_speech')
  const allowedCapabilities = mapCapabilities(capabilities, adultRequested)
  const budgetMode: CostMode = input.preferCheap ? 'cheap' : 'balanced'

  return {
    appSlug: input.appSlug,
    appName: input.appName,
    appType: input.appType,
    domain: input.websiteUrl ? new URL(input.websiteUrl).hostname : '',
    safetyProfile: input.safetyProfile ?? defaultSafetyProfile(input.appType, input.allowAdult === true),
    enabledCapabilityIds: capabilities.map((capability) => capability.id),
    allowedCapabilities,
    modelStrategy: budgetMode,
    selections,
    fallbackSelections: selections
      .filter((selection) => selection.fallbackProvider && selection.fallbackModelId)
      .map((selection) => ({
        capabilityId: selection.capabilityId,
        provider: selection.fallbackProvider!,
        modelId: selection.fallbackModelId!,
      })),
    voice: voiceRequested ? { provider: 'genx', modelId: 'auto:voice-tts', label: 'Assistant/app voice auto route' } : undefined,
    crawler: input.websiteUrl ? { provider: 'firecrawl', websiteUrl: input.websiteUrl } : { provider: 'manual' },
    budget: {
      mode: budgetMode,
      monthlyUsd: input.preferCheap ? 25 : 100,
      maxPerRequestUsd: input.preferCheap ? 0.05 : 0.25,
      requiresApprovalAboveUsd: input.preferCheap ? 0.05 : 0.25,
    },
    adultPolicy: input.allowAdult ? 'full_adult_app_mode' : 'off',
    permissions: {
      canChat: true,
      canUseTools: true,
      canUseRepo: input.appType === 'ai-operating-system',
      canUseMedia: mediaRequested,
      canUseVoice: voiceRequested,
      canUseAdult: adultRequested && input.allowAdult === true,
      canSendMarketing: input.appType === 'marketing',
      requiresApprovalForSpend: true,
      requiresApprovalForExternalActions: true,
    },
    status: blockers.length ? 'needs_configuration' : 'ready',
    blockers,
  }
}

function resolveCapabilities(input: AppAiPackageRecommendationInput): AiCapabilityDefinition[] {
  const ids = input.requestedCapabilityIds?.length
    ? input.requestedCapabilityIds
    : APP_TYPE_CAPABILITY_DEFAULTS[input.appType] ?? APP_TYPE_CAPABILITY_DEFAULTS.general
  const allowed = new Set(ids)
  return AI_CAPABILITY_TAXONOMY.filter((capability) => allowed.has(capability.id))
}

function selectForCapability(capability: AiCapabilityDefinition, catalogs: ProviderModelCatalog[], preferCheap: boolean): AppAiModelSelection {
  const providerOrder = preferCheap
    ? [...capability.defaultProviders.filter((provider) => ['huggingface', 'qwen', 'groq', 'together'].includes(provider)), ...capability.defaultProviders]
    : capability.defaultProviders

  for (const provider of [...new Set(providerOrder)]) {
    if (!isApprovedAIProvider(provider)) continue
    const catalog = catalogs.find((entry) => entry.provider === provider)
    if (!catalog) continue
    const configuredBonus = catalog.configured ? 1 : 0
    const models = [...catalog.models]
      .filter((model) => model.enabled && model.modalities.some((modality) => modalityMatchesCapability(modality, capability)))
      .sort((a, b) => configuredBonus + costScore(a.costTier) - costScore(b.costTier))
    const chosen = models[0] ?? catalog.models.find((model) => model.source === 'custom_supported')
    if (chosen) {
      return {
        capabilityId: capability.id,
        provider: catalog.provider,
        modelId: chosen.modelId,
        fallbackProvider: fallbackProvider(provider, capability),
        fallbackModelId: undefined,
        notes: chosen.notes,
      }
    }
  }

  return {
    capabilityId: capability.id,
    provider: '',
    modelId: '',
    notes: `Requires specialist route: ${capability.specialistRouteRequired}`,
  }
}

function modalityMatchesCapability(modality: string, capability: AiCapabilityDefinition) {
  if (capability.group === 'text' || capability.group === 'agents_or_planning') return modality === 'text' || modality === 'multimodal'
  if (capability.group === 'audio') return modality === 'voice_tts' || modality === 'voice_stt' || modality === 'music' || modality === 'multimodal'
  if (capability.group === 'computer_vision' || capability.group === 'video') return modality === 'image' || modality === 'video' || modality === 'multimodal'
  if (capability.group === 'multimodal') return modality === 'multimodal' || modality === 'image' || modality === 'video' || modality === 'voice_tts' || modality === 'voice_stt'
  return true
}

function costScore(costTier: string) {
  return ['free', 'very_low', 'low', 'medium', 'high', 'premium', 'unknown'].indexOf(costTier)
}

function fallbackProvider(provider: string, capability: AiCapabilityDefinition) {
  return capability.defaultProviders.find((candidate) => candidate !== provider && isApprovedAIProvider(candidate)) ?? undefined
}

function defaultSafetyProfile(appType: string, allowAdult: boolean) {
  if (allowAdult) return 'adult_safe'
  if (appType.includes('learning')) return 'education_safe'
  if (appType.includes('equine') || appType.includes('horse')) return 'medical_caution'
  if (appType.includes('religious')) return 'religious_safe'
  if (appType.includes('travel')) return 'travel_safe'
  return 'standard'
}

function mapCapabilities(capabilities: AiCapabilityDefinition[], adultRequested: boolean): AiCapability[] {
  const mapped = new Set<AiCapability>()
  for (const capability of capabilities) {
    if (capability.id === 'repo_coding_agent') mapped.add('coding')
    if (capability.id.includes('crawl')) mapped.add('research')
    if (capability.id.includes('image')) mapped.add(adultRequested ? 'adult_image' : 'image')
    if (capability.id.includes('speech') || capability.id.includes('voice')) mapped.add('voice_tts')
    if (capability.group === 'audio') mapped.add('voice_tts')
    if (capability.group === 'text' || capability.group === 'agents_or_planning') mapped.add(adultRequested ? 'adult_text' : 'chat')
  }
  if (mapped.size === 0) mapped.add('chat')
  return [...mapped]
}

export function confirmAppAiPackage(pkg: AppAiPackage) {
  const costMode = pkg.budget?.mode === 'custom' ? 'balanced' : (pkg.budget?.mode ?? 'balanced')
  const capabilities: AiCapability[] = pkg.allowedCapabilities?.length ? pkg.allowedCapabilities : ['chat']
  const routes = capabilities.map((capability) => routeLiveModel({
    capability,
    appSlug: pkg.appSlug,
    costMode,
    adultPolicy: normalizeAdultPolicy(pkg.adultPolicy),
    selectedProvider: pkg.selections.find((selection) => selection.capabilityId === capability)?.provider,
    selectedModel: pkg.selections.find((selection) => selection.capabilityId === capability)?.modelId,
  }))

  return {
    appSlug: pkg.appSlug,
    appName: pkg.appName,
    modelStrategy: pkg.modelStrategy ?? pkg.budget?.mode ?? 'balanced',
    monthlyBudgetUsd: pkg.budget?.monthlyUsd ?? 0,
    requiresApprovalAboveUsd: pkg.budget?.requiresApprovalAboveUsd ?? pkg.budget?.maxPerRequestUsd ?? 0,
    adultPolicy: normalizeAdultPolicy(pkg.adultPolicy),
    routes,
    canSave: routes.every((route) => !route.blockedReason),
  }
}
