import { GENX_TEXT_MODELS } from '@/lib/genx-client'

/**
 * Maps auto:* alias strings and capability+costMode combos to real GenX model IDs.
 * Ensures no auto:* string is ever sent to the GenX API.
 */
export function resolveModelAlias(opts: {
  provider: string
  capability?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  selectedModelId?: string
}): string {
  const { selectedModelId, capability, costMode } = opts

  // If no model ID or already a real model (not an alias), return as-is
  if (!selectedModelId || !selectedModelId.startsWith('auto:')) {
    return selectedModelId ?? GENX_TEXT_MODELS[0]
  }

  // Map auto:* aliases to real model IDs
  const alias = selectedModelId.toLowerCase()

  if (alias === 'auto:coding-best' || (capability === 'code' && costMode === 'premium')) {
    return 'gpt-5.3-codex'
  }

  if (alias === 'auto:coding-balanced' || (capability === 'code' && costMode === 'balanced')) {
    return 'gpt-5.4-mini'
  }

  if (alias === 'auto:assistant' || costMode === 'balanced') {
    return 'gpt-5.4-mini'
  }

  // Default cheap fallback
  return GENX_TEXT_MODELS[0] // gpt-5.5
}
