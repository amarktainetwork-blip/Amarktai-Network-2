import { execFile } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { getQueueStatus } from '@/lib/job-queue'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'
import { getStorageRoot } from '@/lib/storage-driver'

const execFileAsync = promisify(execFile)

async function safeCommand(command: string, args: string[]) {
  try {
    const result = await execFileAsync(command, args, { timeout: 5_000, windowsHide: true, maxBuffer: 256_000 })
    return { available: true, output: String(result.stdout || result.stderr).trim().slice(0, 20_000) }
  } catch (error) {
    return { available: false, output: error instanceof Error ? error.message : 'Command unavailable' }
  }
}

export async function getVpsSnapshot() {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const cpuCount = os.cpus().length
  const cpuPercent = Math.min(100, Math.round((os.loadavg()[0] / Math.max(cpuCount, 1)) * 1000) / 10)
  const storageRoot = getStorageRoot()
  const [runtime, queue, nginx, mariadb, redis, qdrant, ffmpeg, pm2, disk, artifactBytes] = await Promise.all([
    getSystemRuntimeStatus(),
    getQueueStatus(),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'systemctl', process.platform === 'win32' ? ['node'] : ['is-active', 'nginx']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'systemctl', process.platform === 'win32' ? ['mariadb'] : ['is-active', 'mariadb']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'redis-cli', process.platform === 'win32' ? ['redis-cli'] : ['ping']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'curl', process.platform === 'win32' ? ['curl'] : ['-fsS', 'http://127.0.0.1:6333/healthz']),
    safeCommand('ffmpeg', ['-version']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'pm2', process.platform === 'win32' ? ['pm2'] : ['jlist']),
    diskUsage(storageRoot),
    directorySize(path.join(storageRoot, 'artifacts')),
  ])
  const ramPercent = Math.round(((totalMemory - freeMemory) / totalMemory) * 1000) / 10
  const thresholds = {
    cpuPercent: envThreshold('VPS_WARNING_CPU_PERCENT', 85),
    ramPercent: envThreshold('VPS_WARNING_RAM_PERCENT', 85),
    diskPercent: envThreshold('VPS_WARNING_DISK_PERCENT', 80),
  }
  const warnings = [
    cpuPercent >= thresholds.cpuPercent ? `CPU usage estimate is at or above ${thresholds.cpuPercent}%.` : null,
    ramPercent >= thresholds.ramPercent ? `RAM usage is at or above ${thresholds.ramPercent}%.` : null,
    disk.usedPercent >= thresholds.diskPercent ? `Disk usage is at or above ${thresholds.diskPercent}%.` : null,
  ].filter((warning): warning is string => Boolean(warning))
  return {
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      uptimeSeconds: os.uptime(),
      cpuCount,
      cpuPercent,
      loadAverage: os.loadavg(),
      memory: {
        totalBytes: totalMemory,
        freeBytes: freeMemory,
        usedPercent: ramPercent,
      },
      disk,
    },
    services: {
      node: runtime.services.find((service) => service.name === 'node'),
      pm2,
      nginx,
      mariadb,
      redis,
      qdrant,
      ffmpeg,
    },
    queue,
    storage: {
      ...runtime.storage,
      root: storageRoot,
      artifactBytes,
    },
    thresholds,
    warnings,
    upgradeRecommended: warnings.length > 0,
    checkedAt: new Date().toISOString(),
  }
}

function envThreshold(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : fallback
}

async function diskUsage(target: string) {
  try {
    const stats = await fs.statfs(target)
    const totalBytes = stats.blocks * stats.bsize
    const freeBytes = stats.bavail * stats.bsize
    const usedBytes = totalBytes - freeBytes
    return {
      available: true,
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
      error: null,
    }
  } catch (error) {
    return {
      available: false,
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usedPercent: 0,
      error: error instanceof Error ? error.message : 'Disk usage unavailable',
    }
  }
}

async function directorySize(root: string): Promise<number> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true })
    const sizes = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name)
      if (entry.isDirectory()) return directorySize(fullPath)
      if (!entry.isFile()) return 0
      return (await fs.stat(fullPath)).size
    }))
    return sizes.reduce((total, size) => total + size, 0)
  } catch {
    return 0
  }
}
