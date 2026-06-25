import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const read = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf8')

describe('final dashboard UX', () => {
  it('has the required command quick actions', () => {
    const page = read('components/dashboard/CommandCenter.tsx')
    for (const action of ['Create song', 'Create image', 'Create video', 'Create avatar', 'Generate voice', 'Build app', 'Audit repo', 'Fix repo', 'Create PR', 'Check system']) {
      expect(page).toContain(action)
    }
  })

  it('uses normal page flow without internal dashboard scroll panels', () => {
    for (const page of [
      'components/dashboard/CommandCenter.tsx',
      'app/admin/dashboard/settings/page.tsx',
      'app/admin/dashboard/outputs/page.tsx',
      'app/admin/dashboard/memory-learning/page.tsx',
    ]) expect(read(page), page).not.toMatch(/max-h-\[|overflow-y-auto/)
  })

  it('renders the standalone core sections in primary navigation', () => {
    const nav = read('lib/dashboard-nav.ts')
    expect(nav).toContain("label: 'Control Centre'")
    expect(nav).toContain("label: 'Studio'")
    expect(nav).toContain("label: 'Capabilities'")
    expect(nav).toContain("label: 'Apps'")
    expect(nav).toContain("label: 'Providers & Keys'")
    expect(nav).toContain("label: 'Storage & Artifacts'")
    expect(nav).toContain("label: 'Memory & RAG'")
    expect(nav).toContain("label: 'Agents'")
    expect(nav).toContain("label: 'Jobs & Worker'")
    expect(nav).toContain("label: 'Approvals'")
    expect(nav).toContain("label: 'Publishing'")
    expect(nav).toContain("label: 'Analytics'")
    expect(nav).toContain("label: 'Safety'")
    expect(nav).toContain("label: 'VPS Health'")
    expect(nav).toContain("label: 'Settings'")
    expect(nav).not.toContain("label: 'Advanced Admin'")
  })
})
