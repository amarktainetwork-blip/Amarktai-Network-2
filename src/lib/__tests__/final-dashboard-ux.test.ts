import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('final go-live dashboard UX', () => {
  it('Studio uses the left command / right live result workspace pattern', () => {
    const page = read('app/admin/dashboard/page.tsx')
    for (const text of [
      'LEFT command / RIGHT live result workspace',
      'Command Center / Studio',
      'Live workspace / results',
      'Music / Song',
      'Adult Video',
      'Adult Voice',
      'Advanced route details',
      'queued',
      'processing',
      'completed',
      'failed',
      'blocked',
      'Artifact preview',
    ]) expect(page).toContain(text)
  })

  it('Studio media lifecycle and capability copy stays explicit', () => {
    const page = read('app/admin/dashboard/page.tsx')
    expect(page).toContain('pollStudioJob')
    expect(page).toContain('loadArtifacts().catch')
    expect(page).toContain('music_generation / song_generation')
    expect(page).toContain('lyria-3-clip-preview / lyria-3-pro-preview')
    expect(page).toContain('Not verified - requires live provider test.')
    expect(page).toContain('MiniMax/Mimo status')
    expect(page).toContain('Qwen/MiniMax/HF')
  })

  it('Workbench exposes one primary next action and readable plan sections', () => {
    const page = read('app/admin/dashboard/workbench/page.tsx')
    for (const text of [
      'Primary next action',
      'runPrimaryAction',
      'Readable plan',
      'Summary',
      'Findings',
      'Files',
      'Risks',
      'Fixes',
      'Verification',
      'Diff viewer',
      'Checks, PR, deploy',
      'Advanced details',
    ]) expect(page).toContain(text)
  })

  it('Settings and Operations hide governance behind advanced disclosures', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    const operations = read('app/admin/dashboard/operations/page.tsx')
    expect(settings).toContain('<summary className="cursor-pointer text-sm font-black text-slate-200">Advanced capability matrix</summary>')
    expect(settings).toContain('Capability governance matrix')
    expect(operations).toContain('<summary className="cursor-pointer text-sm font-black text-slate-200">Advanced governance/debug</summary>')
    expect(operations).toContain('Governance blockers and route truth')
  })

  it('Apps & Agents treats root workspace as active and external onboarding as secondary', () => {
    const apps = read('app/admin/dashboard/apps-agents/page.tsx')
    expect(apps).toContain('Root workspace active')
    expect(apps).toContain('Add external managed app')
    expect(apps).toContain('Build & Code')
    expect(apps).toContain('Creative Media')
    expect(apps).toContain('Safety')
    expect(apps).toContain('Memory')
  })

  it('final dashboard route tree remains singular', () => {
    const dashboardRoot = path.join(ROOT, 'app/admin/dashboard')
    for (const route of ['dashboard-v2', 'frontend-v2', 'apps', 'agents', 'ai-models']) {
      expect(fs.existsSync(path.join(dashboardRoot, route)), route).toBe(false)
    }
  })
})

