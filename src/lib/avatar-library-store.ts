import {
  appendRecord,
  findRecord,
  listRecords,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'

export interface AvatarLibraryEntry {
  id: string
  avatarId: string
  appSlug: string
  library: string
  name: string
  artifactId: string
  artifactUrl: string
  thumbnailArtifactId: string
  thumbnailUrl: string
  provider: string
  model: string
  prompt: string
  persona: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function recordAvatarLibraryEntry(input: {
  avatarId?: string | null
  appSlug: string
  library?: string | null
  name: string
  artifactId: string
  artifactUrl: string
  thumbnailArtifactId?: string | null
  thumbnailUrl?: string | null
  provider: string
  model: string
  prompt: string
  persona?: string | null
  metadata?: Record<string, unknown>
}): AvatarLibraryEntry {
  const now = new Date().toISOString()
  const avatarId = input.avatarId || input.artifactId
  const existing = findRecord<AvatarLibraryEntry>(LOCAL_STORE_FILES.avatarLibrary, avatarId)
  const record: Omit<AvatarLibraryEntry, 'id'> = {
    avatarId,
    appSlug: input.appSlug,
    library: input.library || 'default',
    name: input.name,
    artifactId: input.artifactId,
    artifactUrl: input.artifactUrl,
    thumbnailArtifactId: input.thumbnailArtifactId || input.artifactId,
    thumbnailUrl: input.thumbnailUrl || input.artifactUrl,
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    persona: input.persona || input.prompt,
    metadata: input.metadata ?? {},
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  if (existing) {
    return updateRecord<AvatarLibraryEntry>(LOCAL_STORE_FILES.avatarLibrary, existing.id, record) ?? { ...record, id: existing.id }
  }
  return appendRecord<AvatarLibraryEntry>(LOCAL_STORE_FILES.avatarLibrary, { ...record, id: avatarId })
}

export function listAvatarLibraryEntries(appSlug?: string): AvatarLibraryEntry[] {
  return listRecords<AvatarLibraryEntry>(
    LOCAL_STORE_FILES.avatarLibrary,
    appSlug ? (entry) => entry.appSlug === appSlug : undefined,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
