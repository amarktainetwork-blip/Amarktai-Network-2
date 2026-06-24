/**
 * @module provider-capability-map
 * @description Provider-to-capability mapping for the AmarktAI Network.
 *
 * Maps each provider to the capabilities it supports, with model details,
 * cost tiers, and proof status.
 *
 * ACTIVE PROVIDERS ONLY: genx, huggingface, together, groq, mimo
 */

import type { ProviderKey, CapabilityKey, CostTier, QualityTier, ProofStatus } from './capability-registry'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProviderCapabilityMapping {
  provider: ProviderKey
  capability: CapabilityKey
  models: string[]
  costTier: CostTier
  qualityTier: QualityTier
  proofStatus: ProofStatus
  endpoint?: string
  notes?: string
}

// ── Provider Capability Map ───────────────────────────────────────────────────

export const PROVIDER_CAPABILITY_MAP: ProviderCapabilityMapping[] = [
  // ── GenX ──────────────────────────────────────────────────────────────────
  { provider: 'genx', capability: 'chat', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'code', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'file_analysis', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'research', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'image_generation', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'image_edit', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'SOURCE_WIRED' },
  { provider: 'genx', capability: 'video_generation', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX video quota' },
  { provider: 'genx', capability: 'image_to_video', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX video quota' },
  { provider: 'genx', capability: 'music_generation', models: ['auto'], costTier: 'high', qualityTier: 'premium', proofStatus: 'PARTIAL', notes: 'Requires GenX Lyria quota' },
  { provider: 'genx', capability: 'tts', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'stt', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'embeddings', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'memory', models: ['auto'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'genx', capability: 'avatar_generation', models: ['auto'], costTier: 'medium', qualityTier: 'high', proofStatus: 'SOURCE_WIRED' },

  // ── Hugging Face ──────────────────────────────────────────────────────────
  { provider: 'huggingface', capability: 'chat', models: ['task:text'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
  { provider: 'huggingface', capability: 'image_generation', models: ['task:text-to-image'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
  { provider: 'huggingface', capability: 'tts', models: ['facebook/mms-tts-eng', 'facebook/mms-tts-fra'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
  { provider: 'huggingface', capability: 'stt', models: ['openai/whisper-large-v3', 'openai/whisper-small'], costTier: 'free', qualityTier: 'basic', proofStatus: 'LIVE_PROVEN' },
  { provider: 'huggingface', capability: 'embeddings', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'huggingface', capability: 'rag', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'Requires Qdrant' },
  { provider: 'huggingface', capability: 'adult_text', models: ['custom'], costTier: 'free', qualityTier: 'basic', proofStatus: 'PARTIAL', notes: 'Requires adult-capable endpoint' },
  { provider: 'huggingface', capability: 'adult_image', models: ['SG161222/RealVisXL_V4.0'], costTier: 'free', qualityTier: 'basic', proofStatus: 'PARTIAL' },
  { provider: 'huggingface', capability: 'music_generation', models: ['facebook/musicgen-small', 'facebook/musicgen-medium', 'facebook/musicgen-large'], costTier: 'free', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'MusicGen text-to-audio; segment output, not full mastered song' },
  { provider: 'huggingface', capability: 'video_generation', models: ['tencent/HunyuanVideo', 'Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B', 'THUDM/CogVideoX-5b', 'ByteDance/AnimateDiff-Lightning'], costTier: 'free', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'HF video models; full-quality requires configured HF Inference Endpoint' },
  { provider: 'huggingface', capability: 'image_to_video', models: ['Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B'], costTier: 'free', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'HF image-to-video; requires configured endpoint' },

  // ── Together ──────────────────────────────────────────────────────────────
  { provider: 'together', capability: 'chat', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'together', capability: 'code', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'together', capability: 'file_analysis', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'together', capability: 'research', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'together', capability: 'image_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'together', capability: 'image_edit', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'SOURCE_WIRED' },
  { provider: 'together', capability: 'avatar_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'SOURCE_WIRED' },
  { provider: 'together', capability: 'adult_text', models: ['NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'], costTier: 'low', qualityTier: 'standard', proofStatus: 'PARTIAL' },
  { provider: 'together', capability: 'adult_image', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'Requires disable_safety_checker' },
  { provider: 'together', capability: 'video_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', proofStatus: 'PARTIAL', notes: 'Together video API short clips via /v1/video/generations' },

  // ── Groq ──────────────────────────────────────────────────────────────────
  { provider: 'groq', capability: 'chat', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'groq', capability: 'code', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'groq', capability: 'file_analysis', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'groq', capability: 'research', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'groq', capability: 'tts', models: ['playai-tts', 'playai-tts-arabic'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'groq', capability: 'stt', models: ['whisper-large-v3', 'whisper-large-v3-turbo'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },

  // ── MiMo ──────────────────────────────────────────────────────────────────
  { provider: 'mimo', capability: 'chat', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'mimo', capability: 'code', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'mimo', capability: 'file_analysis', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
  { provider: 'mimo', capability: 'research', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard', proofStatus: 'LIVE_PROVEN' },
]

// ── Map Access Functions ──────────────────────────────────────────────────────

/**
 * Get all capability mappings for a provider.
 */
export function getCapabilitiesForProvider(provider: ProviderKey): ProviderCapabilityMapping[] {
  return PROVIDER_CAPABILITY_MAP.filter(m => m.provider === provider)
}

/**
 * Get all provider mappings for a capability.
 */
export function getProvidersForCapability(capability: CapabilityKey): ProviderCapabilityMapping[] {
  return PROVIDER_CAPABILITY_MAP.filter(m => m.capability === capability)
}

/**
 * Check if a provider supports a capability.
 */
export function providerSupportsCapability(provider: ProviderKey, capability: CapabilityKey): boolean {
  return PROVIDER_CAPABILITY_MAP.some(m => m.provider === provider && m.capability === capability)
}

/**
 * Get the best provider for a capability based on quality and cost preferences.
 */
export function getBestProviderForCapability(
  capability: CapabilityKey,
  options?: {
    preferredCostTier?: CostTier
    preferredQualityTier?: QualityTier
    excludeProviders?: ProviderKey[]
  }
): ProviderCapabilityMapping | null {
  const mappings = getProvidersForCapability(capability)
  if (mappings.length === 0) return null

  let filtered = mappings
  if (options?.excludeProviders) {
    filtered = filtered.filter(m => !options.excludeProviders!.includes(m.provider))
  }
  if (options?.preferredCostTier) {
    const costOrder: Record<CostTier, number> = { free: 0, very_low: 1, low: 2, medium: 3, high: 4, premium: 5 }
    const maxCost = costOrder[options.preferredCostTier]
    filtered = filtered.filter(m => costOrder[m.costTier] <= maxCost)
  }

  // Sort by quality tier (highest first)
  const qualityOrder: Record<QualityTier, number> = { basic: 0, standard: 1, high: 2, premium: 3 }
  filtered.sort((a, b) => qualityOrder[b.qualityTier] - qualityOrder[a.qualityTier])

  return filtered[0] ?? null
}
