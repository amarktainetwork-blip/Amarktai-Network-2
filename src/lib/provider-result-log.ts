import { promises as fs } from 'fs'
import path from 'path'

export interface ProviderResultLogEntry {
  timestamp: string
  appSlug: string
  provider: string
  model: string
  capability: string
  success: boolean
  executed: boolean
  latencyMs: number
  contentType?: string
  artifactId?: string
  artifactPath?: string
  error?: string
  metadata?: Record<string, unknown>
}

const LOG_ROOT = process.env.PROVIDER_RESULT_LOG_ROOT || '/var/www/amarktai/repo/storage/provider-results'

function safeSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'default'
}

export async function recordProviderResult(entry: Omit<ProviderResultLogEntry, 'timestamp'>) {
  const timestamp = new Date().toISOString()
  const appSlug = safeSegment(entry.appSlug || 'amarktai-network')
  const provider = safeSegment(entry.provider)
  const day = timestamp.slice(0, 10)
  const dir = path.join(LOG_ROOT, appSlug, provider)
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, `${day}.jsonl`)
  const record: ProviderResultLogEntry = { ...entry, appSlug, provider, timestamp }
  await fs.appendFile(file, `${JSON.stringify(record)}\n`)
  return record
}
