import { GENX_TEXT_MODELS } from '@/lib/genx-client'

/**
 * Maps auto:* alias strings to real GenX model IDs.
 * Ensures no auto:* string is ever sent to the GenX API.
 *
 * Two resolution paths:
 * 1. Explicit alias → model mapping (e.g. 'auto:coding-best' → 'gpt-5.3-codex')
 * 2. Capability + costMode inference used as a fallback when alias is unknown
 *
 * If selectedModelId is absent or is already a real model ID (no 'auto:' prefix),
 * it is returned unchanged.
 */
export function resolveModelAlias(opts: {
  provider: string
  capability?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  selectedModelId?: string
}): string {
  const { selectedModelId, capability, costMode } = opts

  // Not an alias — return as-is (works for all providers, not just genx)
  if (!selectedModelId || !selectedModelId.startsWith('auto:')) {
    return selectedModelId ?? GENX_TEXT_MODELS[0]
  }

  // Explicit alias resolution (highest priority)
  const alias = selectedModelId.toLowerCase()
  if (alias === 'auto:coding-best') return 'gpt-5.3-codex'
  if (alias === 'auto:coding-balanced') return 'gpt-5.4-mini'
  if (alias === 'auto:assistant') return 'gpt-5.4-mini'

  // Capability + costMode fallback for any unrecognised auto:* alias
  if (capability === 'code' && costMode === 'premium') return 'gpt-5.3-codex'
  if (capability === 'code' && costMode === 'balanced') return 'gpt-5.4-mini'
  if (costMode === 'balanced') return 'gpt-5.4-mini'

  // Default cheap fallback
  return GENX_TEXT_MODELS[0] // gpt-5.5
}
