import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { resolveStoragePath } from '@/lib/storage-root'

export interface MediaArtifactRecord {
  id: string
  appSlug: string
  provider: string
  model: string
  capability: string
  contentType: string
  filePath: string
  publicPath: string
  sizeBytes: number
  metadata: Record<string, unknown>
  createdAt: string
}

const ARTIFACT_ROOT = process.env.MEDIA_ARTIFACT_ROOT || resolveStoragePath('artifacts/media')
const PUBLIC_PREFIX = process.env.MEDIA_ARTIFACT_PUBLIC_PREFIX || '/generated-artifacts'

function safeSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'default'
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3'
  if (contentType.includes('wav')) return 'wav'
  if (contentType.includes('mp4')) return 'mp4'
  if (contentType.includes('json')) return 'json'
  return 'bin'
}

export async function saveMediaArtifact(params: {
  appSlug?: string
  provider: string
  model: string
  capability: string
  contentType: string
  bytes: ArrayBuffer | Buffer | Uint8Array
  metadata?: Record<string, unknown>
}): Promise<MediaArtifactRecord> {
  const appSlug = safeSegment(params.appSlug || 'amarktai-network')
  const provider = safeSegment(params.provider)
  const capability = safeSegment(params.capability)
  const date = new Date()
  const id = crypto.randomUUID()
  const ext = extensionForContentType(params.contentType)
  const dir = path.join(ARTIFACT_ROOT, appSlug, provider, capability, date.toISOString().slice(0, 10))
  await fs.mkdir(dir, { recursive: true })

  const filePath = path.join(dir, `${id}.${ext}`)
  const buffer = Buffer.isBuffer(params.bytes)
    ? params.bytes
    : params.bytes instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(params.bytes))
      : Buffer.from(params.bytes.buffer, params.bytes.byteOffset, params.bytes.byteLength)
  await fs.writeFile(filePath, buffer)

  const record: MediaArtifactRecord = {
    id,
    appSlug,
    provider: params.provider,
    model: params.model,
    capability: params.capability,
    contentType: params.contentType,
    filePath,
    publicPath: `${PUBLIC_PREFIX}/${appSlug}/${provider}/${capability}/${date.toISOString().slice(0, 10)}/${id}.${ext}`,
    sizeBytes: buffer.byteLength,
    metadata: params.metadata ?? {},
    createdAt: date.toISOString(),
  }

  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(record, null, 2))
  return record
}

export async function saveJsonArtifact(params: {
  appSlug?: string
  provider: string
  model: string
  capability: string
  json: unknown
  metadata?: Record<string, unknown>
}): Promise<MediaArtifactRecord> {
  return saveMediaArtifact({
    appSlug: params.appSlug,
    provider: params.provider,
    model: params.model,
    capability: params.capability,
    contentType: 'application/json',
    bytes: Buffer.from(JSON.stringify(params.json, null, 2)),
    metadata: params.metadata,
  })
}
