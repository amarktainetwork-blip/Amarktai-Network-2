/**
 * @module artifact-store
 * @description Unified Artifact System for the AmarktAI Network platform.
 *
 * Every generated output (image, audio, music, video, code, document) is
 * persisted as an Artifact with full metadata, storage references, and
 * download/preview capabilities.
 *
 * Phase 2: DB-backed artifact metadata with pluggable storage driver.
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'
import { getStorageDriver, verifyStorage, type StorageDriver } from '@/lib/storage-driver'
import { emitSystemEvent } from '@/lib/event-bus'

// ── Types ────────────────────────────────────────────────────────────────────

export const ARTIFACT_TYPES = [
  'text',
  'report',
  'image',
  'audio',
  'music',
  'video',
  'voice',
  'avatar',
  'repo_patch',
  'repo_diff',
  'app_blueprint',
  'deployment_plan',
  'research_result',
  'code',
  'document',
  'transcript',
] as const

export type ArtifactType = typeof ARTIFACT_TYPES[number]

export const ARTIFACT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'expired',
  'archived',
] as const

export type ArtifactStatus = typeof ARTIFACT_STATUSES[number]

export interface CreateArtifactInput {
  appSlug: string
  appId?: string
  executionId?: string
  jobId?: string
  workspaceId?: string
  type: ArtifactType
  subType?: string
  title?: string
  description?: string
  provider?: string
  model?: string
  capability?: string
  traceId?: string
  mimeType?: string
  costUsdCents?: number
  metadata?: Record<string, unknown>
  /** Raw content (Buffer, base64 string, or URL) — stored via storage driver */
  content?: Buffer | string
  /** If content is a URL, store the URL directly without uploading */
  contentUrl?: string
  /** Preserve a verified remote URL if downloading it is temporarily unavailable. */
  allowRemoteReference?: boolean
  status?: ArtifactStatus
  errorMessage?: string
}

const SECRET_KEY_PATTERN = /(api[-_]?key|authorization|bearer|token|secret|password|credential|cookie)/i
const SECRET_VALUE_PATTERN = /\b(sk|hf|ghp|gnxk|gsk|tg)[-_A-Za-z0-9]{8,}\b|Bearer\s+\S+/i
const LARGE_MEDIA_KEY_PATTERN = /(b64|base64|bytes|binary|imageBase64|audioBase64|videoBase64|b64_json|dataUri|rawMedia)/i
const LARGE_RESPONSE_KEY_PATTERN = /(rawResponse|providerResponse|fullResponse|responseBody|prompt|fullPrompt|negativePrompt|warning|error)/i

export const ARTIFACT_PERSISTENCE_FIELD_LIMITS = {
  title: 180,
  description: 180,
  provider: 180,
  model: 180,
  traceId: 180,
  errorMessage: 180,
  metadataString: 64_000,
  metadataValue: 4_000,
  metadataLargeValue: 2_000,
} as const

type ArtifactNormalizationState = {
  truncatedFields: string[]
}

export function sanitizeArtifactMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeArtifactMetadata(item))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && SECRET_VALUE_PATTERN.test(value)) return '[redacted]'
    return value
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeArtifactMetadata(item),
    ]),
  )
}

