import { MODEL_REGISTRY, type ModelEntry, type CostTier, type ModelRole } from '@/lib/model-registry'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export type AiCapability =
  | 'chat'
  | 'coding'
  | 'reasoning'
  | 'creative'
  | 'image_generation'
  | 'video_generation'
  | 'voice_tts'
  | 'voice_stt'
  | 'music_generation'
  | 'embeddings'
  | 'moderation'
  | 'research'
  | 'adult_image'
  | 'adult_text'

export type CostPreference = 'free_first' | 'cheap' | 'balanced' | 'premium'
export type AppSafetyProfile = 'standard' | 'child_safe' | 'religious_safe' | 'adult_safe' | 'education_safe' | 'medical_caution' | 'travel_safe'

export interface AppCapabilityProfile {
  appSlug: string
  appType: string
  safetyProfile: AppSafetyProfile
  enabledCapabilities: AiCapability[]
  defaultCostPreference: CostPreference
  maxDailyUsd?: number
  maxMonthlyUsd?: number
  notes?: string
}

export interface AiRouteRequest {
  capability: AiCapability
  costPreference?: CostPreference
  appProfile?: Partial<AppCapabilityProfile>
  allowAdult?: boolean
  requireStreaming?: boolean
  requireStructuredOutput?: boolean
}

export interface AiRouteCandidate {
  provider: string
  model: string
  displayName: string
  costTier: CostTier | 'genx'
  reason: string
  enabled: boolean
  configured: boolean
  blocked: boolean
  blocker: string | null
}

export interface AiRoutePlan {
  capability: AiCapability
  costPreference: CostPreference
  selected: AiRouteCandidate | null
  candidates: AiRouteCandidate[]
  blockers: string[]
  safetyProfile: AppSafetyProfile
  streamingSupported: boolean
  generatedAt: string
}

const COST_ORDER: Record<CostPreference, Array<CostTier | 'genx'>> = {
  free_first: ['free', 'very_low', 'low', 'genx', 'medium', 'high', 'premium'],
  cheap: ['very_low', 'free', 'low', 'genx', 'medium', 'high', 'premium'],
  balanced: ['genx', 'low', 'very_low', 'medium', 'high', 'premium', 'free'],
  premium: ['premium', 'high', 'genx', 'medium', 'low', 'very_low', 'free'],
}

const PROVIDER_PRIORITY: Record<CostPreference, string[]> = {
  free_first: ['qwen', 'groq', 'huggingface', 'together', 'openrouter', 'genx', 'openai', 'grok'],
  cheap: ['qwen', 'groq', 'together', 'huggingface', 'openrouter', 'genx', 'openai', 'grok'],
  balanced: ['genx', 'qwen', 'groq', 'together', 'openrouter', 'openai', 'grok', 'huggingface'],
  premium: ['genx', 'openai', 'grok', 'qwen', 'openrouter', 'groq', 'together', 'huggingface'],
}

const ROLE_BY_CAPABILITY: Partial<Record<AiCapability, ModelRole[]>> = {
  chat: ['chat'],
  coding: ['coding', 'agent_planning'],
  reasoning: ['reasoning', 'validation'],
  creative: ['creative', 'chat'],
  image_generation: ['image_generation'],
  video_generation: ['video_generation'],
  voice_tts: ['tts', 'voice_interaction'],
  voice_stt: ['voice_interaction'],
  music_generation: [],
  embeddings: ['embeddings'],
  moderation: ['moderation'],
  research: ['reasoning', 'agent_planning'],
  adult_text: ['chat', 'creative'],
  adult_image: ['image_generation'],
}

