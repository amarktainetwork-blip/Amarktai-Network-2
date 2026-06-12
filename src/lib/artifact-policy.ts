import type { ArtifactRecord } from '@/lib/artifact-store'
import { loadAppSafetyConfigFromDB } from '@/lib/content-filter'

const ADULT_CAPABILITIES = new Set(['adult_text', 'adult_image', 'adult_video', 'adult_voice'])
const SUGGESTIVE_CAPABILITIES = new Set(['suggestive_image', 'suggestive_video'])

export function isPolicyRestrictedArtifact(artifact: ArtifactRecord): boolean {
  return ADULT_CAPABILITIES.has(artifact.capability)
    || SUGGESTIVE_CAPABILITIES.has(artifact.capability)
    || artifact.subType.startsWith('adult_')
    || artifact.subType.startsWith('suggestive_')
}

export async function canViewArtifactUnderAppPolicy(artifact: ArtifactRecord): Promise<boolean> {
  if (!isPolicyRestrictedArtifact(artifact)) return true
  const policy = await loadAppSafetyConfigFromDB(artifact.appSlug)
  if (ADULT_CAPABILITIES.has(artifact.capability) || artifact.subType.startsWith('adult_')) {
    return policy.adultMode && !policy.safeMode
  }
  return policy.suggestiveMode || (policy.adultMode && !policy.safeMode)
}

export async function filterArtifactsByAppPolicy(
  artifacts: ArtifactRecord[],
): Promise<ArtifactRecord[]> {
  const visibility = await Promise.all(artifacts.map(canViewArtifactUnderAppPolicy))
  return artifacts.filter((_, index) => visibility[index])
}