export function normalizeArtifactForPersistence(input: CreateArtifactInput): CreateArtifactInput & { metadataJson: string } {
  const state: ArtifactNormalizationState = { truncatedFields: [] }
  const metadata = {
    ...(input.metadata ?? {}),
    executionId: input.executionId ?? input.metadata?.executionId ?? null,
    jobId: input.jobId ?? input.metadata?.jobId ?? null,
    appId: input.appId ?? input.metadata?.appId ?? null,
    workspaceId: input.workspaceId ?? input.metadata?.workspaceId ?? input.metadata?.repoWorkspaceId ?? null,
    capability: input.capability ?? input.metadata?.capability ?? input.subType ?? input.type,
  }
  const metadataJson = stringifyBoundedMetadata(metadata, state)
  return {
    ...input,
    title: boundedText(input.title, ARTIFACT_PERSISTENCE_FIELD_LIMITS.title, 'title', state),
    description: boundedDescription(input.description, state),
    provider: boundedText(input.provider, ARTIFACT_PERSISTENCE_FIELD_LIMITS.provider, 'provider', state),
    model: boundedText(input.model, ARTIFACT_PERSISTENCE_FIELD_LIMITS.model, 'model', state),
    traceId: boundedText(input.traceId, ARTIFACT_PERSISTENCE_FIELD_LIMITS.traceId, 'traceId', state),
    errorMessage: boundedText(input.errorMessage, ARTIFACT_PERSISTENCE_FIELD_LIMITS.errorMessage, 'errorMessage', state),
    metadataJson,
  }
}

function boundedDescription(value: string | undefined, state: ArtifactNormalizationState): string {
  if (!value) return ''
  const trimmed = value.trim()
  const looksLikeBlob = trimmed.length > ARTIFACT_PERSISTENCE_FIELD_LIMITS.description
    && (/^[\[{]/.test(trimmed) || /^data:[^;]+;base64,/i.test(trimmed) || /^[A-Za-z0-9+/=\r\n]{512,}$/.test(trimmed))
  if (looksLikeBlob) {
    state.truncatedFields.push('description')
    return 'Generated artifact metadata is stored in bounded metadata.'
  }
  return boundedText(trimmed, ARTIFACT_PERSISTENCE_FIELD_LIMITS.description, 'description', state)
}

function boundedText(
  value: string | undefined,
  maxLength: number,
  field: string,
  state: ArtifactNormalizationState,
): string {
  if (!value) return ''
  const redacted = SECRET_VALUE_PATTERN.test(value) ? '[redacted]' : value
  if (redacted.length <= maxLength) return redacted
  state.truncatedFields.push(field)
  const suffix = '...[truncated]'
  return `${redacted.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`
}

function stringifyBoundedMetadata(
  metadata: Record<string, unknown>,
  state: ArtifactNormalizationState,
): string {
  const normalized = normalizeMetadataValue(metadata, state, 'metadata', 0)
  const withMarker = {
    ...(isPlainRecord(normalized) ? normalized : { value: normalized }),
    metadataTruncated: state.truncatedFields.length > 0,
    ...(state.truncatedFields.length > 0 ? { metadataTruncatedFields: [...new Set(state.truncatedFields)] } : {}),
  }
  let json = JSON.stringify(withMarker)
  if (json.length <= ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataString) return json

  state.truncatedFields.push('metadata')
  const preview = boundedText(json, 4_000, 'metadataPreview', state)
  json = JSON.stringify({
    metadataTruncated: true,
    metadataTruncatedFields: [...new Set(state.truncatedFields)],
    truncationReason: `metadata JSON exceeded ${ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataString} characters`,
    preview,
  })
  return json.length <= ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataString
    ? json
    : JSON.stringify({ metadataTruncated: true, truncationReason: 'metadata JSON exceeded persistence limit' })
}

function normalizeMetadataValue(
  value: unknown,
  state: ArtifactNormalizationState,
  path: string,
  depth: number,
): unknown {
  if (depth > 8) {
    state.truncatedFields.push(path)
    return '[truncated: max depth]'
  }
  if (typeof value === 'string') {
    if (SECRET_VALUE_PATTERN.test(value)) return '[redacted]'
    const max = LARGE_RESPONSE_KEY_PATTERN.test(path)
      ? ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataLargeValue
      : ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataValue
    if (LARGE_MEDIA_KEY_PATTERN.test(path) || /^data:[^;]+;base64,/i.test(value) || /^[A-Za-z0-9+/=\r\n]{8192,}$/.test(value)) {
      state.truncatedFields.push(path)
      return '[omitted: large media payload]'
    }
    return boundedText(value, max, path, state)
  }
  if (Array.isArray(value)) {
    const maxItems = 100
    if (value.length > maxItems) state.truncatedFields.push(path)
    return value.slice(0, maxItems).map((item, index) => normalizeMetadataValue(item, state, `${path}.${index}`, depth + 1))
  }
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const nextPath = `${path}.${key}`
      return [
        key,
        SECRET_KEY_PATTERN.test(key)
          ? '[redacted]'
          : normalizeMetadataValue(item, state, nextPath, depth + 1),
      ]
    }),
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value)
}