const GENX_BY_CAPABILITY: Partial<Record<AiCapability, AiRouteCandidate[]>> = {
  chat: [
    { provider: 'genx', model: 'auto:chat-balanced', displayName: 'GenX Auto Chat', costTier: 'genx', reason: 'GenX can route to the best available chat model.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  coding: [
    { provider: 'genx', model: 'auto:coding-best', displayName: 'GenX Coding Agent', costTier: 'genx', reason: 'GenX can route code tasks to strong coding/reasoning models.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  reasoning: [
    { provider: 'genx', model: 'auto:reasoning-best', displayName: 'GenX Reasoning', costTier: 'genx', reason: 'GenX can choose premium or efficient reasoning models by task.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  creative: [
    { provider: 'genx', model: 'auto:creative-balanced', displayName: 'GenX Creative', costTier: 'genx', reason: 'GenX can route creative tasks across multiple providers.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  image_generation: [
    { provider: 'genx', model: 'auto:image', displayName: 'GenX Image Router', costTier: 'genx', reason: 'GenX image routing can use configured image providers and fallbacks.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  video_generation: [
    { provider: 'genx', model: 'auto:video', displayName: 'GenX Video Router', costTier: 'genx', reason: 'GenX video is available only when quota and route are verified.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
  voice_tts: [
    { provider: 'genx', model: 'auto:voice-tts', displayName: 'GenX Voice TTS', costTier: 'genx', reason: 'GenX can route TTS when voice models are available.', enabled: true, configured: false, blocked: false, blocker: null },
  ],
}

const CHEAP_TEXT_FALLBACKS: AiRouteCandidate[] = [
  { provider: 'qwen', model: 'qwen-plus', displayName: 'Qwen Plus', costTier: 'very_low', reason: 'Cheap capable multilingual/chat fallback.', enabled: true, configured: false, blocked: false, blocker: null },
  { provider: 'qwen', model: 'qwen-turbo', displayName: 'Qwen Turbo', costTier: 'very_low', reason: 'Very low-cost fast chat fallback.', enabled: true, configured: false, blocked: false, blocker: null },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', displayName: 'Groq Llama 3.3 70B', costTier: 'low', reason: 'Fast low-cost open model for chat and coding support.', enabled: true, configured: false, blocked: false, blocker: null },
  { provider: 'together', model: 'meta-llama/Llama-3-70b-chat-hf', displayName: 'Together Llama 3 70B', costTier: 'low', reason: 'Open model fallback for text and creative tasks.', enabled: true, configured: false, blocked: false, blocker: null },
  { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.3', displayName: 'HF Mistral 7B', costTier: 'low', reason: 'Open-source backup for simple chat/coding tasks.', enabled: true, configured: false, blocked: false, blocker: null },
]

function supportsCapability(model: ModelEntry, capability: AiCapability, requireStructuredOutput: boolean): boolean {
  if (!model.enabled) return false
  if (requireStructuredOutput && !model.supports_structured_output) return false

  switch (capability) {
    case 'chat': return model.supports_chat
    case 'coding': return model.supports_code || model.primary_role === 'coding' || model.secondary_roles.includes('coding')
    case 'reasoning': return model.supports_reasoning || model.primary_role === 'reasoning'
    case 'creative': return model.secondary_roles.includes('creative') || model.primary_role === 'creative' || model.supports_chat
    case 'image_generation': return model.supports_image_generation === true
    case 'video_generation': return model.supports_video_generation === true || model.primary_role === 'video_generation'
    case 'voice_tts': return model.supports_tts === true || model.primary_role === 'tts'
    case 'voice_stt': return model.supports_stt === true || model.supports_voice_interaction === true
    case 'music_generation': return model.supports_music_generation === true
    case 'embeddings': return model.supports_embeddings
    case 'moderation': return model.supports_moderation === true
    case 'research': return model.supports_reasoning || model.supports_agent_planning || model.supports_tool_use
    case 'adult_text': return model.supports_chat && ['together', 'huggingface', 'grok', 'xai', 'qwen'].includes(model.provider)
    case 'adult_image': return model.supports_image_generation && ['together', 'huggingface', 'replicate', 'grok', 'xai'].includes(model.provider)
    default: return false
  }
}

function modelToCandidate(model: ModelEntry, reason: string): AiRouteCandidate {
  return {
    provider: model.provider,
    model: model.model_id,
    displayName: model.model_name,
    costTier: model.cost_tier,
    reason,
    enabled: model.enabled,
    configured: false,
    blocked: false,
    blocker: null,
  }
}

function addRegistryCandidates(request: AiRouteRequest): AiRouteCandidate[] {
  const roles = ROLE_BY_CAPABILITY[request.capability] ?? []
  return MODEL_REGISTRY
    .filter((model) => supportsCapability(model, request.capability, request.requireStructuredOutput === true))
    .map((model) => modelToCandidate(
      model,
      roles.length > 0
        ? `Registry model supports ${request.capability}; roles: ${[model.primary_role, ...model.secondary_roles].join(', ')}.`
        : `Registry model supports ${request.capability}.`,
    ))
}

function addManualFallbacks(request: AiRouteRequest): AiRouteCandidate[] {
  if (['chat', 'coding', 'reasoning', 'creative', 'research', 'adult_text'].includes(request.capability)) {
    return CHEAP_TEXT_FALLBACKS
  }
  return []
}

function safetyBlocker(request: AiRouteRequest): string | null {
  const profile = request.appProfile?.safetyProfile ?? 'standard'
  if ((request.capability === 'adult_image' || request.capability === 'adult_text') && !request.allowAdult) {
    return 'Adult capability requested but allowAdult is false. Enable app-level adult permission and pass specialist provider test first.'
  }
  if ((request.capability === 'adult_image' || request.capability === 'adult_text') && profile !== 'adult_safe') {
    return `Adult capability requires app safetyProfile="adult_safe". Current profile is "${profile}".`
  }
  if (profile === 'child_safe' && ['adult_image', 'adult_text'].includes(request.capability)) {
    return 'Child-safe apps can never use adult capabilities.'
  }
  return null
}

function candidateSort(a: AiRouteCandidate, b: AiRouteCandidate, preference: CostPreference): number {
  const costs = COST_ORDER[preference]
  const providers = PROVIDER_PRIORITY[preference]
  const costDelta = costs.indexOf(a.costTier) - costs.indexOf(b.costTier)
  if (costDelta !== 0) return costDelta
  const providerDelta = providers.indexOf(a.provider) - providers.indexOf(b.provider)
  if (providerDelta !== 0) return providerDelta
  return a.displayName.localeCompare(b.displayName)
}

export async function planAiRoute(request: AiRouteRequest): Promise<AiRoutePlan> {
  const costPreference = request.costPreference ?? request.appProfile?.defaultCostPreference ?? 'balanced'
  const safetyProfile = request.appProfile?.safetyProfile ?? 'standard'
  const truth = await getDashboardRuntimeTruth()
  const configuredProviders = new Set(truth.providers.filter((provider) => provider.configured).map((provider) => provider.key))
  if (truth.genx.configured) configuredProviders.add('genx')
  if (configuredProviders.has('xai')) configuredProviders.add('grok')
  if (configuredProviders.has('grok')) configuredProviders.add('xai')

  const blockers: string[] = []
  const safety = safetyBlocker(request)
  if (safety) blockers.push(safety)

  if (request.capability === 'adult_image' || request.capability === 'adult_text') {
    if (truth.adultGate.status !== 'ready') {
      blockers.push(truth.adultGate.blocker ?? `Adult gate is ${truth.adultGate.status}.`)
    }
  }

  const rawCandidates = [
    ...(GENX_BY_CAPABILITY[request.capability] ?? []),
    ...addRegistryCandidates(request),
    ...addManualFallbacks(request),
  ]

  const deduped = new Map<string, AiRouteCandidate>()
  for (const candidate of rawCandidates) {
    const key = `${candidate.provider}:${candidate.model}`
    if (!deduped.has(key)) deduped.set(key, candidate)
  }

  const candidates = [...deduped.values()]
    .map((candidate) => {
      const configured = configuredProviders.has(candidate.provider)
      const providerBlocked = configured ? null : `Provider "${candidate.provider}" is not configured in Settings.`
      const capabilityBlocked = request.capability === 'video_generation' && candidate.provider === 'genx' && !truth.capabilities.some((capability) => capability.name === 'Video Generation' && capability.status === 'available')
        ? 'Video generation remains disabled until GenX video route/quota is verified.'
        : null
      const blocked = !configured || !!capabilityBlocked || !!safety
      return {
        ...candidate,
        configured,
        blocked,
        blocker: providerBlocked ?? capabilityBlocked ?? safety,
      }
    })
    .sort((a, b) => candidateSort(a, b, costPreference))

  const selected = blockers.length > 0 ? null : candidates.find((candidate) => !candidate.blocked) ?? null
  if (!selected && blockers.length === 0) {
    blockers.push(`No configured provider/model can satisfy capability "${request.capability}" with preference "${costPreference}".`)
  }

  return {
    capability: request.capability,
    costPreference,
    selected,
    candidates,
    blockers,
    safetyProfile,
    streamingSupported: ['chat', 'coding', 'reasoning', 'creative', 'research', 'adult_text'].includes(request.capability),
    generatedAt: new Date().toISOString(),
  }
}

export function defaultAppCapabilityProfiles(): AppCapabilityProfile[] {
  return [
    {
      appSlug: 'amarktai-network',
      appType: 'ai-operating-system',
      safetyProfile: 'standard',
      enabledCapabilities: ['chat', 'coding', 'reasoning', 'creative', 'image_generation', 'voice_tts', 'research'],
      defaultCostPreference: 'balanced',
      notes: 'Current operator console. Adult/video/music remain gated by runtime truth.',
    },
    {
      appSlug: 'future-marketing-app',
      appType: 'marketing',
      safetyProfile: 'standard',
      enabledCapabilities: ['chat', 'creative', 'image_generation', 'research'],
      defaultCostPreference: 'cheap',
      notes: 'Marketing app should default to cheap capable providers and require approval before sending campaigns.',
    },
    {
      appSlug: 'future-learning-app',
      appType: 'learning-courses',
      safetyProfile: 'education_safe',
      enabledCapabilities: ['chat', 'reasoning', 'creative', 'research', 'voice_tts'],
      defaultCostPreference: 'cheap',
      notes: 'Course apps should prioritize low-cost multilingual tutoring and structured outputs.',
    },
    {
      appSlug: 'future-adult-companion-app',
      appType: 'adult-companion',
      safetyProfile: 'adult_safe',
      enabledCapabilities: ['chat', 'creative', 'adult_text', 'adult_image', 'image_generation', 'voice_tts'],
      defaultCostPreference: 'balanced',
      notes: 'Adult apps require app-level permission, specialist provider tests, and strict legal/safety exclusions.',
    },
    {
      appSlug: 'future-equine-app',
      appType: 'horse-equine-management',
      safetyProfile: 'medical_caution',
      enabledCapabilities: ['chat', 'reasoning', 'creative', 'image_generation', 'research'],
      defaultCostPreference: 'cheap',
      notes: 'Equine apps must avoid unsafe veterinary claims and recommend professional help for serious issues.',
    },
    {
      appSlug: 'future-religious-app',
      appType: 'religious-content',
      safetyProfile: 'religious_safe',
      enabledCapabilities: ['chat', 'creative', 'research', 'voice_tts'],
      defaultCostPreference: 'cheap',
      notes: 'Religious apps require respectful tone and app-specific faith/denomination settings.',
    },
    {
      appSlug: 'future-travel-app',
      appType: 'travel-planning',
      safetyProfile: 'travel_safe',
      enabledCapabilities: ['chat', 'creative', 'image_generation', 'research'],
      defaultCostPreference: 'cheap',
      notes: 'Travel apps must use live sources for prices, schedules, visas and safety claims.',
    },
  ]
}
