import { prisma } from '@/lib/prisma'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export interface ProviderPerformanceSnapshot {
  providerId: string
  model: string
  capability: string
  successCount: number
  failureCount: number
  avgLatency: number
  lastSuccessAt: Date | null
  lastFailureAt: Date | null
  lastErrorCategory: string | null
}

const memoryFallback = new Map<string, ProviderPerformanceSnapshot>()

function key(providerId: string, model: string, capability: string) {
  return `${providerId}:${model}:${capability}`
}

async function updatePerformance(input: {
  providerId: ApprovedDirectProviderId
  model: string
  capability: string
  latencyMs: number
  success: boolean
  errorCategory?: string | null
}) {
  const existing = await getProviderPerformance(
    input.providerId,
    input.model,
    input.capability,
  )
  const total = existing.successCount + existing.failureCount
  const avgLatency = total === 0
    ? Math.max(0, input.latencyMs)
    : Math.round(((existing.avgLatency * total) + Math.max(0, input.latencyMs)) / (total + 1))
  const now = new Date()
  const snapshot: ProviderPerformanceSnapshot = {
    ...existing,
    successCount: existing.successCount + (input.success ? 1 : 0),
    failureCount: existing.failureCount + (input.success ? 0 : 1),
    avgLatency,
    lastSuccessAt: input.success ? now : existing.lastSuccessAt,
    lastFailureAt: input.success ? existing.lastFailureAt : now,
    lastErrorCategory: input.success ? null : input.errorCategory ?? 'unknown',
  }
  memoryFallback.set(key(input.providerId, input.model, input.capability), snapshot)
  await prisma.providerPerformance.upsert({
    where: {
      providerId_model_capability: {
        providerId: input.providerId,
        model: input.model,
        capability: input.capability,
      },
    },
    create: snapshot,
    update: {
      successCount: snapshot.successCount,
      failureCount: snapshot.failureCount,
      avgLatency: snapshot.avgLatency,
      lastSuccessAt: snapshot.lastSuccessAt,
      lastFailureAt: snapshot.lastFailureAt,
      lastErrorCategory: snapshot.lastErrorCategory,
    },
  }).catch(() => null)
  return snapshot
}

export function recordProviderSuccess(input: {
  providerId: ApprovedDirectProviderId
  model: string
  capability: string
  latencyMs: number
}) {
  return updatePerformance({ ...input, success: true })
}

export function recordProviderFailure(input: {
  providerId: ApprovedDirectProviderId
  model: string
  capability: string
  latencyMs: number
  errorCategory: string
}) {
  return updatePerformance({ ...input, success: false })
}

export async function getProviderPerformance(
  providerId: string,
  model: string,
  capability: string,
): Promise<ProviderPerformanceSnapshot> {
  const stored = await prisma.providerPerformance.findUnique({
    where: {
      providerId_model_capability: { providerId, model, capability },
    },
  }).catch(() => null)
  return stored ?? memoryFallback.get(key(providerId, model, capability)) ?? {
    providerId,
    model,
    capability,
    successCount: 0,
    failureCount: 0,
    avgLatency: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCategory: null,
  }
}

export async function rankProvidersForCapability<T extends {
  route: { provider: ApprovedDirectProviderId }
  model: string
  rank: number
}>(capability: string, candidates: T[]): Promise<T[]> {
  const scored = await Promise.all(candidates.map(async (candidate, index) => {
    const performance = await getProviderPerformance(
      candidate.route.provider,
      candidate.model,
      capability,
    )
    const attempts = performance.successCount + performance.failureCount
    const successRate = attempts ? performance.successCount / attempts : 0.5
    const recentFailurePenalty = performance.lastFailureAt
      && Date.now() - performance.lastFailureAt.getTime() < 30 * 60 * 1000
      ? 2_000
      : 0
    const score = candidate.rank
      + performance.failureCount * 300
      - performance.successCount * 100
      - successRate * 200
      + Math.min(performance.avgLatency / 100, 300)
      + recentFailurePenalty
      + index
    return { candidate, score }
  }))
  return scored.sort((left, right) => left.score - right.score).map((entry) => entry.candidate)
}

export function demoteProviderModelForCapability(input: {
  providerId: ApprovedDirectProviderId
  model: string
  capability: string
  errorCategory: string
  latencyMs?: number
}) {
  return recordProviderFailure({
    ...input,
    latencyMs: input.latencyMs ?? 0,
  })
}

export function clearProviderPerformanceMemory() {
  memoryFallback.clear()
}
