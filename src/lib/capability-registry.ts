/**
 * @module capability-registry
 * @description Capability metadata for the AmarktAI Network.
 *
 * This file describes WHICH providers support each capability and what
 * gates/requirements apply. It does NOT claim any capability is proven
 * or working — runtime proof comes from capability-runtime-truth.ts only.
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
  | 'adult_video'
  | 'adult_avatar'

export type ProviderKey = 'genx' | 'huggingface' | 'together' | 'groq' | 'mimo'

export type CostTier = 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium'

export type QualityTier = 'basic' | 'standard' | 'high' | 'premium'

export interface ProviderCapabilityEntry {
  provider: ProviderKey
  models: string[]
  costTier: CostTier
  qualityTier: QualityTier
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

// ── Capability Metadata Registry ──────────────────────────────────────────────

export const CAPABILITY_REGISTRY: Record<CapabilityKey, CapabilityDefinition> = {
  chat: {
    key: 'chat',
    label: 'Chat',
    description: 'Conversational AI chat completions',
    category: 'text',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'huggingface', models: ['task:text'], costTier: 'free', qualityTier: 'basic' },
      { provider: 'mimo', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  code: {
    key: 'code',
    label: 'Code Generation',
    description: 'Generate and edit code',
    category: 'text',
    outputType: 'code',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'mimo', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  file_analysis: {
    key: 'file_analysis',
    label: 'File Analysis',
    description: 'Analyze and summarize documents',
    category: 'text',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  research: {
    key: 'research',
    label: 'Research',
    description: 'Web research and fact-finding',
    category: 'text',
    outputType: 'markdown',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'together', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  image_generation: {
    key: 'image_generation',
    label: 'Image Generation',
    description: 'Generate images from text prompts',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'huggingface', models: ['task:text-to-image'], costTier: 'free', qualityTier: 'basic' },
    ],
  },
  image_edit: {
    key: 'image_edit',
    label: 'Image Editing',
    description: 'Edit existing images',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  video_generation: {
    key: 'video_generation',
    label: 'Video Generation',
    description: 'Generate videos from text prompts',
    category: 'video',
    outputType: 'video',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX video quota' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', notes: 'Together video API short clips' },
      { provider: 'huggingface', models: ['tencent/HunyuanVideo', 'Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B', 'THUDM/CogVideoX-5b', 'ByteDance/AnimateDiff-Lightning'], costTier: 'free', qualityTier: 'standard', notes: 'HF video models; full-quality requires configured endpoint' },
    ],
  },
  image_to_video: {
    key: 'image_to_video',
    label: 'Image to Video',
    description: 'Generate video from image input',
    category: 'video',
    outputType: 'video',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX video quota' },
      { provider: 'huggingface', models: ['Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B'], costTier: 'free', qualityTier: 'standard', notes: 'HF image-to-video; requires configured endpoint' },
    ],
  },
  music_generation: {
    key: 'music_generation',
    label: 'Music Generation',
    description: 'Generate music and audio compositions',
    category: 'audio',
    outputType: 'audio',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX Lyria quota' },
      { provider: 'huggingface', models: ['facebook/musicgen-small', 'facebook/musicgen-medium', 'facebook/musicgen-large'], costTier: 'free', qualityTier: 'standard', notes: 'MusicGen text-to-audio; segment-length audio only' },
    ],
  },
  tts: {
    key: 'tts',
    label: 'Text-to-Speech',
    description: 'Convert text to speech audio',
    category: 'audio',
    outputType: 'audio',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['playai-tts'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'huggingface', models: ['facebook/mms-tts-eng'], costTier: 'free', qualityTier: 'basic' },
    ],
  },
  stt: {
    key: 'stt',
    label: 'Speech-to-Text',
    description: 'Transcribe audio to text',
    category: 'audio',
    outputType: 'text',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
      { provider: 'groq', models: ['whisper-large-v3'], costTier: 'low', qualityTier: 'standard' },
      { provider: 'huggingface', models: ['openai/whisper-large-v3'], costTier: 'free', qualityTier: 'basic' },
    ],
  },
  embeddings: {
    key: 'embeddings',
    label: 'Embeddings',
    description: 'Generate text embeddings',
    category: 'text',
    outputType: 'json',
    providers: [
      { provider: 'huggingface', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard' },
      { provider: 'genx', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
    ],
  },
  rag: {
    key: 'rag',
    label: 'RAG',
    description: 'Retrieval-augmented generation',
    category: 'multimodal',
    outputType: 'text',
    providers: [
      { provider: 'huggingface', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', notes: 'Requires Qdrant' },
    ],
  },
  memory: {
    key: 'memory',
    label: 'Memory',
    description: 'Persistent memory storage and retrieval',
    category: 'system',
    outputType: 'json',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'low', qualityTier: 'standard' },
    ],
  },
  avatar_generation: {
    key: 'avatar_generation',
    label: 'Avatar Generation',
    description: 'Generate avatar images and video — realistic, anime, cartoon, brand, story, and more',
    category: 'image',
    outputType: 'image',
    providers: [
      { provider: 'genx', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Premium avatar image/video via GenX media API' },
      { provider: 'huggingface', models: ['stabilityai/stable-diffusion-xl-base-1.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'HF avatar image via endpoint or serverless API. Set HF_AVATAR_IMAGE_ENDPOINT for dedicated endpoint.' },
      { provider: 'together', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', notes: 'Together FLUX image for avatar generation. Cheap/balanced option.' },
    ],
  },
  adult_text: {
    key: 'adult_text',
    label: 'Adult Text',
    description: 'Adult-oriented text generation and roleplay',
    category: 'text',
    outputType: 'text',
    requiresAdultMode: true,
    requiresSafeModeOff: true,
    providers: [
      { provider: 'huggingface', models: ['custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint. Primary: HF_ADULT_TEXT_ENDPOINT. Fallback: HF_ADULT_TEXT_ENDPOINT_FALLBACK. GenX, Together, Groq, MiMo must not be used.' },
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
      { provider: 'huggingface', models: ['SG161222/RealVisXL_V4.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint. Primary: HF_ADULT_IMAGE_ENDPOINT. Fallback: HF_ADULT_IMAGE_ENDPOINT_FALLBACK. GenX, Together, Groq, MiMo must not be used.' },
    ],
  },
  adult_video: {
    key: 'adult_video',
    label: 'Adult Video',
    description: 'Adult-oriented video generation',
    category: 'video',
    outputType: 'video',
    requiresAdultMode: true,
    requiresSafeModeOff: true,
    providers: [
      { provider: 'huggingface', models: ['NSFW-API/NSFW_Wan_14b', 'custom'], costTier: 'free', qualityTier: 'basic', notes: 'Requires dedicated HF Inference Endpoint. Primary: HF_ADULT_VIDEO_ENDPOINT. Fallback: HF_ADULT_VIDEO_ENDPOINT_FALLBACK. Experimental. GenX, Together, Groq, MiMo must not be used.' },
    ],
  },
  adult_avatar: {
    key: 'adult_avatar',
    label: 'Adult Avatar',
    description: 'Adult-oriented avatar and character image generation',
    category: 'image',
    outputType: 'image',
    requiresAdultMode: true,
    requiresSafeModeOff: true,
    providers: [
      { provider: 'huggingface', models: ['SG161222/RealVisXL_V4.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint. Primary: HF_ADULT_AVATAR_ENDPOINT. Fallback: HF_ADULT_AVATAR_ENDPOINT_FALLBACK. Supports realistic, anime, 3D, cartoon, fantasy styles. GenX, Together, Groq, MiMo must not be used.' },
    ],
  },
}

// ── Registry Access Functions ─────────────────────────────────────────────────

export function getCapabilityDefinition(key: CapabilityKey): CapabilityDefinition | null {
  return CAPABILITY_REGISTRY[key] ?? null
}

export function getAllCapabilities(): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY)
}

export function getProvidersForCapability(key: CapabilityKey): ProviderCapabilityEntry[] {
  const cap = CAPABILITY_REGISTRY[key]
  if (!cap) return []
  return [...cap.providers].sort((a, b) => {
    const qualityOrder: Record<QualityTier, number> = { basic: 0, standard: 1, high: 2, premium: 3 }
    return qualityOrder[b.qualityTier] - qualityOrder[a.qualityTier]
  })
}

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

export function requiresAdultMode(key: CapabilityKey): boolean {
  return CAPABILITY_REGISTRY[key]?.requiresAdultMode === true
}

export function requiresSafeModeOff(key: CapabilityKey): boolean {
  return CAPABILITY_REGISTRY[key]?.requiresSafeModeOff === true
}
