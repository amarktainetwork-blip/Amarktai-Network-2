/**
 * @module vps-monitoring
 * @description VPS monitoring and production readiness checks for the AmarktAI Network.
 *
 * Collects: system/process uptime, memory, CPU, disk, DB connectivity,
 * Redis connectivity, Qdrant connectivity, artifact storage, queue depth,
 * publishing backlog, provider health for active providers only.
 *
 * Allowed providers: genx, huggingface, together, groq, mimo
 * Removed providers are never checked or returned.
 *
 * Does not fake healthy status when a required service fails.
 * Server-side only.
 */

import os from 'os'
import { recordExecutionSignal } from '@/lib/learning-engine'

// ── Thresholds ─────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  ram: { warning: 75, critical: 90 },
  disk: { warning: 75, critical: 90 },
  cpu: { warning: 75, critical: 90 },
  queue: { warning: 50, critical: 200 },
  providerFailureRate: { warning: 10, critical: 25 },
  dbLatencyMs: { warning: 500, critical: 2000 },
  publishingBacklog: { warning: 20, critical: 100 },
} as const

// ── Types ──────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface HealthCheck {
  name: string
  status: HealthStatus
  message: string
  value: number | string | null
  threshold: { warning?: number | string; critical?: number | string } | null
  checkedAt: string
  durationMs: number
  metadata: Record<string, unknown>
}

export interface ReadinessResult {
  status: HealthStatus
  checkedAt: string
  summary: string
  checks: HealthCheck[]
  alerts: string[]
  upgradeRecommended: boolean
  upgradeReasons: string[]
  blockingIssues: string[]
  warningIssues: string[]
}

// ── Active providers — never include removed providers ─────────────────────────

const ACTIVE_PROVIDERS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const
type ActiveProvider = (typeof ACTIVE_PROVIDERS)[number]

// ── Individual health checks ───────────────────────────────────────────────────

async function runCheck(name: string, fn: () => Promise<Omit<HealthCheck, 'name' | 'checkedAt' | 'durationMs'>>): Promise<HealthCheck> {
  const start = Date.now()
  const checkedAt = new Date().toISOString()
  try {
    const result = await fn()
    return { name, checkedAt, durationMs: Date.now() - start, ...result }
  } catch (err) {
    return {
      name, checkedAt, durationMs: Date.now() - start,
      status: 'critical',
      message: `Check failed: ${err instanceof Error ? err.message : String(err)}`,
      value: null, threshold: null, metadata: {},
    }
  }
}

// ── System uptime ─────────────────────────────────────────────────────────────

export async function checkSystemUptime(): Promise<HealthCheck> {
  return runCheck('system_uptime', async () => {
    const uptimeSeconds = os.uptime()
    const uptimeDays = Math.floor(uptimeSeconds / 86400)
    return {
      status: 'healthy' as HealthStatus,
      message: `System has been up for ${uptimeDays} day(s)`,
      value: uptimeSeconds,
      threshold: null,
      metadata: { uptimeDays, uptimeHours: Math.floor(uptimeSeconds / 3600) },
    }
  })
}

// ── Process uptime ────────────────────────────────────────────────────────────

export async function checkProcessUptime(): Promise<HealthCheck> {
  return runCheck('process_uptime', async () => {
    const uptimeSeconds = Math.floor(process.uptime())
    return {
      status: 'healthy' as HealthStatus,
      message: `Node process has been running for ${uptimeSeconds}s`,
      value: uptimeSeconds,
      threshold: null,
      metadata: { pid: process.pid, nodeVersion: process.version },
    }
  })
}

// ── Memory usage ──────────────────────────────────────────────────────────────

