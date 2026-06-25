import fs from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeMediaProviderResult } from '@/lib/canonical-media-artifact'
import { sanitizeArtifactMetadata } from '@/lib/artifact-store'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('canonical media artifact pipeline', () => {
  it('normalizes URL and base64 provider responses', () => {
    expect(normalizeMediaProviderResult({ output: { imageUrl: 'https://cdn.example/image.png' } }).mediaUrl)
      .toBe('https://cdn.example/image.png')
    expect(normalizeMediaProviderResult({ data: [{ b64_json: Buffer.from('real image bytes').toString('base64') }] }).base64)
      .toBe(Buffer.from('real image bytes').toString('base64'))
  })

  it('reports job output without pretending media is complete', () => {
    const result = normalizeMediaProviderResult({ output: { taskId: 'task-123', status: 'processing' } })
    expect(result.jobId).toBe('task-123')
    expect(result.mediaUrl).toBeNull()
    expect(result.base64).toBeNull()
  })

  it('redacts secret-bearing artifact metadata', () => {
    expect(sanitizeArtifactMetadata({
      apiKey: 'sk-secret-value',
      nested: { authorization: 'Bearer private-token', safe: 'provider response' },
    })).toEqual({
      apiKey: '[redacted]',
      nested: { authorization: '[redacted]', safe: 'provider response' },
    })
  })
})

describe('standalone dashboard product shell', () => {
  it('contains the required control-centre primary sections', () => {
    const nav = read('lib/dashboard-nav.ts')
    for (const label of [
      'Control Centre',
      'Studio',
      'Capabilities',
      'Apps',
      'Providers & Keys',
      'Storage & Artifacts',
      'Memory & RAG',
      'Agents',
      'Jobs & Worker',
      'Approvals',
      'Publishing',
      'Analytics',
      'Safety',
      'VPS Health',
      'Settings',
    ]) {
      expect(nav).toContain(`label: '${label}'`)
    }
  })

  it('keeps adult text, image, video, and voice visible', () => {
    const studio = read('app/admin/dashboard/studio/page.tsx')
    for (const label of ['Adult Text', 'Adult Image', 'Adult Video', 'Adult Voice']) {
      expect(studio).toContain(label)
    }
  })

  it('renders real output players and metadata', () => {
    const outputs = read('app/admin/dashboard/outputs/page.tsx')
    expect(outputs).toContain('<Image')
    expect(outputs).toContain('<audio')
    expect(outputs).toContain('<video')
    expect(outputs).toContain('provider')
    expect(outputs).toContain('model')
    expect(outputs).toContain('createdAt')
  })

  it('does not integrate external product apps', () => {
    const nav = read('lib/dashboard-nav.ts')
    expect(nav).not.toContain('Marketing')
    expect(nav).not.toContain('Crypto')
    expect(nav).not.toContain('Connected Apps')
  })
})

describe('honest media lifecycle contracts', () => {
  it('does not count blueprint-only music as a completed song', () => {
    const route = read('app/api/admin/music-studio/route.ts')
    expect(route).toContain("result.status === 'generated'")
    expect(route).toContain('planningArtifactId')
    expect(route).toContain('not a completed song')
  })

  it('gives video jobs a terminal timeout', () => {
    const route = read('app/api/brain/video-generate/[jobId]/route.ts')
    expect(route).toContain('MAX_PROCESSING_MS')
    expect(route).toContain("status: 'failed'")
  })

  it('returns an honest avatar unavailable blocker', () => {
    const route = read('app/api/brain/avatar-video/route.ts')
    expect(route).toContain('avatar video provider unavailable')
    expect(route).not.toContain('success: true')
  })
})
