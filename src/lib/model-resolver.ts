/**
 * @module model-resolver
 * @description Dynamic model resolver for the AmarktAI Network.
 *
 * Resolves the best model for a given capability, provider, and budget
 * using the model_discovery_cache and provider_capability_map tables.
 *
 * This replaces hardcoded model selection with registry-driven resolution.
 */

import { prisma } from '@/lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedModel {
  providerKey: string
  modelId: string
  capabilities: string[]
  costTier: string
  latencyTier: string
  contextWindow: number
  source: 'cache' | 'static_fallback'
}

export interface ModelResolutionOptions {
  capability: string
  provider?: string
  budgetProfile?: string
  preferredCostTier?: string
  preferredLatencyTier?: string
  excludeModels?: string[]
}

// ── Static Fallback Catalogs ──────────────────────────────────────────────────

// These are used ONLY when the model_discovery_cache is empty.
// In production, the cache should be populated by the model discovery worker.

const STATIC_FALLBACKS: Record<string, Record<string, string[]>> = {
  genx: {
    text: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    image: ['gpt-image-2', 'nano-banana-2'],
    video: ['veo-3.1', 'kling-v3-pro'],
    audio: ['lyria-3-pro-preview'],
    tts: ['grok-tts', 'aura-2'],
    stt: ['genxlm-pro-v1-tr'],
    code: ['gpt-5.3-codex'],
  },
  groq: {
    text: ['llama-3.3-70b-versatile'],
    stt: ['whisper-large-v3', 'whisper-large-v3-turbo'],
    tts: ['playai-tts', 'playai-tts-arabic'],
  },
  together: {
    text: ['meta-llama/Llama-3-70b-chat-hf'],
    image: ['black-forest-labs/FLUX.1-schnell-Free', 'black-forest-labs/FLUX.1-schnell'],
    video: ['black-forest-labs/FLUX.1-schnell-Free'],
  },
  huggingface: {
    text: ['meta-llama/Llama-3.1-8B-Instruct'],
    image: ['stabilityai/stable-diffusion-xl-base-1.0'],
    stt: ['openai/whisper-large-v3', 'openai/whisper-small'],
    tts: ['facebook/mms-tts-eng', 'facebook/mms-tts-fra'],
    embeddings: ['sentence-transformers/all-MiniLM-L6-v2'],
  },
  mimo: {
    text: ['mimo-v2.5', 'mimo-v2.5-pro'],
  },
}

// ── Cost/Latency Tier Ordering ────────────────────────────────────────────────

const COST_TIER_ORDER: Record<string, number> = {
  free: 0,
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  premium: 5,
}

const LATENCY_TIER_ORDER: Record<string, number> = {
  ultra_low: 0,
  low: 1,
  medium: 2,
  high: 3,
}

// ── Capability to Category Mapping ────────────────────────────────────────────

const CAPABILITY_TO_CATEGORY: Record<string, string> = {
  chat: 'text',
  code: 'code',
  file_analysis: 'text',
  image_generation: 'image',
  image_edit: 'image',
  video_generation: 'video',
  image_to_video: 'video',
  music_generation: 'audio',
  lyrics_generation: 'text',
  tts: 'tts',
  stt: 'stt',
  voice_response: 'tts',
  research: 'text',
  adult_text: 'text',
  adult_image: 'image',
  adult_video: 'video',
  suggestive_image: 'image',
  suggestive_video: 'video',
  embeddings: 'embeddings',
}

// ── Model Resolver ────────────────────────────────────────────────────────────

/**
 * Resolve the best model for a given capability, provider, and budget.
 *
 * Resolution order:
 * 1. Query model_discovery_cache for matching models
 * 2. Filter by provider (if specified)
 * 3. Filter by budget profile cost tier
 * 4. Sort by latency tier (prefer low latency)
 * 5. Return the best match
 *
 * If no cached models found, fall back to static catalog.
 */
