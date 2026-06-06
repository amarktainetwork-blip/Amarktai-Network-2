import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

const execFileAsync = promisify(execFile)

export type LocalToolResult = {
  id: 'local-crawler' | 'playwright' | 'scrapy' | 'trafilatura' | 'ffmpeg' | 'rhubarb' | 'storage'
  connected: boolean
  capabilities: string[]
  detail: string
}
async function commandAvailable(command: string, args: string[]) {
  try {
    const result = await execFileAsync(command, args, { timeout: 8_000, windowsHide: true })
    return { ok: true, output: `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] || 'Available' }
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : 'Not available' }
  }
}

export async function testLocalTool(id: LocalToolResult['id']): Promise<LocalToolResult> {
  if (id === 'storage') {
    const writable = checkWritable(LOCAL_STORE_FILES.artifacts)
    return {
      id,
      connected: writable.writable,
      capabilities: ['storage'],
      detail: writable.writable ? 'Artifact storage is writable.' : 'Artifact storage is not writable.',
    }
  }

  if (id === 'ffmpeg') {
    const binary = process.env.FFMPEG_PATH || 'ffmpeg'
    const result = await commandAvailable(binary, ['-version'])
    return { id, connected: result.ok, capabilities: ['video', 'audio'], detail: result.output }
  }

  if (id === 'rhubarb') {
    const binary = process.env.RHUBARB_PATH || 'rhubarb'
    const result = await commandAvailable(binary, ['--version'])
    return { id, connected: result.ok, capabilities: ['lip_sync'], detail: result.output }
  }

  const checks = {
    playwright: () => commandAvailable(process.execPath, ['-e', 'require("playwright"); console.log("Playwright available")']),
    scrapy: () => commandAvailable(process.env.PYTHON_PATH || 'python', ['-c', 'import scrapy; print("Scrapy available")']),
    trafilatura: () => commandAvailable(process.env.PYTHON_PATH || 'python', ['-c', 'import trafilatura; print("Trafilatura available")']),
  }
  if (id === 'playwright' || id === 'scrapy' || id === 'trafilatura') {
    const result = await checks[id]()
    return {
      id,
      connected: result.ok,
      capabilities: id === 'playwright' ? ['crawl', 'render'] : ['crawl'],
      detail: result.output,
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
    detail: [playwright, scrapy, trafilatura].map((item) => item.output).join(' · '),
  }
}