export interface ArtifactRecord {
  id: string
  executionId: string | null
  jobId: string | null
  appSlug: string
  appId: string | null
  workspaceId: string | null
  type: string
  subType: string
  title: string
  description: string
  summary: string
  provider: string
  model: string
  capability: string
  traceId: string
  storageDriver: string
  storagePath: string
  storageUrl: string
  downloadUrl: string
  previewUrl: string
  mimeType: string
  fileSize: number
  fileSizeBytes: number
  previewable: boolean
  downloadable: boolean
  status: string
  errorMessage: string
  costUsdCents: number
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ArtifactListOptions {
  appSlug?: string
  type?: ArtifactType
  status?: ArtifactStatus
  capability?: string
  executionId?: string
  jobId?: string
  limit?: number
  offset?: number
}

// ── MIME type inference ──────────────────────────────────────────────────────

const TYPE_MIME_MAP: Record<string, string> = {
  text: 'text/plain',
  report: 'application/json',
  image: 'image/png',
  audio: 'audio/mpeg',
  music: 'audio/mpeg',
  video: 'video/mp4',
  voice: 'audio/mpeg',
  avatar: 'video/mp4',
  repo_patch: 'text/x-diff',
  repo_diff: 'text/x-diff',
  app_blueprint: 'application/json',
  deployment_plan: 'application/json',
  research_result: 'application/json',
  code: 'text/plain',
  document: 'application/pdf',
  transcript: 'text/plain',
}

function inferMimeType(type: ArtifactType, subType?: string): string {
  if (subType === 'tts') return 'audio/mpeg'
  if (subType === 'stt') return 'text/plain'
  if (subType === 'cover_art') return 'image/png'
  return TYPE_MIME_MAP[type] ?? 'application/octet-stream'
}

function isPreviewable(type: ArtifactType): boolean {
  return [
    'text',
    'report',
    'image',
    'audio',
    'music',
    'video',
    'voice',
    'avatar',
    'repo_patch',
    'repo_diff',
    'app_blueprint',
    'deployment_plan',
    'research_result',
    'code',
    'document',
    'transcript',
  ].includes(type)
}

export function detectArtifactContent(
  input: Buffer,
  declaredMimeType = 'application/octet-stream',
): { content: Buffer; mimeType: string; extension: string } {
  const unwrapped = unwrapJsonMedia(input)
  const content = unwrapped ?? input
  const detected = detectBinaryMime(content)
  const mimeType = detected ?? (
    unwrapped ? 'application/octet-stream' : declaredMimeType
  )
  return {
    content,
    mimeType,
    extension: extensionForMime(mimeType),
  }
}

function detectBinaryMime(content: Buffer): string | null {
  if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return 'image/jpeg'
  if (content.length >= 12 && content.subarray(0, 4).toString('ascii') === 'RIFF') {
    const format = content.subarray(8, 12).toString('ascii')
    if (format === 'WEBP') return 'image/webp'
    if (format === 'WAVE') return 'audio/wav'
  }
  if (content.length >= 12 && content.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = content.subarray(8, 12).toString('ascii').toLowerCase()
    return brand.startsWith('m4a') ? 'audio/mp4' : 'video/mp4'
  }
  if (content.length >= 3 && content.subarray(0, 3).toString('ascii') === 'ID3') return 'audio/mpeg'
  if (content.length >= 2 && content[0] === 0xff && (content[1] & 0xe0) === 0xe0) return 'audio/mpeg'
  if (content.length >= 4 && content.subarray(0, 4).toString('ascii') === 'OggS') return 'audio/ogg'
  return null
}

function unwrapJsonMedia(content: Buffer): Buffer | null {
  const prefix = content.subarray(0, Math.min(content.length, 32)).toString('utf8').trimStart()
  if (!prefix.startsWith('{') && !prefix.startsWith('[')) return null
  try {
    const parsed = JSON.parse(content.toString('utf8'))
    const encoded = findMediaBase64(parsed)
    return encoded ? Buffer.from(encoded, 'base64') : null
  } catch {
    return null
  }
}

function findMediaBase64(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaBase64(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  for (const key of ['b64_json', 'base64', 'imageBase64', 'audioBase64', 'videoBase64', 'bytesBase64Encoded']) {
    const raw = record[key]
    if (typeof raw !== 'string') continue
    const encoded = raw.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) && encoded.length >= 16) return encoded
  }
  for (const nested of Object.values(record)) {
    const found = findMediaBase64(nested, depth + 1)
    if (found) return found
  }
  return null
}

