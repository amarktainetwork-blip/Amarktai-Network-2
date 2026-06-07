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
    expect(nav).toContain("label: 'App Builder'")
    expect(nav).toContain("label: 'Repo Workbench'")
    expect(nav).toContain("label: 'Media Studio / Playground'")
    expect(nav).toContain("label: 'Outputs'")
    expect(nav).toContain("label: 'Settings'")
    expect(nav).toContain("label: 'Advanced Admin'")
    expect(nav).not.toContain("label: 'Agents'")
  })
})
