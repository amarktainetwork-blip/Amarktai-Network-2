import { promises as fs } from 'fs'
import path from 'path'
import type { MediaArtifactRecord } from '@/lib/media-artifacts'
import { resolveStoragePath } from '@/lib/storage-root'

const ARTIFACT_ROOT = process.env.MEDIA_ARTIFACT_ROOT || resolveStoragePath('artifacts/media')

function safeSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'default'
}

async function walk(dir: string, maxFiles: number, out: string[] = []): Promise<string[]> {
  if (out.length >= maxFiles) return out
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (out.length >= maxFiles) break
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, maxFiles, out)
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full)
  }
  return out
}

export async function listMediaArtifacts(params: {
  appSlug?: string
  provider?: string
  capability?: string
  limit?: number
} = {}): Promise<MediaArtifactRecord[]> {
  const appSlug = safeSegment(params.appSlug || 'amarktai-network')
  const root = path.join(
    ARTIFACT_ROOT,
    appSlug,
    ...(params.provider ? [safeSegment(params.provider)] : []),
    ...(params.capability ? [safeSegment(params.capability)] : []),
  )
  const limit = Math.max(1, Math.min(params.limit ?? 100, 500))
  const files = await walk(root, limit * 3)
  const records: MediaArtifactRecord[] = []

  for (const file of files) {
    if (records.length >= limit) break
    try {
      const json = JSON.parse(await fs.readFile(file, 'utf8')) as MediaArtifactRecord
      if (!json.id || !json.publicPath) continue
      records.push(json)
    } catch {
      // ignore invalid sidecar files
    }
  }

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
}
