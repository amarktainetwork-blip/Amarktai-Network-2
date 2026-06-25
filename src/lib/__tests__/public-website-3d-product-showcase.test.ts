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

  it('uses a label-free capability flow without old operating-system copy', () => {
    const source = read('components/public/IntelligenceFabric.tsx').toLowerCase()
    expect(source).toContain('capability flow')
    expect(source).toContain('particle')
    expect(source).not.toContain('core os')
    expect(source).not.toContain('runtime truth')
  })

  it('supports performance, mobile, and reduced-motion constraints', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('ResizeObserver')
    expect(source).toContain('prefers-reduced-motion')
    expect(source).toContain('devicePixelRatio')
    expect(source).toContain('Math.min')
    expect(source).toContain('cancelAnimationFrame')
    expect(source).toContain('ro.disconnect()')
  })

  it('home page exposes login without signup or access-request flows', () => {
    const source = read('app/page.tsx').toLowerCase()
    expect(source).toContain('/admin/login')
    for (const forbidden of ['sign up', 'request access', 'get access', 'get started']) {
      expect(source).not.toContain(forbidden)
    }
  })
})
