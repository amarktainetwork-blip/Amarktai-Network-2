/**
 * @module avatar-capability
 * @description Avatar generation capability with structured controls.
 *
 * Supports:
 * - Styles (realistic, business, friendly, anime, cinematic, creator)
 * - Voice integration
 * - Provider registry support
 *
 * ACTIVE PROVIDERS: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type AvatarStyle = 'realistic' | 'business' | 'friendly' | 'anime' | 'cinematic' | 'creator'

export interface AvatarCapabilityPayload {
  /** Avatar name */
  name: string
  /** Avatar style */
  style: AvatarStyle
  /** Description */
  description?: string
  /** Voice ID for TTS integration */
  voiceId?: string
  /** Gender */
  gender?: 'male' | 'female' | 'neutral'
  /** Age range */
  ageRange?: 'young' | 'adult' | 'senior'
  /** Ethnicity */
  ethnicity?: string
  /** Clothing style */
  clothingStyle?: string
  /** Background */
  background?: string
  /** App slug */
  appSlug?: string
}

export interface AvatarExecutionResult {
  success: boolean
  provider: string
  model: string
  artifactId?: string
  imageUrl?: string
  avatarId?: string
  error?: string
}

export interface AvatarDefinition {
  avatarId: string
  name: string
  style: AvatarStyle
  voiceId?: string
  provider: string
  metadata: Record<string, unknown>
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateAvatarPayload(payload: AvatarCapabilityPayload): string | null {
  if (!payload.name || payload.name.trim().length === 0) {
    return 'Name is required'
  }
  if (payload.name.length > 100) {
    return 'Name must be 100 characters or less'
  }
  if (payload.description && payload.description.length > 1000) {
    return 'Description must be 1000 characters or less'
  }
  return null
}

// ── Avatar Prompt Generation ──────────────────────────────────────────────────

export function generateAvatarPrompt(payload: AvatarCapabilityPayload): string {
  const parts: string[] = []

  parts.push(`${payload.style} style portrait`)

  if (payload.gender) {
    parts.push(payload.gender)
  }

  if (payload.ageRange) {
    parts.push(payload.ageRange)
  }

  if (payload.ethnicity) {
    parts.push(payload.ethnicity)
  }

  if (payload.clothingStyle) {
    parts.push(`wearing ${payload.clothingStyle}`)
  }

  if (payload.background) {
    parts.push(`with ${payload.background} background`)
  }

  if (payload.description) {
    parts.push(payload.description)
  }

  return parts.join(', ')
}

// ── Avatar Library ────────────────────────────────────────────────────────────

export const AVATAR_LIBRARY: AvatarDefinition[] = [
  {
    avatarId: 'default-professional',
    name: 'Professional',
    style: 'business',
    provider: 'genx',
    metadata: { gender: 'neutral', ageRange: 'adult' },
  },
  {
    avatarId: 'default-friendly',
    name: 'Friendly',
    style: 'friendly',
    provider: 'genx',
    metadata: { gender: 'neutral', ageRange: 'adult' },
  },
  {
    avatarId: 'default-anime',
    name: 'Anime',
    style: 'anime',
    provider: 'huggingface',
    metadata: { gender: 'neutral', ageRange: 'young' },
  },
  {
    avatarId: 'default-cinematic',
    name: 'Cinematic',
    style: 'cinematic',
    provider: 'genx',
    metadata: { gender: 'neutral', ageRange: 'adult' },
  },
  {
    avatarId: 'default-creator',
    name: 'Creator',
    style: 'creator',
    provider: 'genx',
    metadata: { gender: 'neutral', ageRange: 'adult' },
  },
]

// ── Avatar Access Functions ───────────────────────────────────────────────────

export function getAvatarById(avatarId: string): AvatarDefinition | null {
  return AVATAR_LIBRARY.find(a => a.avatarId === avatarId) ?? null
}

export function getAvatarsByStyle(style: AvatarStyle): AvatarDefinition[] {
  return AVATAR_LIBRARY.filter(a => a.style === style)
}

export function getAllAvatars(): AvatarDefinition[] {
  return [...AVATAR_LIBRARY]
}
