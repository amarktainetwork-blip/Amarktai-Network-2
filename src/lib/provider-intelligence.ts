import { promises as fs } from 'fs'
import path from 'path'
import type { ProviderResultLogEntry } from '@/lib/provider-result-log'
import { resolveStoragePath } from '@/lib/storage-root'

const LOG_ROOT = process.env.PROVIDER_RESULT_LOG_ROOT || resolveStoragePath('logs/provider-results')

export interface ProviderScoreSummary {
  appSlug: string
  provider: string
  model: string
  capability: string
  total: number
  success: number
  failed: number
  successRate: number
  avgLatencyMs: number | null
  p95LatencyMs: number | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastArtifactPath: string | null
  score: number
  status: 'excellent' | 'good' | 'degraded' | 'failing' | 'unknown'
  recommendation: string
}

function safeSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'default'
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function percentile(values: number[], pct: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1)
  return sorted[index]
}

async function readJsonl(filePath: string): Promise<ProviderResultLogEntry[]> {
  if (!(await exists(filePath))) return []
  const raw = await fs.readFile(filePath, 'utf8')
  return raw.split('\n').filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line) as ProviderResultLogEntry]
    } catch {
      return []
    }
  })
}

export async function readProviderResults(params: {
  appSlug?: string
  provider?: string
  days?: number
} = {}): Promise<ProviderResultLogEntry[]> {
  const days = Math.max(1, Math.min(params.days ?? 14, 90))
  const appSlug = safeSegment(params.appSlug || 'amarktai-network')
  const root = path.join(LOG_ROOT, appSlug)
  if (!(await exists(root))) return []

  const providers = params.provider ? [safeSegment(params.provider)] : await fs.readdir(root).catch(() => [])
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
    return date.toISOString().slice(0, 10)
  })

  const entries: ProviderResultLogEntry[] = []
  for (const provider of providers) {
    for (const date of dates) {
      entries.push(...await readJsonl(path.join(root, provider, `${date}.jsonl`)))
    }
  }
  return entries
}

export function summarizeProviderResults(entries: ProviderResultLogEntry[]): ProviderScoreSummary[] {
  const groups = new Map<string, ProviderResultLogEntry[]>()
  for (const entry of entries) {
    const key = [entry.appSlug, entry.provider, entry.model, entry.capability].join('::')
    const existing = groups.get(key) ?? []
    existing.push(entry)
    groups.set(key, existing)
  }

  return [...groups.values()].map((items) => {
    const first = items[0]
    const total = items.length
    const success = items.filter((item) => item.success).length
    const failed = total - success
    const successRate = total ? success / total : 0
    const latencies = items.filter((item) => typeof item.latencyMs === 'number' && item.latencyMs >= 0).map((item) => item.latencyMs)
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null
    const p95LatencyMs = percentile(latencies, 95)
    const lastSuccess = [...items].reverse().find((item) => item.success)
    const lastFailure = [...items].reverse().find((item) => !item.success)
    const lastArtifact = [...items].reverse().find((item) => item.artifactPath)
    const latencyPenalty = avgLatencyMs === null ? 20 : Math.min(60, avgLatencyMs / 1000 * 5)
    const score = Math.max(0, Math.min(100, Math.round(successRate * 100 - latencyPenalty)))
    const status: ProviderScoreSummary['status'] = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 45 ? 'degraded' : total === 0 ? 'unknown' : 'failing'

    return {
      appSlug: first.appSlug,
      provider: first.provider,
      model: first.model,
      capability: first.capability,
      total,
      success,
      failed,
      successRate: Number(successRate.toFixed(3)),
      avgLatencyMs,
      p95LatencyMs,
      lastSuccessAt: lastSuccess?.timestamp ?? null,
      lastFailureAt: lastFailure?.timestamp ?? null,
      lastArtifactPath: lastArtifact?.artifactPath ?? null,
      score,
      status,
      recommendation: recommendation(status, avgLatencyMs, failed),
    }
  }).sort((a, b) => b.score - a.score)
}

function recommendation(status: ProviderScoreSummary['status'], avgLatencyMs: number | null, failed: number) {
  if (status === 'excellent') return 'Safe to prefer for this capability.'
  if (status === 'good') return 'Usable as primary or fallback.'
  if (status === 'degraded') return 'Use only as fallback until more tests pass.'
  if (failed > 0) return 'Avoid for automatic routing until failures are resolved.'
  if (avgLatencyMs === null) return 'No latency data yet. Run a capability test.'
  return 'Insufficient data.'
}

export async function getProviderScoreSummaries(params: { appSlug?: string; provider?: string; days?: number } = {}) {
  return summarizeProviderResults(await readProviderResults(params))
}

export async function shouldAvoidProvider(params: {
  appSlug?: string
  provider: string
  model?: string
  capability?: string
  days?: number
}) {
  const summaries = await getProviderScoreSummaries({ appSlug: params.appSlug, provider: params.provider, days: params.days ?? 14 })
  const matching = summaries.filter((summary) => {
    if (params.model && summary.model !== params.model) return false
    if (params.capability && summary.capability !== params.capability) return false
    return true
  })
  if (!matching.length) return { avoid: false, reason: 'No provider-result history yet.' }
  const worst = matching.sort((a, b) => a.score - b.score)[0]
  if (worst.score < 45 && worst.total >= 2) return { avoid: true, reason: `${params.provider} is ${worst.status} for ${worst.capability}; score ${worst.score}.` }
  return { avoid: false, reason: `${params.provider} score is acceptable from available history.` }
}
