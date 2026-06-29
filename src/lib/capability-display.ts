import type { CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'

export function getArtifactType(
  entry: Pick<CapabilityRuntimeTruthEntry, 'capabilityId'>,
  meta: { artifactType?: string | null },
) {
  if (meta.artifactType) return meta.artifactType
  const capabilityId = entry.capabilityId.toLowerCase()
  if (capabilityId.includes('image')) return 'image'
  if (capabilityId.includes('video')) return 'video'
  if (
    capabilityId.includes('audio') ||
    capabilityId.includes('tts') ||
    capabilityId.includes('music') ||
    capabilityId.includes('voice')
  ) return 'audio'
  if (capabilityId.includes('stt') || capabilityId.includes('transcription')) return 'transcript'
  return 'document'
}

export function getCapabilityRoute(
  entry: Pick<CapabilityRuntimeTruthEntry, 'executionRoute' | 'capabilityId'>,
  meta: { knownRoute?: string | null },
) {
  return entry.executionRoute ?? meta.knownRoute ?? 'Missing'
}
