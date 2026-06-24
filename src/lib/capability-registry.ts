/**
 * @module capability-registry
 * @description Canonical capability registry for the AmarktAI Network.
 *
 * This is the SINGLE SOURCE OF TRUTH for all capability routing.
 * Apps request capabilities. The runtime decides provider, model, endpoint.
 *
 * ACTIVE PROVIDERS ONLY: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CapabilityKey =
  | 'chat'
  | 'code'
  | 'file_analysis'
  | 'research'
  | 'image_generation'
  | 'image_edit'
  | 'video_generation'
  | 'image_to_video'
  | 'music_generation'
  | 'tts'
  | 'stt'
  | 'embeddings'
  | 'rag'
  | 'memory'
  | 'avatar_generation'
  | 'adult_text'
  | 'adult_image'

export type ProviderKey = 'genx' | 'huggingface' | 'together' | 'groq' | 'mimo'

export type CostTier = 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium'

export type QualityTier = 'basic' | 'standard' | 'high' | 'premium'

export type ProofStatus = 'LIVE_PROVEN' | 'SOURCE_WIRED' | 'PARTIAL' | 'BLOCKED'

export interface ProviderCapabilityEntry {
  provider: ProviderKey
  models: string[]
  costTier: CostTier
  qualityTier: QualityTier
  proofStatus: ProofStatus
  endpoint?: string
  notes?: string
}

export interface CapabilityDefinition {
  key: CapabilityKey
  label: string
  description: string
  category: 'text' | 'image' | 'video' | 'audio' | 'multimodal' | 'system'
  outputType: 'text' | 'image' | 'video' | 'audio' | 'code' | 'markdown' | 'json'
  providers: ProviderCapabilityEntry[]
  requiresAdultMode?: boolean
  requiresSafeModeOff?: boolean
}

// ── Canonical Registry ────────────────────────────────────────────────────────

export const CAPABILITY_REGISTRY: Record<CapabilityKey, CapabilityDefinition> = {
  chat: {
    key: 'chat',
    label: 'Chat',
    description: 'Conversational AI chat completions',
    category: 'text',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'huggingface', models: ['task:text'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
      { provider: 'mimo', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  code: {
    key: 'code',
    label: 'Code Generation',
    description: 'Generate and edit code',
    category: 'text',
    outputType: 'code',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'mimo', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  file_analysis: {
    key: 'file_analysis',
    label: 'File Analysis',
    description: 'Analyze and summarize documents',
    category: 'text',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  research: {
    key: 'research',
    label: 'Research',
    description: 'Web research and fact-finding',
    category: 'text',
    outputType: 'markdown',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  image_generation: {
    key: 'image_generation',
    label: 'Image Generation',
    description: 'Generate images from text prompts',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'huggingface', models: ['task:text-to-image'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  image_edit: {
    key: 'image_edit',
    label: 'Image Editing',
    description: 'Edit existing images',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'SOURCE_WIRED' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'SOURCE_WIRED' },
    ],
  },
  video_generation: {
    key: 'video_generation',
    label: 'Video Generation',
    description: 'Generate videos from text prompts',
    category: 'video',
    outputType: 'video',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX video quota' },
    ],
  },
  image_to_video: {
    key: 'image_to_video',
    label: 'Image to Video',
    description: 'Generate video from image input',
    category: 'video',
    outputType: 'video',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX video quota' },
    ],
  },
  music_generation: {
    key: 'music_generation',
    label: 'Music Generation',
    description: 'Generate music and audio compositions',
    category: 'audio',
    outputType: 'audio',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX Lyria quota' },
    ],
  },
  tts: {
    key: 'tts',
    label: 'Text-to-Speech',
    description: 'Convert text to speech audio',
    category: 'audio',
    outputType: 'audio',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['playai-tts'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'huggingface', models: ['facebook/mms-tts-eng'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  stt: {
    key: 'stt',
    label: 'Speech-to-Text',
    description: 'Transcribe audio to text',
    category: 'audio',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
      { provider: 'groq', models: ['whisper-large-v3'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'huggingface', models: ['openai/whisper-large-v3'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  embeddings: {
    key: 'embeddings',
    label: 'Embeddings',
    description: 'Generate text embeddings',
    category: 'text',
    outputType: 'json',
    providers: [
      { provider: 'huggingface', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  rag: {
    key: 'rag',
    label: 'RAG',
    description: 'Retrieval-augmented generation',
    category: 'multimodal',
    outputType: 'text',
    providers: [
      { provider: 'huggingface', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'Requires Qdrant' },
    ],
  },
  memory: {
    key: 'memory',
    label: 'Memory',
    description: 'Persistent memory storage and retrieval',
    category: 'system',
    outputType: 'json',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
    ],
  },
  avatar_generation: {
    key: 'avatar_generation',
    label: 'Avatar Generation',
    description: 'Generate avatar images',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'SOURCE_WIRED' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'SOURCE_WIRED' },
    ],
  },
  adult_text: {
    key: 'adult_text',
    label: 'Adult Text',
    description: 'Adult-oriented text generation',
    category: 'text',
    outputType: 'text',
    requiresAdultMode: true,
    requiresSafeModeOff: true,
    providers: [
      { provider: 'huggingface', models: ['custom'], costTier: 'free', qualityTier: 'basic', proofStatus: 'PARTIAL', notes: 'Requires adult-capable endpoint' },
      { provider: 'together', models: ['NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'], costTier: 'low', qualityTier: 'standard', proofStatus: 'PARTIAL' },
    ],
  },
  adult_image: {
    key: 'adult_image',
    label: 'Adult Image',
    description: 'Adult-oriented image generation',
    category: 'image',
    outputType: 'image',
    requiresAdultMode: true,
    requiresSafeModeOff: true,
    providers: [
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'Requires disable_safety_checker' },
      { provider: 'huggingface', models: ['SG161222/RealVisXL_V4.0'], costTier: 'free', qualityTier: 'basic', proofStatus: 'PARTIAL' },
    ],
  },
}

// ── Registry Access Functions ─────────────────────────────────────────────────

/**
 * Get capability definition by key.
 */