export async function checkMemoryUsage(): Promise<HealthCheck> {
  return runCheck('memory_usage', async () => {
    const memInfo = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const ramPct = Math.round((usedMem / totalMem) * 100)

    const status: HealthStatus = ramPct >= THRESHOLDS.ram.critical ? 'critical'
      : ramPct >= THRESHOLDS.ram.warning ? 'warning' : 'healthy'

    return {
      status,
      message: `RAM usage: ${ramPct}% (${Math.round(usedMem / 1024 / 1024)}MB / ${Math.round(totalMem / 1024 / 1024)}MB)`,
      value: ramPct,
      threshold: { warning: THRESHOLDS.ram.warning, critical: THRESHOLDS.ram.critical },
      metadata: {
        heapUsedMb: Math.round(memInfo.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memInfo.heapTotal / 1024 / 1024),
        rssMb: Math.round(memInfo.rss / 1024 / 1024),
        totalMb: Math.round(totalMem / 1024 / 1024),
        freeMb: Math.round(freeMem / 1024 / 1024),
        usedMb: Math.round(usedMem / 1024 / 1024),
      },
    }
  })
}

// ── CPU load ──────────────────────────────────────────────────────────────────

export async function checkCpuLoad(): Promise<HealthCheck> {
  return runCheck('cpu_load', async () => {
    const loadAvg = os.loadavg() // [1min, 5min, 15min]
    const cpuCount = os.cpus().length
    const load1min = loadAvg[0] ?? 0
    const loadPct = Math.round((load1min / cpuCount) * 100)

    const status: HealthStatus = loadPct >= THRESHOLDS.cpu.critical ? 'critical'
      : loadPct >= THRESHOLDS.cpu.warning ? 'warning' : 'healthy'

    return {
      status,
      message: `CPU load: ${loadPct}% (1min avg: ${load1min.toFixed(2)}, ${cpuCount} cores)`,
      value: loadPct,
      threshold: { warning: THRESHOLDS.cpu.warning, critical: THRESHOLDS.cpu.critical },
      metadata: { load1min: load1min.toFixed(2), load5min: (loadAvg[1] ?? 0).toFixed(2), load15min: (loadAvg[2] ?? 0).toFixed(2), cpuCount },
    }
  })
}

// ── Disk usage ────────────────────────────────────────────────────────────────

export async function checkDiskUsage(paths?: string[]): Promise<HealthCheck> {
  return runCheck('disk_usage', async () => {
    // Use statfs-style check via process.cwd() as proxy
    // On production Linux: would use df or statfs syscall
    // Here: approximate from process memory as placeholder when statfs unavailable
    try {
      const { execSync } = await import('child_process')
      const dfOutput = execSync('df -k .', { timeout: 5000 }).toString()
      const lines = dfOutput.trim().split('\n')
      const dataLine = lines[1] ?? ''
      const parts = dataLine.split(/\s+/)
      // df columns: Filesystem  1K-blocks  Used  Available  Use%  Mounted
      const usePctStr = parts[4] ?? '0%'
      const diskPct = parseInt(usePctStr.replace('%', ''), 10) || 0

      const status: HealthStatus = diskPct >= THRESHOLDS.disk.critical ? 'critical'
        : diskPct >= THRESHOLDS.disk.warning ? 'warning' : 'healthy'

      const totalKb = parseInt(parts[1] ?? '0', 10)
      const usedKb = parseInt(parts[2] ?? '0', 10)

      return {
        status,
        message: `Disk usage: ${diskPct}% (${Math.round(usedKb / 1024 / 1024)}GB / ${Math.round(totalKb / 1024 / 1024)}GB)`,
        value: diskPct,
        threshold: { warning: THRESHOLDS.disk.warning, critical: THRESHOLDS.disk.critical },
        metadata: { usedGb: Math.round(usedKb / 1024 / 1024), totalGb: Math.round(totalKb / 1024 / 1024), paths: paths ?? ['.'] },
      }
    } catch {
      // df not available (Windows dev env or restricted) — return unknown
      return {
        status: 'unknown' as HealthStatus,
        message: 'Disk usage check unavailable in this environment',
        value: null,
        threshold: { warning: THRESHOLDS.disk.warning, critical: THRESHOLDS.disk.critical },
        metadata: { note: 'df command not available' },
      }
    }
  })
}

// ── Database connectivity ──────────────────────────────────────────────────────