function extensionForMime(mimeType: string): string {
  const normalized = mimeType.split(';')[0].trim().toLowerCase()
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'application/json': 'json',
    'text/plain': 'txt',
    'application/pdf': 'pdf',
  }
  return extensions[normalized] ?? 'bin'
}

function isPublicHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function fetchExternalArtifact(url: string): Promise<{ content: Buffer; mimeType?: string }> {
  if (!isPublicHttpsUrl(url)) {
    throw new Error('External artifact URLs must be public HTTPS URLs before they can be persisted.')
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) {
    throw new Error(`External artifact fetch failed with HTTP ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) {
    throw new Error('External artifact fetch returned an empty file.')
  }
  return { content: buf, mimeType: res.headers.get('content-type') ?? undefined }
}

// ── Core Operations ──────────────────────────────────────────────────────────

/**
 * Create a new artifact with optional content upload.
 */
export async function createArtifact(input: CreateArtifactInput): Promise<ArtifactRecord> {
  const normalized = normalizeArtifactForPersistence(input)
  const driver: StorageDriver = getStorageDriver()
  const storageHealth = await verifyStorage()
  if (!storageHealth.configured) {
    throw new Error(`Artifact storage is not ready: ${storageHealth.error ?? storageHealth.note}`)
  }
  let content = normalized.content
  let contentUrl = normalized.contentUrl ?? ''
  let mimeType = normalized.mimeType ?? inferMimeType(normalized.type, normalized.subType)

  if (!content && contentUrl.startsWith('http')) {
    try {
      const fetched = await fetchExternalArtifact(contentUrl)
      content = fetched.content
      mimeType = normalized.mimeType ?? fetched.mimeType ?? mimeType
      contentUrl = ''
    } catch (error) {
      if (!normalized.allowRemoteReference) throw error
    }
  }

  if ((normalized.status ?? 'completed') === 'completed' && !content && !contentUrl) {
    throw new Error('Completed artifacts require persisted content or a real content URL.')
  }

  let storagePath = ''
  let storageUrl = contentUrl
  let fileSizeBytes = 0

  // Upload content if provided
  if (content) {
    const source = typeof content === 'string'
      ? Buffer.from(content, 'base64')
      : content
    const detected = detectArtifactContent(source, mimeType)
    const buf = detected.content
    mimeType = detected.mimeType
    fileSizeBytes = buf.length
    const ext = detected.extension
    const key = `artifacts/${normalized.appSlug}/${normalized.type}/${Date.now()}.${ext}`
    const result = await driver.put(key, buf, mimeType)
    const exists = await driver.exists(result.path)
    if (!exists) throw new Error(`Artifact storage verification failed for ${result.path}`)
    storagePath = key
    storageUrl = result.url
  }

  const row = await prisma.artifact.create({
    data: {
      appSlug: normalized.appSlug,
      type: normalized.type,
      subType: normalized.subType ?? '',
      title: normalized.title ?? '',
      description: normalized.description ?? '',
      provider: normalized.provider ?? '',
      model: normalized.model ?? '',
      traceId: normalized.traceId ?? '',
      storageDriver: driver.name,
      storagePath,
      storageUrl,
      mimeType,
      fileSizeBytes,
      previewable: isPreviewable(normalized.type),
      downloadable: true,
      status: normalized.status ?? 'completed',
      errorMessage: normalized.errorMessage ?? '',
      costUsdCents: normalized.costUsdCents ?? 0,
      metadata: normalized.metadataJson,
    },
  })

  const artifact = toArtifactRecord(row)
  if (artifact.executionId && artifact.status === 'completed') {
    const { linkExecutionArtifact } = await import('@/lib/execution/artifact-linker')
    linkExecutionArtifact(artifact.executionId, {
      artifactId: artifact.id,
      type: artifact.type,
      url: artifact.downloadUrl,
    })
  }

  // Emit SSE event so the dashboard live feed shows new artifacts in real time
  emitSystemEvent('artifact_created', {
    id: artifact.id,
    type: artifact.type,
    appSlug: artifact.appSlug,
    title: artifact.title,
    provider: artifact.provider,
    model: artifact.model,
    traceId: artifact.traceId,
    storageUrl: artifact.storageUrl,
    timestamp: new Date().toISOString(),
  }, artifact.appSlug)

  return artifact
}

/**
 * Get a single artifact by ID.
 */
export async function getArtifact(id: string): Promise<ArtifactRecord | null> {
  const row = await prisma.artifact.findUnique({ where: { id } })
  return row ? enrichArtifactExecutionLink(toArtifactRecord(row)) : null
}

/**
 * List artifacts with optional filters.
 */
export async function listArtifacts(opts: ArtifactListOptions = {}): Promise<{
  artifacts: ArtifactRecord[]
  total: number
}> {
  const where: Record<string, unknown> = {}
  if (opts.appSlug) where.appSlug = opts.appSlug
  if (opts.type) where.type = opts.type
  if (opts.status) where.status = opts.status

  const needsMetadataFilter = Boolean(opts.capability || opts.executionId || opts.jobId)
  const rows = await prisma.artifact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: needsMetadataFilter ? 1000 : Math.min(opts.limit ?? 50, 200),
    skip: needsMetadataFilter ? 0 : opts.offset ?? 0,
  })
  const filtered = rows
    .map(toArtifactRecord)
    .filter((artifact) => artifactMatchesFilters(artifact, {
      appSlug: opts.appSlug,
      type: opts.type,
      status: opts.status,
    }))
  const enriched = await Promise.all(filtered.map(enrichArtifactExecutionLink))
  if (!needsMetadataFilter) {
    const total = await prisma.artifact.count({ where })
    return { artifacts: enriched, total }
  }
  const offset = opts.offset ?? 0
  const limit = Math.min(opts.limit ?? 50, 200)
  const metadataFiltered = enriched.filter((artifact) => artifactMatchesFilters(artifact, opts))
  return {
    artifacts: metadataFiltered.slice(offset, offset + limit),
    total: metadataFiltered.length,
  }
}

export function artifactMatchesFilters(
  artifact: ArtifactRecord,
  opts: Pick<ArtifactListOptions, 'appSlug' | 'type' | 'status' | 'capability' | 'executionId' | 'jobId'>,
): boolean {
  return (
    (!opts.appSlug || artifact.appSlug === opts.appSlug)
    && (!opts.type || artifact.type === opts.type)
    && (!opts.status || artifact.status === opts.status)
    && (!opts.capability || artifact.capability === opts.capability)
    && (!opts.executionId || artifact.executionId === opts.executionId)
    && (!opts.jobId || artifact.jobId === opts.jobId)
  )
}

/**
 * Get artifact counts grouped by type for a given app (or globally).
 */
export async function getArtifactCounts(appSlug?: string): Promise<Record<string, number>> {
  const where = appSlug ? { appSlug } : {}
  const groups = await prisma.artifact.groupBy({
    by: ['type'],
    where,
    _count: { id: true },
  })
  const result: Record<string, number> = {}
  for (const g of groups) {
    result[g.type] = g._count.id
  }
  return result
}

/**
 * Update artifact status (e.g. when video processing completes).
 */
export async function updateArtifactStatus(
  id: string,
  status: ArtifactStatus,
  extra?: { storageUrl?: string; errorMessage?: string; metadata?: Record<string, unknown> },
): Promise<ArtifactRecord | null> {
  try {
    const normalized = normalizeArtifactForPersistence({
      appSlug: '__status_update__',
      type: 'document',
      status,
      errorMessage: extra?.errorMessage,
      metadata: extra?.metadata,
    })
    const data: Record<string, unknown> = { status }
    if (extra?.storageUrl) data.storageUrl = extra.storageUrl
    if (extra?.errorMessage) data.errorMessage = normalized.errorMessage
    if (extra?.metadata) data.metadata = normalized.metadataJson
    const row = await prisma.artifact.update({ where: { id }, data })
    return toArtifactRecord(row)
  } catch {
    return null
  }
}

export async function archiveArtifact(id: string): Promise<ArtifactRecord | null> {
  const artifact = await getArtifact(id)
  if (!artifact || artifact.status === 'pending' || artifact.status === 'processing') return null
  return updateArtifactStatus(id, 'archived', {
    metadata: { ...artifact.metadata, archivedAt: new Date().toISOString() },
  })
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function toArtifactRecord(row: {
  id: string; appSlug: string; type: string; subType: string; title: string;
  description: string; provider: string; model: string; traceId: string;
  storageDriver: string; storagePath: string; storageUrl: string;
  mimeType: string; fileSizeBytes: number; previewable: boolean;
  downloadable: boolean; status: string; errorMessage: string;
  costUsdCents: number; metadata: string; createdAt: Date; updatedAt: Date;
}): ArtifactRecord {
  let metadata: Record<string, unknown> = {}
  try { metadata = JSON.parse(row.metadata) } catch { /* ignore */ }
  const executionId = stringMetadata(metadata, 'executionId')
  const jobId = stringMetadata(metadata, 'jobId') ?? stringMetadata(metadata, 'providerJobId')
  const workspaceId = stringMetadata(metadata, 'workspaceId') ?? stringMetadata(metadata, 'repoWorkspaceId')
  const appId = stringMetadata(metadata, 'appId')
  const capability = stringMetadata(metadata, 'capability') ?? row.subType ?? row.type
  const downloadUrl = `/api/admin/artifacts/${encodeURIComponent(row.id)}/download`
  return {
    ...row,
    executionId,
    jobId,
    appId,
    workspaceId,
    summary: row.description,
    capability,
    downloadUrl,
    previewUrl: row.previewable ? downloadUrl : '',
    fileSize: row.fileSizeBytes,
    metadata,
  }
}

function stringMetadata(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value : null
}

async function enrichArtifactExecutionLink(artifact: ArtifactRecord): Promise<ArtifactRecord> {
  if (artifact.executionId) return artifact
  const { listExecutions } = await import('@/lib/execution/execution-store')
  const execution = listExecutions({ limit: 1000 }).find((entry) =>
    entry.artifacts.some((link) => link.artifactId === artifact.id),
  )
  if (!execution) return artifact
  return {
    ...artifact,
    executionId: execution.executionId,
    jobId: artifact.jobId ?? execution.jobs[0]?.jobId ?? null,
  }
}
