import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../../')

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

describe('public product architecture animation', () => {
  it('uses a single canvas architecture system for the public hero', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('canvasRef')
    expect(source).toContain('getContext')
    expect(source).toContain('requestAnimationFrame')
    expect(source).toContain('role="img"')
    expect(source).toContain('aria-label')
  })

  it('maps inputs, core orchestration, outputs, gates, and telemetry', () => {
    const source = read('components/public/IntelligenceFabric.tsx').toLowerCase()
    for (const token of [
      'prompts',
      'files',
      'tasks',
      'routing engine',
      'model mesh',
      'memory layer',
      'artifact bus',
      'pull requests',
      'deployments',
      'approval gates',
      'runtime checks',
      'telemetry',
    ]) {
      expect(source, token).toContain(token)
    }
  })

  it('supports performance, mobile, and reduced-motion constraints', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('ResizeObserver')
    expect(source).toContain('prefers-reduced-motion')
    expect(source).toContain('isMobile')
    expect(source).toContain('devicePixelRatio')
    expect(source).toContain('Math.min')
    expect(source).toContain('visibilitychange')
    expect(source).toContain('cancelAnimationFrame')
    expect(source).toContain('ro.disconnect()')
  })

  it('home page has no public calls to obtain account access', () => {
    const source = read('app/page.tsx').toLowerCase()
    for (const forbidden of ['sign up', 'sign in', 'request access', 'get access', 'get started', '/admin/login']) {
      expect(source).not.toContain(forbidden)
    }
  })
})