export async function checkDatabaseConnectivity(): Promise<HealthCheck> {
  return runCheck('database', async () => {
    const start = Date.now()
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      const latencyMs = Date.now() - start

      const status: HealthStatus = latencyMs >= THRESHOLDS.dbLatencyMs.critical ? 'critical'
        : latencyMs >= THRESHOLDS.dbLatencyMs.warning ? 'warning' : 'healthy'

      return {
        status,
        message: `Database responding in ${latencyMs}ms`,
        value: latencyMs,
        threshold: { warning: THRESHOLDS.dbLatencyMs.warning, critical: THRESHOLDS.dbLatencyMs.critical },
        metadata: { latencyMs },
      }
    } catch (err) {
      return {
        status: 'critical' as HealthStatus,
        message: `Database unavailable: ${err instanceof Error ? err.message : 'connection failed'}`,
        value: null,
        threshold: { warning: THRESHOLDS.dbLatencyMs.warning, critical: THRESHOLDS.dbLatencyMs.critical },
        metadata: { error: err instanceof Error ? err.message : String(err) },
      }
    }
  })
}

// ── Redis connectivity ────────────────────────────────────────────────────────

export async function checkRedisConnectivity(): Promise<HealthCheck> {
  return runCheck('redis', async () => {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      return {
        status: 'unknown' as HealthStatus,
        message: 'Redis not configured (REDIS_URL not set)',
        value: 'not_configured',
        threshold: null,
        metadata: { configured: false },
      }
    }

    try {
      const { getRedisClient } = await import('@/lib/redis')
      const client = getRedisClient()
      if (!client) {
        return {
          status: 'critical' as HealthStatus,
          message: 'Redis client not available despite REDIS_URL being set',
          value: null, threshold: null, metadata: { configured: true },
        }
      }
      const start = Date.now()
      await client.ping()
      const latencyMs = Date.now() - start
      return {
        status: 'healthy' as HealthStatus,
        message: `Redis responding in ${latencyMs}ms`,
        value: latencyMs, threshold: null, metadata: { latencyMs },
      }
    } catch (err) {
      return {
        status: 'critical' as HealthStatus,
        message: `Redis unavailable: ${err instanceof Error ? err.message : 'connection failed'}`,
        value: null, threshold: null, metadata: { error: err instanceof Error ? err.message : String(err) },
      }
    }
  })
}

// ── Qdrant connectivity ───────────────────────────────────────────────────────

