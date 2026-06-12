import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const read = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf8')

describe('dashboard productization correction', () => {
  it('keeps Command outcome-first and provider-light', () => {
    const page = read('components/dashboard/CommandCenter.tsx')
    expect(page).toContain('Say what you want done.')
    expect(page).toContain('Creative options')
    expect(page).toContain('Advanced')
    expect(page).toContain('Connected route')
  })

  it('shows real execution results and sanitized failures', () => {
    const page = read('components/dashboard/CommandCenter.tsx')
    expect(page).toContain('active.execution?.error')
    expect(page).toContain('active.artifacts.map')
    expect(page).toContain('active.execution.events.map')
    expect(read('lib/provider-mesh.ts')).toContain('sanitizeProviderError')
  })

  it('keeps Settings as the only connection setup surface', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    expect(settings).toContain('Connect capabilities once.')
    expect(settings).toContain('/api/admin/settings/status')
    expect(settings).toContain('/api/admin/settings/key')
    expect(settings).toContain('entry.testRoute')
    expect(settings).toContain('Save')
    expect(settings).toContain('Test')
    expect(settings).toContain('Provider status unavailable')
    expect(settings).not.toMatch(/[A-Z][A-Z0-9_]+_API_KEY/)
    expect(settings).not.toContain('OpenAI')
    expect(settings).not.toContain('Firecrawl')
  })

  it('does not render failed readiness requests as ready', () => {
    const overview = read('app/admin/dashboard/page.tsx')
    const settings = read('app/admin/dashboard/settings/page.tsx')
    const system = read('app/admin/dashboard/system/page.tsx')
    expect(overview).toContain('readinessError')
    expect(overview).toContain("'Unavailable'")
    expect(settings).toContain('loadError')
    expect(settings).toContain("status=\"unknown\"")
    expect(system).toContain('loadError')
    expect(system).toContain('Readiness status unavailable')
  })

  it('presents memory in plain English with working management actions', () => {
    const memory = read('app/admin/dashboard/memory-learning/page.tsx')
    const actions = read('components/dashboard/MemoryActions.tsx')
    expect(memory).toContain('What Amarktai Network remembers.')
    expect(memory).toContain('Recent memory writes')
    expect(actions).toContain('Export memory')
    expect(actions).toContain('Delete all memory')
  })

  it('normal dashboard pages contain no raw JSON diagnostics', () => {
    for (const page of [
      'app/admin/dashboard/page.tsx',
      'app/admin/dashboard/command/page.tsx',
      'app/admin/dashboard/outputs/page.tsx',
      'app/admin/dashboard/memory-learning/page.tsx',
    ]) expect(read(page), page).not.toContain('JSON.stringify')
  })
})
