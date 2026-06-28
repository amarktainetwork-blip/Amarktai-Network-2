import { createArtifact, type ArtifactRecord, type ArtifactType } from '@/lib/artifact-store'
import { getMeshCredential } from '@/lib/provider-mesh-status'

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
  'url',
]
const BASE64_KEYS = ['imageBase64', 'audioBase64', 'videoBase64', 'base64', 'b64_json', 'bytesBase64Encoded']
const JOB_KEYS = ['jobId', 'taskId', 'predictionId', 'providerJobId']
const TYPE_CONTENT_PREFIX: Record<Extract<ArtifactType, 'image' | 'audio' | 'music' | 'video'>, string> = {
  image: 'image/',
  audio: 'audio/',
  music: 'audio/',
  video: 'video/',
}
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

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

function mimeFromUrl(url: string): string | null {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? ''
    return MIME_BY_EXTENSION[ext] ?? null
  } catch {
    return null
  }
}

function isProviderUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host === 'query.genx.sh' || host.endsWith('.genx.sh')
  } catch {
    return false
  }
}

async function fetchRemoteMedia(input: {
  url: string
  provider: string
  type: Extract<ArtifactType, 'image' | 'audio' | 'music' | 'video'>
  fallbackMimeType?: string | null
}): Promise<{ content: Buffer; mimeType: string; sizeBytes: number }> {
  const headers: Record<string, string> = {}
  if (input.provider === 'genx' && isProviderUrl(input.url)) {
    const key = await getMeshCredential('genx')
    if (key) headers.Authorization = `Bearer ${key}`
  }
  const response = await fetch(input.url, {
    headers,
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    throw new Error(`remote media fetch failed with HTTP ${response.status}`)
  }
  const content = Buffer.from(await response.arrayBuffer())
  if (content.length === 0) throw new Error('remote media fetch returned an empty file')
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  const mimeType = contentType || input.fallbackMimeType || mimeFromUrl(input.url) || 'application/octet-stream'
  const expectedPrefix = TYPE_CONTENT_PREFIX[input.type]
  const toleratedGeneric = mimeType === 'application/octet-stream'
  if (!mimeType.startsWith(expectedPrefix) && !toleratedGeneric) {
    throw new Error(`provider returned ${mimeType}; expected ${expectedPrefix.slice(0, -1)} media`)
  }
  return { content, mimeType: toleratedGeneric ? input.fallbackMimeType || mimeFromUrl(input.url) || defaultMimeForType(input.type) : mimeType, sizeBytes: content.length }
}

function defaultMimeForType(type: Extract<ArtifactType, 'image' | 'audio' | 'music' | 'video'>) {
  if (type === 'image') return 'image/png'
  if (type === 'video') return 'video/mp4'
  return 'audio/mpeg'
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

  let content: Buffer | string | undefined = normalized.base64 ?? undefined
  let mimeType = normalized.mimeType ?? undefined
  let ingestedRemote: { originalProviderUrl: string; sizeBytes: number } | null = null
  if (!content && normalized.mediaUrl) {
    const fetched = await fetchRemoteMedia({
      url: normalized.mediaUrl,
      provider: input.provider,
      type: input.type,
      fallbackMimeType: normalized.mimeType,
    })
    content = fetched.content
    mimeType = fetched.mimeType
    ingestedRemote = {
      originalProviderUrl: normalized.mediaUrl,
      sizeBytes: fetched.sizeBytes,
    }
  }

  const artifact = await createArtifact({
    appSlug: input.appSlug,
    type: input.type,
    subType: input.subType,
    title: input.title,
    description: input.description,
    provider: input.provider,
    model: input.model,
    traceId: input.traceId,
    content,
    mimeType,
    metadata: {
      ...(input.metadata ?? {}),
      capability: input.metadata?.capability,
      providerResponseShapeKeys: normalized.responseShapeKeys,
      providerJobId: normalized.jobId,
      originalProviderUrl: ingestedRemote?.originalProviderUrl ?? normalized.mediaUrl,
      ingestedProviderBytes: Boolean(ingestedRemote),
      ingestedProviderSizeBytes: ingestedRemote?.sizeBytes ?? null,
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
