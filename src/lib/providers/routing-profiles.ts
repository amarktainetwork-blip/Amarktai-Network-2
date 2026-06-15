import type {
  RoutingPreferences,
  RoutingProfile,
  RoutingProfileId,
} from './provider-types'

const weights = (
  quality: number,
  speed: number,
  cost: number,
  availability: number,
  health: number,
): RoutingProfile['weights'] => ({
  quality,
  speed,
  cost,
  availability,
  adult: 0.1,
  research: 0.1,
  streaming: 0.1,
  health,
  artifactSupport: 0.1,
})

export const ROUTING_PROFILES: Readonly<Record<RoutingProfileId, RoutingProfile>> = {
  cheap: {
    id: 'cheap',
    label: 'Cheap',
    weights: weights(0.08, 0.12, 0.34, 0.16, 0.2),
    preferences: { cost: 1 },
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    weights: weights(0.2, 0.16, 0.16, 0.14, 0.24),
    preferences: {},
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    weights: weights(0.34, 0.08, 0.04, 0.12, 0.32),
    preferences: { quality: 1 },
  },
  mixed: {
    id: 'mixed',
    label: 'Mixed',
    weights: weights(0.18, 0.18, 0.18, 0.16, 0.2),
    preferences: {},
  },
  best_available: {
    id: 'best_available',
    label: 'Best Available',
    weights: weights(0.22, 0.12, 0.02, 0.24, 0.3),
    preferences: {},
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    weights: weights(0.15, 0.15, 0.15, 0.15, 0.2),
    preferences: {},
  },
}

export function getRoutingProfile(
  id: RoutingProfileId,
  preferences: RoutingPreferences = {},
): RoutingProfile {
  const profile = ROUTING_PROFILES[id]
  const mergedPreferences = { ...profile.preferences, ...preferences }
  return {
    ...profile,
    weights: {
      ...profile.weights,
      quality: preferenceWeight(profile.weights.quality, mergedPreferences.quality),
      speed: preferenceWeight(profile.weights.speed, mergedPreferences.speed),
      cost: preferenceWeight(profile.weights.cost, mergedPreferences.cost),
      research: preferenceWeight(profile.weights.research, mergedPreferences.research),
    },
    preferences: mergedPreferences,
  }
}

function preferenceWeight(base: number, preference?: number): number {
  if (preference === undefined) return base
  return base + Math.max(0, Math.min(1, preference)) * 0.25
}
