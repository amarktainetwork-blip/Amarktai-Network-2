import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { verifyStorage } from '@/lib/storage-driver'

const execFileAsync = promisify(execFile)

export type LocalToolResult = {
  id: 'local-crawler' | 'playwright' | 'scrapy' | 'trafilatura' | 'ffmpeg' | 'ffprobe' | 'rhubarb' | 'storage'
  connected: boolean
  capabilities: string[]
  detail: string
  setupCommand?: string
}

export function setupCommandForLocalTool(id: LocalToolResult['id']): string {
  if (id === 'local-crawler') return 'sudo APP_ROOT=/var/www/amarktai PLATFORM_ROOT=/var/www/amarktai/platform bash scripts/install-open-source-stack.sh'
  if (id === 'playwright') return 'npx playwright install --with-deps chromium'
  if (id === 'scrapy' || id === 'trafilatura') {
    return 'python3 -m venv /var/www/amarktai/.venv && /var/www/amarktai/.venv/bin/pip install scrapy trafilatura && export AMARKTAI_PYTHON_BIN=/var/www/amarktai/.venv/bin/python'
  }
  if (id === 'ffmpeg' || id === 'ffprobe') return 'sudo apt-get install -y ffmpeg'
  if (id === 'rhubarb') {
    return 'Install Rhubarb Lip Sync for the VPS architecture, then set RHUBARB_PATH=/var/www/amarktai/tools/rhubarb/rhubarb or LIPSYNC_SERVICE_URL=http://127.0.0.1:<port>'
  }
  if (id === 'storage') return 'Ensure AMARKTAI_STORAGE_ROOT exists and is writable by the app user.'
  return 'See V1_COMPLETION_TRACKER.md.'
}

function pythonBinary() {
  const configured = process.env.AMARKTAI_PYTHON_BIN?.trim() || process.env.PYTHON_PATH?.trim()
  return configured || (process.platform === 'win32' ? 'python' : 'python3')
}

async function commandAvailable(command: string, args: string[]) {
  try {
    const result = await execFileAsync(command, args, { timeout: 8_000, windowsHide: true })
    const output = typeof result === 'string' ? result : `${result.stdout || result.stderr}`
    return { ok: true, output: output.trim().split(/\r?\n/)[0] || 'Available' }
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : 'Not available' }
  }
}

async function serviceAvailable(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return {
      ok: response.ok,
      output: response.ok ? `Lip-sync service responded HTTP ${response.status}.` : `Lip-sync service returned HTTP ${response.status}.`,
    }
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : 'Lip-sync service is not reachable.' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function testLocalTool(id: LocalToolResult['id']): Promise<LocalToolResult> {
  if (id === 'storage') {
    const storage = await verifyStorage()
    const detail = storage.ready
      ? `Artifact storage is writable at ${storage.root}.`
      : `Artifact storage is not ready at ${storage.root}: ${storage.error ?? storage.note}`
    return {
      id,
      connected: storage.ready,
      capabilities: ['storage'],
      detail,
      setupCommand: setupCommandForLocalTool(id),
    }
  }

  if (id === 'ffmpeg') {
    const binary = process.env.FFMPEG_PATH || 'ffmpeg'
    const result = await commandAvailable(binary, ['-version'])
    return {
      id,
      connected: result.ok,
      capabilities: ['video', 'audio'],
      detail: result.ok ? result.output : `FFMPEG_REQUIRED: install ffmpeg or set FFMPEG_PATH. Last error: ${result.output}`,
      setupCommand: setupCommandForLocalTool(id),
    }
  }

  if (id === 'ffprobe') {
    const binary = process.env.FFPROBE_PATH || 'ffprobe'
    const result = await commandAvailable(binary, ['-version'])
    return {
      id,
      connected: result.ok,
      capabilities: ['video_metadata'],
      detail: result.ok ? result.output : `FFPROBE_REQUIRED: install ffmpeg or set FFPROBE_PATH. Last error: ${result.output}`,
      setupCommand: setupCommandForLocalTool(id),
    }
  }

  if (id === 'rhubarb') {
    const serviceUrl = process.env.LIPSYNC_SERVICE_URL?.trim()
    if (serviceUrl) {
      const result = await serviceAvailable(serviceUrl)
      return {
        id,
        connected: result.ok,
        capabilities: ['lip_sync'],
        detail: result.ok ? result.output : `LIPSYNC_SERVICE_REQUIRED: LIPSYNC_SERVICE_URL is configured but not reachable. Last error: ${result.output}`,
        setupCommand: setupCommandForLocalTool(id),
      }
    }

    const binary = process.env.RHUBARB_PATH?.trim()
    if (!binary) {
      return {
        id,
        connected: false,
        capabilities: ['lip_sync'],
        detail: 'LIPSYNC_SERVICE_REQUIRED: set RHUBARB_PATH to the Rhubarb binary or LIPSYNC_SERVICE_URL to a reachable lip-sync service before proving talking_avatar_video.',
        setupCommand: setupCommandForLocalTool(id),
      }
    }

    const result = await commandAvailable(binary, ['--version'])
    return {
      id,
      connected: result.ok,
      capabilities: ['lip_sync'],
      detail: result.ok ? result.output : `LIPSYNC_SERVICE_REQUIRED: RHUBARB_PATH is configured but not executable. Last error: ${result.output}`,
      setupCommand: setupCommandForLocalTool(id),
    }
  }

  const checks = {
    playwright: () => commandAvailable(process.execPath, ['-e', 'require("playwright"); console.log("Playwright available")']),
    scrapy: () => commandAvailable(pythonBinary(), ['-c', 'import scrapy; print("Scrapy available")']),
    trafilatura: () => commandAvailable(pythonBinary(), ['-c', 'import trafilatura; print("Trafilatura available")']),
  }
  if (id === 'playwright' || id === 'scrapy' || id === 'trafilatura') {
    const result = await checks[id]()
    const detail = result.ok
      ? id === 'playwright'
        ? result.output
        : `${result.output} via ${pythonBinary()}`
      : `${id.toUpperCase()}_REQUIRED: ${setupCommandForLocalTool(id)}. Last error: ${result.output}`
    return {
      id,
      connected: result.ok,
      capabilities: id === 'playwright' ? ['crawl', 'render'] : ['crawl'],
      detail,
      setupCommand: setupCommandForLocalTool(id),
    }
  }

  const [playwright, scrapy, trafilatura] = await Promise.all([
    checks.playwright(),
    checks.scrapy(),
    checks.trafilatura(),
  ])
  const connected = playwright.ok && scrapy.ok && trafilatura.ok
  return {
    id,
    connected,
    capabilities: ['crawl', 'render'],
    detail: [playwright, scrapy, trafilatura].map((item) => item.output).join(' | '),
    setupCommand: setupCommandForLocalTool(id),
  }
}