export async function resolveBestModel(options: ModelResolutionOptions): Promise<ResolvedModel | null> {
  const {
    capability,
    provider,
    budgetProfile,
    preferredCostTier,
    preferredLatencyTier: _preferredLatencyTier,
    excludeModels = [],
  } = options

  const category = CAPABILITY_TO_CATEGORY[capability] ?? 'text'

  // Step 1: Query model_discovery_cache
  try {
    const where: Record<string, unknown> = {
      enabled: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    }

    if (provider) {
      where.providerKey = provider
    }

    const cachedModels = await prisma.modelDiscoveryCache.findMany({ where })

    // Step 2: Filter by capability (check if model capabilities include the target)
    const capableModels = cachedModels.filter(m => {
      const caps = JSON.parse(m.capabilities) as string[]
      return caps.includes(category) || caps.includes(capability)
    })

    // Step 3: Filter by budget profile
    let budgetFiltered = capableModels
    if (budgetProfile) {
      const profile = await prisma.budgetProfile.findUnique({
        where: { profileKey: budgetProfile },
      })
      if (profile) {
        const maxCost = COST_TIER_ORDER[profile.costTier] ?? 5
        budgetFiltered = capableModels.filter(m => {
          const modelCost = COST_TIER_ORDER[m.costTier] ?? 3
          return modelCost <= maxCost
        })
      }
    }

    // Step 4: Filter by preferred cost/latency tiers
    let filtered = budgetFiltered
    if (preferredCostTier) {
      const maxCost = COST_TIER_ORDER[preferredCostTier] ?? 5
      filtered = filtered.filter(m => (COST_TIER_ORDER[m.costTier] ?? 3) <= maxCost)
    }

    // Step 5: Exclude specific models
    filtered = filtered.filter(m => !excludeModels.includes(m.modelId))

    // Step 6: Sort by latency tier (prefer low latency), then cost tier
    filtered.sort((a, b) => {
      const aLatency = LATENCY_TIER_ORDER[a.latencyTier] ?? 2
      const bLatency = LATENCY_TIER_ORDER[b.latencyTier] ?? 2
      if (aLatency !== bLatency) return aLatency - bLatency

      const aCost = COST_TIER_ORDER[a.costTier] ?? 3
      const bCost = COST_TIER_ORDER[b.costTier] ?? 3
      return aCost - bCost
    })

    if (filtered.length > 0) {
      const best = filtered[0]
      return {
        providerKey: best.providerKey,
        modelId: best.modelId,
        capabilities: JSON.parse(best.capabilities),
        costTier: best.costTier,
        latencyTier: best.latencyTier,
        contextWindow: best.contextWindow,
        source: 'cache',
      }
    }
  } catch {
    // Cache unavailable — fall through to static fallback
  }

  // Step 7: Static fallback
  return resolveStaticFallback(capability, provider, excludeModels)
}

/**
 * Resolve a model from the static fallback catalog.
 * Used ONLY when model_discovery_cache is unavailable.
 */
function resolveStaticFallback(
  capability: string,
  provider?: string,
  excludeModels: string[] = [],
): ResolvedModel | null {
  const category = CAPABILITY_TO_CATEGORY[capability] ?? 'text'

  // Try specified provider first
  if (provider) {
    const models = STATIC_FALLBACKS[provider]?.[category] ?? []
    const filtered = models.filter(m => !excludeModels.includes(m))
    if (filtered.length > 0) {
      return {
        providerKey: provider,
        modelId: filtered[0],
        capabilities: [category],
        costTier: 'medium',
        latencyTier: 'medium',
        contextWindow: 4096,
        source: 'static_fallback',
      }
    }
  }

  // Try all providers in priority order
  const providerPriority = ['genx', 'groq', 'together', 'huggingface', 'mimo']
  for (const p of providerPriority) {
    if (p === provider) continue // Already tried
    const models = STATIC_FALLBACKS[p]?.[category] ?? []
    const filtered = models.filter(m => !excludeModels.includes(m))
    if (filtered.length > 0) {
      return {
        providerKey: p,
        modelId: filtered[0],
        capabilities: [category],
        costTier: 'medium',
        latencyTier: 'medium',
        contextWindow: 4096,
        source: 'static_fallback',
      }
    }
  }

  return null
}

/**
 * Get all models for a capability from the cache or static fallback.
 */
export async function resolveAllModels(options: ModelResolutionOptions): Promise<ResolvedModel[]> {
  const {
    capability,
    provider,
    budgetProfile: _budgetProfile,
    excludeModels = [],
  } = options

  const category = CAPABILITY_TO_CATEGORY[capability] ?? 'text'
  const results: ResolvedModel[] = []

  // Query cache
  try {
    const where: Record<string, unknown> = { enabled: true }
    if (provider) where.providerKey = provider

    const cachedModels = await prisma.modelDiscoveryCache.findMany({ where })

    const capableModels = cachedModels.filter(m => {
      const caps = JSON.parse(m.capabilities) as string[]
      return caps.includes(category) || caps.includes(capability)
    })

    for (const m of capableModels) {
      if (!excludeModels.includes(m.modelId)) {
        results.push({
          providerKey: m.providerKey,
          modelId: m.modelId,
          capabilities: JSON.parse(m.capabilities),
          costTier: m.costTier,
          latencyTier: m.latencyTier,
          contextWindow: m.contextWindow,
          source: 'cache',
        })
      }
    }
  } catch {
    // Fall through to static
  }

  // Add static fallbacks if no cache results
  if (results.length === 0) {
    const providers = provider ? [provider] : ['genx', 'groq', 'together', 'huggingface', 'mimo']
    for (const p of providers) {
      const models = STATIC_FALLBACKS[p]?.[category] ?? []
      for (const m of models) {
        if (!excludeModels.includes(m)) {
          results.push({
            providerKey: p,
            modelId: m,
            capabilities: [category],
            costTier: 'medium',
            latencyTier: 'medium',
            contextWindow: 4096,
            source: 'static_fallback',
          })
        }
      }
    }
  }

  return results
}
