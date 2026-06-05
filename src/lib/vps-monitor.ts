import { execFile } from 'child_process'
import os from 'os'
import { promisify } from 'util'
import { getQueueStatus } from '@/lib/job-queue'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

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
  const [runtime, queue, nginx, postgres, redis, qdrant, ffmpeg] = await Promise.all([
    getSystemRuntimeStatus(),
    getQueueStatus(),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'systemctl', process.platform === 'win32' ? ['node'] : ['is-active', 'nginx']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'systemctl', process.platform === 'win32' ? ['psql'] : ['is-active', 'postgresql']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'redis-cli', process.platform === 'win32' ? ['redis-cli'] : ['ping']),
    safeCommand(process.platform === 'win32' ? 'where.exe' : 'curl', process.platform === 'win32' ? ['curl'] : ['-fsS', 'http://127.0.0.1:6333/healthz']),
    safeCommand('ffmpeg', ['-version']),
  ])
  return {
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      uptimeSeconds: os.uptime(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      memory: {
        totalBytes: totalMemory,
        freeBytes: freeMemory,
        usedPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 1000) / 10,
      },
    },
    services: {
      node: runtime.services.find((service) => service.name === 'node'),
      nginx,
      postgres,
      redis,
      qdrant,
      ffmpeg,
    },
    queue,
    storage: runtime.storage,
    checkedAt: new Date().toISOString(),
  }
}
