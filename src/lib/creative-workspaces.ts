import {
  appendRecord,
  deleteRecord,
  findRecord,
  listRecords,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'

export interface CreativeProject {
  id: string
  name: string
  appSlug: string
  description: string
  brandKitId: string | null
  createdAt: string
  updatedAt: string
}

export interface BrandKit {
  id: string
  name: string
  appSlug: string
  logoUrl: string
  logoArtifactId: string | null
  primaryColor: string
  secondaryColor: string
  fontPreference: string
  toneOfVoice: string
  audience: string
  productNotes: string
  usageNotes: string
  createdAt: string
  updatedAt: string
}

export interface AvatarAsset {
  id: string
  name: string
  appSlug: string
  imageUrl: string
  videoUrl: string
  artifactId: string | null
  voicePersonaId: string | null
  description: string
  status: 'ready' | 'processing' | 'failed' | 'reference'
  jobId: string | null
  createdAt: string
  updatedAt: string
}

export function listCreativeProjects(appSlug?: string) {
  return newestFirst(listRecords<CreativeProject>(
    LOCAL_STORE_FILES.creativeProjects,
    appSlug ? (project) => project.appSlug === appSlug : undefined,
  ))
}

export function createCreativeProject(input: {
  name: string
  appSlug?: string
  description?: string
  brandKitId?: string | null
}) {
  const now = new Date().toISOString()
  return appendRecord<CreativeProject>(LOCAL_STORE_FILES.creativeProjects, {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    appSlug: input.appSlug?.trim() || 'amarktai-network',
    description: input.description?.trim() || '',
    brandKitId: input.brandKitId || null,
    createdAt: now,
    updatedAt: now,
  })
}

export function listBrandKits(appSlug?: string) {
  return newestFirst(listRecords<BrandKit>(
    LOCAL_STORE_FILES.brandKits,
    appSlug ? (kit) => kit.appSlug === appSlug : undefined,
  ))
}

export function getBrandKit(id?: string | null) {
  return id ? findRecord<BrandKit>(LOCAL_STORE_FILES.brandKits, id) : null
}

export function saveBrandKit(input: Partial<BrandKit> & { name: string; appSlug?: string }) {
  const now = new Date().toISOString()
  const values = {
    name: input.name.trim(),
    appSlug: input.appSlug?.trim() || 'amarktai-network',
    logoUrl: input.logoUrl?.trim() || '',
    logoArtifactId: input.logoArtifactId || null,
    primaryColor: validColor(input.primaryColor) ? input.primaryColor! : '#22d3ee',
    secondaryColor: validColor(input.secondaryColor) ? input.secondaryColor! : '#14b8a6',
    fontPreference: input.fontPreference?.trim() || 'Inter',
    toneOfVoice: input.toneOfVoice?.trim() || '',
    audience: input.audience?.trim() || '',
    productNotes: input.productNotes?.trim() || '',
    usageNotes: input.usageNotes?.trim() || '',
    updatedAt: now,
  }
  if (input.id) {
    const existing = findRecord<BrandKit>(LOCAL_STORE_FILES.brandKits, input.id)
    if (existing) return updateRecord<BrandKit>(LOCAL_STORE_FILES.brandKits, input.id, values)
  }
  return appendRecord<BrandKit>(LOCAL_STORE_FILES.brandKits, {
    id: crypto.randomUUID(),
    ...values,
    createdAt: now,
  })
}

export function deleteBrandKit(id: string) {
  return deleteRecord<BrandKit>(LOCAL_STORE_FILES.brandKits, id)
}

export function listAvatars(appSlug?: string) {
  return newestFirst(listRecords<AvatarAsset>(
    LOCAL_STORE_FILES.avatars,
    appSlug ? (avatar) => avatar.appSlug === appSlug : undefined,
  ))
}

export function saveAvatar(input: Partial<AvatarAsset> & { name: string; appSlug?: string }) {
  const now = new Date().toISOString()
  const values = {
    name: input.name.trim(),
    appSlug: input.appSlug?.trim() || 'amarktai-network',
    imageUrl: safeReference(input.imageUrl),
    videoUrl: safeReference(input.videoUrl),
    artifactId: input.artifactId || null,
    voicePersonaId: input.voicePersonaId || null,
    description: input.description?.trim() || '',
    status: input.status ?? 'reference',
    jobId: input.jobId || null,
    updatedAt: now,
  }
  if (input.id) {
    const existing = findRecord<AvatarAsset>(LOCAL_STORE_FILES.avatars, input.id)
    if (existing) return updateRecord<AvatarAsset>(LOCAL_STORE_FILES.avatars, input.id, values)
  }
  return appendRecord<AvatarAsset>(LOCAL_STORE_FILES.avatars, {
    id: crypto.randomUUID(),
    ...values,
    createdAt: now,
  })
}

export function deleteAvatar(id: string) {
  return deleteRecord<AvatarAsset>(LOCAL_STORE_FILES.avatars, id)
}

export function brandKitPrompt(kit: BrandKit | null): string {
  if (!kit) return ''
  return [
    `Brand: ${kit.name}`,
    kit.toneOfVoice ? `Voice: ${kit.toneOfVoice}` : '',
    kit.audience ? `Audience: ${kit.audience}` : '',
    kit.productNotes ? `Product context: ${kit.productNotes}` : '',
    kit.usageNotes ? `Usage rules: ${kit.usageNotes}` : '',
    `Brand colors: ${kit.primaryColor}, ${kit.secondaryColor}`,
  ].filter(Boolean).join('\n')
}

function newestFirst<T extends { createdAt: string }>(records: T[]) {
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function validColor(value?: string) {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value))
}

function safeReference(value?: string) {
  const trimmed = value?.trim() || ''
  return /^(https:\/\/|\/api\/admin\/artifacts\/)/.test(trimmed) ? trimmed : ''
}
