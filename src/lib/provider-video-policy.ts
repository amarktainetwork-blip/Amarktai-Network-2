export const PROVIDER_VIDEO_MIN_DURATION_SECONDS = 4
export const PROVIDER_VIDEO_MAX_DURATION_SECONDS = 8
export const PROVIDER_VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const

export type ProviderVideoAspectRatio = (typeof PROVIDER_VIDEO_ASPECT_RATIOS)[number]

export function normalizeProviderVideoDuration(value: unknown, fallback = PROVIDER_VIDEO_MAX_DURATION_SECONDS) {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(/[^0-9.]/g, ''))
      : fallback
  const rounded = Number.isFinite(numeric) ? Math.round(numeric) : fallback
  return Math.min(PROVIDER_VIDEO_MAX_DURATION_SECONDS, Math.max(PROVIDER_VIDEO_MIN_DURATION_SECONDS, rounded))
}

export function normalizeProviderVideoAspectRatio(value: unknown): ProviderVideoAspectRatio {
  return PROVIDER_VIDEO_ASPECT_RATIOS.includes(value as ProviderVideoAspectRatio)
    ? value as ProviderVideoAspectRatio
    : '16:9'
}

export function normalizeProviderVideoCount(value: unknown) {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : 1
  return Number.isFinite(numeric) && numeric > 0 ? 1 : 1
}

export function normalizeLongFormSceneDurations(targetDurationSeconds: number, requestedSceneCount?: number) {
  const target = Math.max(90, Math.round(targetDurationSeconds))
  const minScenes = Math.ceil(target / PROVIDER_VIDEO_MAX_DURATION_SECONDS)
  const maxScenes = Math.floor(target / PROVIDER_VIDEO_MIN_DURATION_SECONDS)
  let sceneCount = Math.max(minScenes, Math.round(requestedSceneCount ?? minScenes))
  sceneCount = Math.min(maxScenes, Math.max(minScenes, sceneCount))

  while (sceneCount > minScenes && Math.floor(target / sceneCount) < PROVIDER_VIDEO_MIN_DURATION_SECONDS) {
    sceneCount -= 1
  }
  while (Math.ceil(target / sceneCount) > PROVIDER_VIDEO_MAX_DURATION_SECONDS) {
    sceneCount += 1
  }

  const base = Math.floor(target / sceneCount)
  const remainder = target - (base * sceneCount)
  return Array.from({ length: sceneCount }, (_, index) => base + (index < remainder ? 1 : 0))
}
