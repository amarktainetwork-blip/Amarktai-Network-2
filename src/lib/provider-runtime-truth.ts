/**
 * Shared server-side provider runtime truth.
 *
 * Single source of truth consumed by:
 *   - /api/admin/settings/status  (Settings page)
 *   - getDashboardRuntimeTruth()  (Runtime capability truth / System Monitoring)
 *
 * Rules:
 *   - DB keys take priority over env keys.
 *   - Env keys are fallback only.
 *   - Actual key values are never exposed.
 *   - A provider with a key but missing endpoint → blocker = 'requires_endpoint'.
 *   - A provider with no key → blocker = 'missing_key'.
 *   - Failed last test → lastTestStatus = 'failed' (not 'connected').
 *   - Local runtime tools (playwright, scrapy, trafilatura, ffmpeg) have no API key;
 *     their hasKey is always true but connected depends on the live test result.
 */

import { PROVIDER_MESH, type ProviderMeshId, type ProviderCapability } from '@/lib/provider-mesh'
import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

export type ProviderKeySource = 'db' | 'env' | 'none'
export type ProviderEndpointStatus = 'ok' | 'missing' | 'not_required' | 'failed'
export type ProviderLastTestStatus = 'passed' | 'failed' | 'not_tested'

export interface ProviderRuntimeTruthEntry {
  providerId: ProviderMeshId
  displayName: string
  kind: 'provider' | 'tool' | 'storage'
  hasKey: boolean
  keySource: ProviderKeySource
  endpointStatus: ProviderEndpointStatus
  lastTestStatus: ProviderLastTestStatus
  lastTestedAt: string | null
  capabilities: readonly ProviderCapability[]
  blocker: string
  /** true only when hasKey && lastTestStatus === 'passed' */
  connected: boolean
  /** true when hasKey is true (test may not have been run yet) */
  configured: boolean
  optional: boolean
}

/** Local runtime tools that have no API key — availability proven by live test only. */
const LOCAL_RUNTIME_IDS: ReadonlySet<ProviderMeshId> = new Set([
  'local-crawler', 'playwright', 'scrapy', 'trafilatura', 'ffmpeg',
])

/** Providers that require a separate endpoint URL in addition to an API key. */
const REQUIRES_ENDPOINT_IDS: ReadonlySet<ProviderMeshId> = new Set<ProviderMeshId>([
  'genx',
])

function resolveEndpointStatus(id: ProviderMeshId, hasKey: boolean): ProviderEndpointStatus {
  if (!REQUIRES_ENDPOINT_IDS.has(id)) return 'not_required'
  if (!hasKey) return 'missing'
  const url = process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? ''
  return url ? 'ok' : 'missing'
}

/** Determine key source without exposing the actual value. */
async function resolveKeySource(
  id: ProviderMeshId,
  rawKey: string | null,
): Promise<ProviderKeySource> {
  if (!rawKey) return 'none'
  const node = PROVIDER_MESH.find((n) => n.id === id)
  if (!node) return 'none'
  for (const envName of node.envAliases) {
    const envVal = process.env[envName]?.trim()
    if (envVal && envVal === rawKey) return 'env'
  }
  return 'db'
}

/** Trim a raw error/detail string to a short dashboard-safe message. */
function sanitizeDetail(raw: unknown, maxLen = 120): string {
  if (!raw || typeof raw !== 'string') return ''
  // Strip Python tracebacks — keep only the last meaningful line
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const errorLine = lines.findLast((l) => !l.startsWith('File ') && !l.startsWith('Traceback') && !l.startsWith('at ')) ?? lines[0] ?? ''
  return errorLine.slice(0, maxLen)
}

async function buildEntry(id: ProviderMeshId): Promise<ProviderRuntimeTruthEntry> {
  const node = PROVIDER_MESH.find((n) => n.id === id)!
  const isLocalRuntime = LOCAL_RUNTIME_IDS.has(id)
  const isStorage = id === 'storage'

  let hasKey = false
  let keySource: ProviderKeySource = 'none'

  if (isLocalRuntime) {
    // Local tools have no API key — treat as "key present" (availability checked via live test)
    hasKey = true
    keySource = 'env'
  } else if (isStorage) {
    const writable = checkWritable(LOCAL_STORE_FILES.artifacts).writable
    hasKey = writable
    keySource = writable ? 'env' : 'none'
  } else {
    const rawKey = await getMeshCredential(id)
    hasKey = Boolean(rawKey?.trim())
    keySource = await resolveKeySource(id, rawKey)
  }

  const notes = await getMeshTestNotes(id)
  const rawLastTest = notes.lastTestStatus
  const lastTestStatus: ProviderLastTestStatus =
    rawLastTest === 'passed' ? 'passed' :
    rawLastTest === 'failed' ? 'failed' :
    'not_tested'

  const lastTestedAt = typeof notes.lastTestedAt === 'string' ? notes.lastTestedAt : null
  const endpointStatus = resolveEndpointStatus(id, hasKey)

  // connected = key/runtime present AND last test passed
  const connected = hasKey && lastTestStatus === 'passed'
  const configured = hasKey

  let blocker = ''
  if (!hasKey) {
    if (node.envAliases.length > 0) {
      blocker = `missing_key: add ${node.envAliases.join(' or ')}`
    } else {
      blocker = 'missing_key: local runtime not available'
    }
  } else if (endpointStatus === 'missing') {
    blocker = 'requires_endpoint: set GENX_BASE_URL or GENX_API_URL'
  } else if (lastTestStatus === 'failed') {
    const raw = sanitizeDetail(notes.lastError) || sanitizeDetail(notes.detail)
    blocker = raw || 'last_test_failed'
    // For local-crawler: if detail mentions sub-component failures, show a clean summary
    if (isLocalRuntime && id === 'local-crawler') {
      blocker = buildLocalCrawlerBlocker(notes)
    }
  } else if (lastTestStatus === 'not_tested') {
    blocker = `run the ${node.displayName} live test`
  }

  return {
    providerId: id,
    displayName: node.displayName,
    kind: node.kind,
    hasKey,
    keySource,
    endpointStatus,
    lastTestStatus,
    lastTestedAt,
    capabilities: node.capabilities,
    blocker,
    connected,
    configured,
    optional: Boolean(node.optional),
  }
}

/** Build a short, deduplicated blocker message for local-crawler failures. */
function buildLocalCrawlerBlocker(notes: Record<string, unknown>): string {
  const detail = typeof notes.detail === 'string' ? notes.detail : ''
  const missing: string[] = []
  if (/scrapy/i.test(detail) && /not available|No module|cannot|error/i.test(detail)) missing.push('scrapy')
  if (/trafilatura/i.test(detail) && /not available|No module|cannot|error/i.test(detail)) missing.push('trafilatura')
  if (/playwright/i.test(detail) && /not available|No module|cannot|error/i.test(detail)) missing.push('playwright')
  if (missing.length > 0) {
    return `install_missing_python_packages: ${missing.join(', ')}`
  }
  return sanitizeDetail(notes.lastError as string | undefined) || 'install_missing_python_packages'
}

export async function getProviderRuntimeTruth(): Promise<ProviderRuntimeTruthEntry[]> {
  return Promise.all(PROVIDER_MESH.map((node) => buildEntry(node.id)))
}

export async function getProviderRuntimeTruthEntry(
  id: ProviderMeshId,
): Promise<ProviderRuntimeTruthEntry | null> {
  const node = PROVIDER_MESH.find((n) => n.id === id)
  if (!node) return null
  return buildEntry(id)
}