export async function checkQdrantConnectivity(): Promise<HealthCheck> {
  return runCheck('qdrant', async () => {
    const qdrantUrl = process.env.QDRANT_URL
    if (!qdrantUrl) {
      return {
        status: 'unknown' as HealthStatus,
        message: 'Qdrant not configured (QDRANT_URL not set)',
        value: 'not_configured', threshold: null, metadata: { configured: false },
      }
    }

    try {
      const { isQdrantHealthy } = await import('@/lib/vector-store')
      const healthy = await isQdrantHealthy()
      return {
        status: healthy ? 'healthy' : 'critical' as HealthStatus,
        message: healthy ? 'Qdrant connected' : 'Qdrant unavailable',
        value: healthy ? 1 : 0, threshold: null, metadata: { configured: true },
      }
    } catch (err) {
      return {
        status: 'critical' as HealthStatus,
        message: `Qdrant check failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        value: null, threshold: null, metadata: {},
      }
    }
  })
}

// ── Artifact storage ──────────────────────────────────────────────────────────

export async function checkArtifactStorage(): Promise<HealthCheck> {
  return runCheck('artifact_storage', async () => {
    try {
      const path = await import('path')
      const fs = await import('fs/promises')
      const dir = process.env.ARTIFACT_STORAGE_PATH
        ?? path.join(process.cwd(), 'storage', 'artifacts')

      try {
        await fs.access(dir)
        // Try writing a small probe file
        const probe = path.join(dir, '.health_probe')
        await fs.writeFile(probe, Date.now().toString())
        await fs.unlink(probe)
        return {
          status: 'healthy' as HealthStatus,
          message: `Artifact storage writable: ${dir}`,
          value: 1, threshold: null, metadata: { path: dir },
        }
      } catch {
        // Try to create directory
        try {
          await fs.mkdir(dir, { recursive: true })
          return {
            status: 'warning' as HealthStatus,
            message: `Artifact storage directory created: ${dir}`,
            value: 0, threshold: null, metadata: { path: dir, created: true },
          }
        } catch (mkErr) {
          return {
            status: 'critical' as HealthStatus,
            message: `Artifact storage unavailable: ${mkErr instanceof Error ? mkErr.message : 'cannot access or create'}`,
            value: null, threshold: null, metadata: { path: dir },
          }
        }
      }
    } catch (err) {
      return {
        status: 'critical' as HealthStatus,
        message: `Artifact storage check failed: ${err instanceof Error ? err.message : String(err)}`,
        value: null, threshold: null, metadata: {},
      }
    }
  })
}

// ── Queue depth ───────────────────────────────────────────────────────────────

export async function checkQueueDepth(): Promise<HealthCheck> {
  return runCheck('queue_depth', async () => {
    try {
      const { getRedisClient } = await import('@/lib/redis')
      const client = getRedisClient()
      if (!client) {
        return {
          status: 'unknown' as HealthStatus,
          message: 'Queue depth check requires Redis (not configured)',
          value: null, threshold: null, metadata: {},
        }
      }
      // BullMQ queues typically stored as sorted sets with prefix 'bull:'
      const keys = await client.keys('bull:*:wait')
      let total = 0
      for (const key of keys.slice(0, 10)) {
        const len = await client.llen(key)
        total += len
      }
      const status: HealthStatus = total >= THRESHOLDS.queue.critical ? 'critical'
        : total >= THRESHOLDS.queue.warning ? 'warning' : 'healthy'
      return {
        status,
        message: `Queue depth: ${total} pending jobs`,
        value: total,
        threshold: { warning: THRESHOLDS.queue.warning, critical: THRESHOLDS.queue.critical },
        metadata: { queuesChecked: keys.length },
      }
    } catch {
      return {
        status: 'unknown' as HealthStatus,
        message: 'Queue depth check unavailable',
        value: null,
        threshold: { warning: THRESHOLDS.queue.warning, critical: THRESHOLDS.queue.critical },
        metadata: {},
      }
    }
  })
}

// ── Publishing backlog ────────────────────────────────────────────────────────

export async function checkPublishingBacklog(): Promise<HealthCheck> {
  return runCheck('publishing_backlog', async () => {
    try {
      const { prisma } = await import('@/lib/prisma')
      const backlog = await prisma.publishingSchedule.count({
        where: { status: { in: ['scheduled', 'retrying', 'blocked_approval_required'] } },
      })
      const failed = await prisma.publishingSchedule.count({ where: { status: 'failed' } })

      const status: HealthStatus = backlog >= THRESHOLDS.publishingBacklog.critical ? 'critical'
        : backlog >= THRESHOLDS.publishingBacklog.warning ? 'warning' : 'healthy'

      return {
        status,
        message: `Publishing backlog: ${backlog} pending, ${failed} failed`,
        value: backlog,
        threshold: { warning: THRESHOLDS.publishingBacklog.warning, critical: THRESHOLDS.publishingBacklog.critical },
        metadata: { pending: backlog, failed },
      }
    } catch {
      return {
        status: 'unknown' as HealthStatus,
        message: 'Publishing backlog check unavailable',
        value: null,
        threshold: { warning: THRESHOLDS.publishingBacklog.warning, critical: THRESHOLDS.publishingBacklog.critical },
        metadata: {},
      }
    }
  })
}

// ── Provider health ───────────────────────────────────────────────────────────

export async function checkProviderHealth(): Promise<HealthCheck> {
  return runCheck('provider_health', async () => {
    try {
      const { getProviderPerformance } = await import('@/lib/learning-engine')
      const performances = await getProviderPerformance()

      // Only check active providers — never removed providers
      const activePerf = performances.filter(p => ACTIVE_PROVIDERS.includes(p.providerKey as ActiveProvider))

      const providerSummary: Record<string, { successRate: number; failureCount: number; status: HealthStatus }> = {}
      let worstFailurePct = 0
      let overallStatus: HealthStatus = 'healthy'

      for (const perf of activePerf) {
        const failurePct = perf.totalRequests > 0 ? Math.round((perf.failureCount / perf.totalRequests) * 100) : 0
        const provStatus: HealthStatus = failurePct >= THRESHOLDS.providerFailureRate.critical ? 'critical'
          : failurePct >= THRESHOLDS.providerFailureRate.warning ? 'warning' : 'healthy'

        providerSummary[perf.providerKey] = {
          successRate: Math.round(perf.successRate * 100),
          failureCount: perf.failureCount,
          status: provStatus,
        }

        if (failurePct > worstFailurePct) worstFailurePct = failurePct
        if (provStatus === 'critical') overallStatus = 'critical'
        else if (provStatus === 'warning' && overallStatus !== 'critical') overallStatus = 'warning'
      }

      // Check unconfigured providers
      const unconfigured: string[] = []
      for (const provider of ACTIVE_PROVIDERS) {
        if (!activePerf.some(p => p.providerKey === provider)) {
          unconfigured.push(provider)
        }
      }

      return {
        status: overallStatus,
        message: `Provider health: ${activePerf.length} active, ${unconfigured.length} unconfigured. Worst failure rate: ${worstFailurePct}%`,
        value: worstFailurePct,
        threshold: { warning: THRESHOLDS.providerFailureRate.warning, critical: THRESHOLDS.providerFailureRate.critical },
        metadata: { providers: providerSummary, unconfigured },
      }
    } catch {
      return {
        status: 'unknown' as HealthStatus,
        message: 'Provider health check unavailable',
        value: null,
        threshold: { warning: THRESHOLDS.providerFailureRate.warning, critical: THRESHOLDS.providerFailureRate.critical },
        metadata: {},
      }
    }
  })
}

// ── Snapshot persistence ──────────────────────────────────────────────────────

async function persistSnapshot(
  result: ReadinessResult,
  memCheck: HealthCheck,
  cpuCheck: HealthCheck,
  diskCheck: HealthCheck,
): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma')
    // Use product id = 0 (system-level snapshot not tied to a product)
    // Check if a system product exists; if not, skip silently
    const systemProduct = await prisma.product.findFirst({ where: { slug: '__system__' }, select: { id: true } })
    if (!systemProduct) return false

    await prisma.vpsResourceSnapshot.create({
      data: {
        productId: systemProduct.id,
        cpuPercent: typeof cpuCheck.value === 'number' ? cpuCheck.value : 0,
        ramPercent: typeof memCheck.value === 'number' ? memCheck.value : 0,
        ramUsedMb: (memCheck.metadata.usedMb as number) ?? 0,
        ramTotalMb: (memCheck.metadata.totalMb as number) ?? 0,
        diskPercent: typeof diskCheck.value === 'number' ? diskCheck.value : 0,
        diskUsedGb: (diskCheck.metadata.usedGb as number) ?? 0,
        diskTotalGb: (diskCheck.metadata.totalGb as number) ?? 0,
        netInKbps: 0,
        netOutKbps: 0,
      },
    })
    return true
  } catch {
    return false
  }
}

// ── Learning signals ──────────────────────────────────────────────────────────

async function recordMonitoringSignal(result: ReadinessResult): Promise<void> {
  if (result.status === 'critical' || result.upgradeRecommended) {
    await recordExecutionSignal({
      appSlug: '__system__',
      capability: 'vps_readiness',
      providerKey: 'runtime',
      model: 'monitoring',
      success: result.status === 'healthy',
      latencyMs: 0,
      fallbackUsed: false,
    }).catch(() => { /* non-fatal */ })
  }
}

// ── Full readiness check ──────────────────────────────────────────────────────

export async function runReadinessCheck(): Promise<ReadinessResult> {
  const checkedAt = new Date().toISOString()

  const [
    uptime, processUptime, memory, cpu, disk,
    database, redis, qdrant, artifactStorage,
    queue, publishingBacklog, providerHealth,
  ] = await Promise.all([
    checkSystemUptime(),
    checkProcessUptime(),
    checkMemoryUsage(),
    checkCpuLoad(),
    checkDiskUsage(),
    checkDatabaseConnectivity(),
    checkRedisConnectivity(),
    checkQdrantConnectivity(),
    checkArtifactStorage(),
    checkQueueDepth(),
    checkPublishingBacklog(),
    checkProviderHealth(),
  ])

  const checks = [
    uptime, processUptime, memory, cpu, disk,
    database, redis, qdrant, artifactStorage,
    queue, publishingBacklog, providerHealth,
  ]

  const alerts: string[] = []
  const blockingIssues: string[] = []
  const warningIssues: string[] = []
  const upgradeReasons: string[] = []

  // Evaluate each check
  for (const check of checks) {
    if (check.status === 'critical') alerts.push(`CRITICAL: ${check.name} — ${check.message}`)
    else if (check.status === 'warning') alerts.push(`WARNING: ${check.name} — ${check.message}`)
  }

  // Blocking issues (critical + misconfigured required services)
  if (database.status === 'critical') blockingIssues.push('Database unavailable')
  if (artifactStorage.status === 'critical') blockingIssues.push('Artifact storage unavailable')

  // Redis: only blocking if REDIS_URL is configured
  if (process.env.REDIS_URL && redis.status === 'critical') blockingIssues.push('Redis unavailable (configured but unreachable)')

  // Qdrant: only blocking if QDRANT_URL is configured
  if (process.env.QDRANT_URL && qdrant.status === 'critical') blockingIssues.push('Qdrant unavailable (configured but unreachable)')

  // Warning issues
  if (memory.status === 'warning') warningIssues.push(`RAM usage at ${memory.value}%`)
  if (cpu.status === 'warning') warningIssues.push(`CPU load at ${cpu.value}%`)
  if (disk.status === 'warning') warningIssues.push(`Disk usage at ${disk.value}%`)
  if (providerHealth.status === 'warning') warningIssues.push(`Provider failure rate elevated (${providerHealth.value}%)`)
  if (publishingBacklog.status === 'warning') warningIssues.push(`Publishing backlog: ${publishingBacklog.value} items`)
  if (queue.status === 'warning') warningIssues.push(`Queue depth: ${queue.value} jobs`)

  // Upgrade recommendation triggers
  if (memory.status === 'critical') upgradeReasons.push('RAM usage critical')
  if (disk.status === 'critical') upgradeReasons.push('Disk usage critical')
  if (cpu.status === 'critical') upgradeReasons.push('CPU load critical')
  if (queue.status === 'critical') upgradeReasons.push('Queue depth critical')
  if (database.status === 'critical') upgradeReasons.push('Database unavailable')
  if (artifactStorage.status === 'critical') upgradeReasons.push('Artifact storage unavailable')
  if (process.env.QDRANT_URL && qdrant.status === 'critical') upgradeReasons.push('Qdrant unavailable')
  if (process.env.REDIS_URL && redis.status === 'critical') upgradeReasons.push('Redis unavailable')
  if (providerHealth.status === 'critical') upgradeReasons.push('Provider failure rate critical')
  if (publishingBacklog.status === 'critical') upgradeReasons.push('Publishing backlog critical')

  const upgradeRecommended = upgradeReasons.length > 0

  // Overall status
  const hasCritical = checks.some(c => c.status === 'critical')
  const hasWarning = checks.some(c => c.status === 'warning')
  const overallStatus: HealthStatus = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy'

  const summary = blockingIssues.length > 0
    ? `${blockingIssues.length} blocking issue(s): ${blockingIssues[0]}`
    : upgradeRecommended
    ? `Upgrade recommended: ${upgradeReasons[0]}`
    : warningIssues.length > 0
    ? `${warningIssues.length} warning(s): ${warningIssues[0]}`
    : 'All systems operational'

  const result: ReadinessResult = {
    status: overallStatus,
    checkedAt,
    summary,
    checks,
    alerts,
    upgradeRecommended,
    upgradeReasons,
    blockingIssues,
    warningIssues,
  }

  // Persist snapshot (non-blocking)
  await persistSnapshot(result, memory, cpu, disk).catch(() => {})

  // Record learning signal when critical
  await recordMonitoringSignal(result)

  return result
}
