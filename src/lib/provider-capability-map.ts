/**
 * @module provider-capability-map
 * @description Provider-to-capability metadata for the AmarktAI Network.
 *
 * Maps each provider to the capabilities it supports with model details
 * and cost tiers. This file describes metadata only — no capability is
 * claimed as proven or working here. Runtime proof comes exclusively from
 * capability-runtime-truth.ts.
 *
 * ACTIVE PROVIDERS ONLY: genx, huggingface, together, groq, mimo
 */

import type { ProviderKey, CapabilityKey, CostTier, QualityTier } from './capability-registry'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProviderCapabilityMapping {
  provider: ProviderKey
  capability: CapabilityKey
  models: string[]
  costTier: CostTier
  qualityTier: QualityTier
  endpoint?: string
  notes?: string
}

// ── Provider Capability Map ───────────────────────────────────────────────────

export const PROVIDER_CAPABILITY_MAP: ProviderCapabilityMapping[] = [
  // ── GenX ──────────────────────────────────────────────────────────────────
  { provider: 'genx', capability: 'chat', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'code', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'file_analysis', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'research', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'image_generation', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'image_edit', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'video_generation', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX video quota' },
  { provider: 'genx', capability: 'image_to_video', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX video quota' },
  { provider: 'genx', capability: 'music_generation', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Requires GenX Lyria quota' },
  { provider: 'genx', capability: 'tts', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'stt', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'embeddings', models: ['auto'], costTier: 'medium', qualityTier: 'high' },
  { provider: 'genx', capability: 'memory', models: ['auto'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'genx', capability: 'avatar_generation', models: ['auto'], costTier: 'high', qualityTier: 'premium', notes: 'Premium avatar image/video via GenX media API' },

  // ── Hugging Face ──────────────────────────────────────────────────────────
  { provider: 'huggingface', capability: 'chat', models: ['task:text'], costTier: 'free', qualityTier: 'basic' },
  { provider: 'huggingface', capability: 'image_generation', models: ['task:text-to-image'], costTier: 'free', qualityTier: 'basic' },
  { provider: 'huggingface', capability: 'tts', models: ['facebook/mms-tts-eng', 'facebook/mms-tts-fra'], costTier: 'free', qualityTier: 'basic' },
  { provider: 'huggingface', capability: 'stt', models: ['openai/whisper-large-v3', 'openai/whisper-small'], costTier: 'free', qualityTier: 'basic' },
  { provider: 'huggingface', capability: 'embeddings', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard' },
  { provider: 'huggingface', capability: 'rag', models: ['sentence-transformers/all-MiniLM-L6-v2'], costTier: 'free', qualityTier: 'standard', notes: 'Requires Qdrant' },
  { provider: 'huggingface', capability: 'adult_text', models: ['custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint (HF_ADULT_TEXT_ENDPOINT). Only executable adult provider.' },
  { provider: 'huggingface', capability: 'adult_image', models: ['SG161222/RealVisXL_V4.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint (HF_ADULT_IMAGE_ENDPOINT). Only executable adult provider.' },
  { provider: 'huggingface', capability: 'adult_video', models: ['NSFW-API/NSFW_Wan_14b', 'custom'], costTier: 'free', qualityTier: 'basic', notes: 'Requires dedicated HF Inference Endpoint (HF_ADULT_VIDEO_ENDPOINT). Experimental. Only executable adult provider.' },
  { provider: 'huggingface', capability: 'adult_avatar', models: ['SG161222/RealVisXL_V4.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'Requires dedicated HF Inference Endpoint (HF_ADULT_AVATAR_ENDPOINT). Only executable adult provider.' },
  { provider: 'huggingface', capability: 'avatar_generation', models: ['stabilityai/stable-diffusion-xl-base-1.0', 'custom'], costTier: 'free', qualityTier: 'standard', notes: 'HF avatar image via endpoint or serverless API. Set HF_AVATAR_IMAGE_ENDPOINT for dedicated endpoint.' },
  { provider: 'huggingface', capability: 'music_generation', models: ['facebook/musicgen-small', 'facebook/musicgen-medium', 'facebook/musicgen-large'], costTier: 'free', qualityTier: 'standard', notes: 'MusicGen text-to-audio; segment output, not full mastered song' },
  { provider: 'huggingface', capability: 'video_generation', models: ['tencent/HunyuanVideo', 'Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B', 'THUDM/CogVideoX-5b', 'ByteDance/AnimateDiff-Lightning'], costTier: 'free', qualityTier: 'standard', notes: 'HF video models; full-quality requires configured HF Inference Endpoint' },
  { provider: 'huggingface', capability: 'image_to_video', models: ['Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B'], costTier: 'free', qualityTier: 'standard', notes: 'HF image-to-video; requires configured endpoint' },

  // ── Together ──────────────────────────────────────────────────────────────
  { provider: 'together', capability: 'chat', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'code', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'file_analysis', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'research', models: ['meta-llama/Llama-3-70b-chat-hf'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'image_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'image_edit', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'together', capability: 'avatar_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', notes: 'Together FLUX image for avatar generation. Cheap/balanced option.' },
  // NOTE: Together does NOT execute adult capabilities. Adult generation is HuggingFace dedicated endpoint only.
  { provider: 'together', capability: 'video_generation', models: ['black-forest-labs/FLUX.1-schnell-Free'], costTier: 'low', qualityTier: 'standard', notes: 'Together video API short clips via /v1/video/generations' },

  // ── Groq ──────────────────────────────────────────────────────────────────
  { provider: 'groq', capability: 'chat', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'groq', capability: 'code', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'groq', capability: 'file_analysis', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'groq', capability: 'research', models: ['llama-3.3-70b-versatile'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'groq', capability: 'tts', models: ['playai-tts', 'playai-tts-arabic'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'groq', capability: 'stt', models: ['whisper-large-v3', 'whisper-large-v3-turbo'], costTier: 'low', qualityTier: 'standard' },

  // ── MiMo ──────────────────────────────────────────────────────────────────
  { provider: 'mimo', capability: 'chat', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'mimo', capability: 'code', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'mimo', capability: 'file_analysis', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
  { provider: 'mimo', capability: 'research', models: ['mimo-v2.5'], costTier: 'low', qualityTier: 'standard' },
]

// ── Map Access Functions ──────────────────────────────────────────────────────

export function getCapabilitiesForProvider(provider: ProviderKey): ProviderCapabilityMapping[] {
  return PROVIDER_CAPABILITY_MAP.filter(m => m.provider === provider)
}

export function getProvidersForCapability(capability: CapabilityKey): ProviderCapabilityMapping[] {
  return PROVIDER_CAPABILITY_MAP.filter(m => m.capability === capability)
}

export function providerSupportsCapability(provider: ProviderKey, capability: CapabilityKey): boolean {
  return PROVIDER_CAPABILITY_MAP.some(m => m.provider === provider && m.capability === capability)
}

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

  const qualityOrder: Record<QualityTier, number> = { basic: 0, standard: 1, high: 2, premium: 3 }
  filtered.sort((a, b) => qualityOrder[b.qualityTier] - qualityOrder[a.qualityTier])

  return filtered[0] ?? null
}
