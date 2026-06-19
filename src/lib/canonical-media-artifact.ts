import { createArtifact, type ArtifactRecord, type ArtifactType } from '@/lib/artifact-store'

type JsonRecord = Record<string, unknown>

export interface NormalizedMediaResult {
  mediaUrl: string | null
  base64: string | null
  mimeType: string | null
  jobId: string | null
  responseShapeKeys: string[]
}

export interface PersistMediaResultInput {
  result: unknown
  appSlug: string
  type: Extract<ArtifactType, 'image' | 'audio' | 'music' | 'video'>
  subType: string
  title: string
  description?: string
  provider: string
  model: string
  traceId?: string
  metadata?: JsonRecord
  executionId?: string
  jobId?: string
}

const URL_KEYS = [
  'storageUrl',
  'mediaUrl',
  'imageUrl',
  'audioUrl',
  'musicUrl',
  'videoUrl',
  'resultUrl',
  'outputUrl',
  'previewUrl',
  'downloadUrl',
  'playbackUrl',
  'assetUrl',
  'asset_url',
  'fileUrl',
  'file_url',
  'download_url',
  'preview_url',
  'video_url',
  'image_url',
  'audio_url',
  'music_url',
  'url',
]
const BASE64_KEYS = ['imageBase64', 'audioBase64', 'videoBase64', 'image_base64', 'audio_base64', 'video_base64', 'base64', 'b64_json', 'bytesBase64Encoded']
const JOB_KEYS = ['jobId', 'taskId', 'predictionId', 'providerJobId']

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function collectRecords(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 4) return []
  const record = asRecord(value)
  if (!record) {
    if (Array.isArray(value)) return value.flatMap((item) => collectRecords(item, depth + 1))
    return []
  }
  return [record, ...Object.values(record).flatMap((item) => collectRecords(item, depth + 1))]
}

function firstString(records: JsonRecord[], keys: string[]): string | null {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return null
}

function normalizeBase64(value: string | null): string | null {
  if (!value) return null
  const dataUri = value.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (dataUri) return dataUri[2]
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.replace(/\s/g, '').length >= 16) return value.replace(/\s/g, '')
  return null
}

export function normalizeMediaProviderResult(result: unknown): NormalizedMediaResult {
  const records = collectRecords(result)
  const rawBase64 = firstString(records, BASE64_KEYS)
  const dataUriMime = rawBase64?.match(/^data:([^;]+);base64,/)?.[1] ?? null
  const mimeType = firstString(records, ['mimeType', 'contentType', 'mediaType']) ?? dataUriMime
  return {
    mediaUrl: firstString(records, URL_KEYS),
    base64: normalizeBase64(rawBase64),
    mimeType,
    jobId: firstString(records, JOB_KEYS),
    responseShapeKeys: Array.from(new Set(records.flatMap((record) => Object.keys(record)))).sort(),
  }
}

export async function persistCanonicalMediaResult(input: PersistMediaResultInput): Promise<{
  success: boolean
  artifact: ArtifactRecord | null
  artifactId: string | null
  storagePath: string | null
  storageUrl: string | null
  mediaUrl: string | null
  provider: string
  model: string
  type: ArtifactType
  subType: string
  status: 'completed' | 'processing' | 'failed'
  jobId: string | null
  blocker: string | null
  responseShapeKeys: string[]
}> {
  const normalized = normalizeMediaProviderResult(input.result)
  if (!normalized.mediaUrl && !normalized.base64) {
    return {
      success: false,
      artifact: null,
      artifactId: null,
      storagePath: null,
      storageUrl: null,
      mediaUrl: null,
      provider: input.provider,
      model: input.model,
      type: input.type,
      subType: input.subType,
      status: normalized.jobId ? 'processing' : 'failed',
      jobId: normalized.jobId,
      blocker: normalized.jobId
        ? 'provider returned a job ID without completed media; provider polling must return a real media URL before success'
        : 'provider returned no usable media URL/base64/job output',
      responseShapeKeys: normalized.responseShapeKeys,
    }
  }

  const artifact = await createArtifact({
    appSlug: input.appSlug,
    executionId: input.executionId ?? (
      typeof input.metadata?.executionId === 'string' ? input.metadata.executionId : undefined
    ),
    jobId: input.jobId,
    type: input.type,
    subType: input.subType,
    title: input.title,
    description: input.description,
    provider: input.provider,
    model: input.model,
    traceId: input.traceId,
    content: normalized.base64 ?? undefined,
    contentUrl: normalized.mediaUrl ?? undefined,
    mimeType: normalized.mimeType ?? undefined,
    metadata: {
      ...(input.metadata ?? {}),
      providerResponseShapeKeys: normalized.responseShapeKeys,
      providerJobId: normalized.jobId,
      remoteMediaUrl: normalized.mediaUrl,
    },
  })

  return {
    success: true,
    artifact,
    artifactId: artifact.id,
    storagePath: artifact.storagePath,
    storageUrl: artifact.storageUrl,
    mediaUrl: artifact.storageUrl || normalized.mediaUrl,
    provider: input.provider,
    model: input.model,
    type: input.type,
    subType: input.subType,
    status: 'completed',
    jobId: normalized.jobId,
    blocker: null,
    responseShapeKeys: normalized.responseShapeKeys,
  }
}