export function getCapabilityDefinition(key: CapabilityKey): CapabilityDefinition | null {
  return CAPABILITY_REGISTRY[key] ?? null
}

/**
 * Get all capability definitions.
 */
export function getAllCapabilities(): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY)
}

/**
 * Get providers for a capability, sorted by quality tier (highest first).
 */
export function getProvidersForCapability(key: CapabilityKey): ProviderCapabilityEntry[] {
  const cap = CAPABILITY_REGISTRY[key]
  if (!cap) return []
  return [...cap.providers].sort((a, b) => {
    const qualityOrder: Record<QualityTier, number> = { basic: 0, standard: 1, high: 2, premium: 3 }
    return qualityOrder[b.qualityTier] - qualityOrder[a.qualityTier]
  })
}

/**
 * Get the best provider for a capability based on quality and cost preferences.
 */
export function getBestProvider(
  key: CapabilityKey,
  options?: {
    preferredCostTier?: CostTier
    preferredQualityTier?: QualityTier
    excludeProviders?: ProviderKey[]
  }
): ProviderCapabilityEntry | null {
  const providers = getProvidersForCapability(key)
  if (providers.length === 0) return null

  let filtered = providers
  if (options?.excludeProviders) {
    filtered = filtered.filter(p => !options.excludeProviders!.includes(p.provider))
  }
  if (options?.preferredCostTier) {
    const costOrder: Record<CostTier, number> = { free: 0, very_low: 1, low: 2, medium: 3, high: 4, premium: 5 }
    const maxCost = costOrder[options.preferredCostTier]
    filtered = filtered.filter(p => costOrder[p.costTier] <= maxCost)
  }

  return filtered[0] ?? null
}

/**
 * Check if a capability requires adult mode.
 */
export function requiresAdultMode(key: CapabilityKey): boolean {
  return CAPABILITY_REGISTRY[key]?.requiresAdultMode === true
}

/**
 * Check if a capability requires safeMode to be off.
 */
export function requiresSafeModeOff(key: CapabilityKey): boolean {
  return CAPABILITY_REGISTRY[key]?.requiresSafeModeOff === true
}
