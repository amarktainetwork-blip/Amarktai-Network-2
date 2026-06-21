import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: mocks.execFile,
}))

import { setupCommandForLocalTool, testLocalTool } from '@/lib/local-tools'

const originalEnv = { ...process.env }

function succeedExec(stdout: string) {
  return (...args: unknown[]) => {
    const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void
    callback(null, stdout, '')
  }
}

function failExec(message: string) {
  return (...args: unknown[]) => {
    const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void
    callback(new Error(message), '', '')
  }
}

beforeEach(() => {
  process.env = { ...originalEnv }
  delete process.env.RHUBARB_PATH
  delete process.env.LIPSYNC_SERVICE_URL
  delete process.env.AMARKTAI_PYTHON_BIN
  delete process.env.PYTHON_PATH
  mocks.execFile.mockReset()
})

describe('local open-source tool readiness', () => {
  it('uses the canonical bash installer invocation for the VPS open-source stack', () => {
    expect(setupCommandForLocalTool('local-crawler')).toBe(
      'sudo APP_ROOT=/var/www/amarktai PLATFORM_ROOT=/var/www/amarktai/platform bash scripts/install-open-source-stack.sh',
    )
  })

  it('blocks Rhubarb truthfully until a binary path or lip-sync service is configured', async () => {
    const result = await testLocalTool('rhubarb')

    expect(result).toMatchObject({
      id: 'rhubarb',
      connected: false,
      capabilities: ['lip_sync'],
      setupCommand: setupCommandForLocalTool('rhubarb'),
    })
    expect(result.detail).toContain('LIPSYNC_SERVICE_REQUIRED')
    expect(result.detail).toContain('RHUBARB_PATH')
    expect(result.detail).toContain('LIPSYNC_SERVICE_URL')
    expect(mocks.execFile).not.toHaveBeenCalled()
  })

  it('uses RHUBARB_PATH when configured and reports executable proof', async () => {
    process.env.RHUBARB_PATH = '/opt/rhubarb/rhubarb'
    mocks.execFile.mockImplementation(succeedExec('Rhubarb Lip Sync 1.13.0\n'))

    const result = await testLocalTool('rhubarb')

    expect(mocks.execFile).toHaveBeenCalledWith('/opt/rhubarb/rhubarb', ['--version'], expect.any(Object), expect.any(Function))
    expect(result).toMatchObject({
      id: 'rhubarb',
      connected: true,
      detail: 'Rhubarb Lip Sync 1.13.0',
    })
  })

  it('uses AMARKTAI_PYTHON_BIN for crawler package proof', async () => {
    process.env.AMARKTAI_PYTHON_BIN = '/var/www/amarktai/.venv/bin/python'
    mocks.execFile.mockImplementation(succeedExec('Scrapy available\n'))

    const result = await testLocalTool('scrapy')

    expect(mocks.execFile).toHaveBeenCalledWith(
      '/var/www/amarktai/.venv/bin/python',
      ['-c', 'import scrapy; print("Scrapy available")'],
      expect.any(Object),
      expect.any(Function),
    )
    expect(result).toMatchObject({
      id: 'scrapy',
      connected: true,
      detail: 'Scrapy available',
    })
  })

  it('turns ffmpeg spawn failures into an actionable setup blocker', async () => {
    mocks.execFile.mockImplementation(failExec('spawn ffmpeg ENOENT'))

    const result = await testLocalTool('ffmpeg')

    expect(result.connected).toBe(false)
    expect(result.detail).toContain('FFMPEG_REQUIRED')
    expect(result.detail).toContain('install ffmpeg or set FFMPEG_PATH')
    expect(result.setupCommand).toBe('sudo apt-get install -y ffmpeg')
  })
})
