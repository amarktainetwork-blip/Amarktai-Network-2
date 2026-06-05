import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('final go-live dashboard UX', () => {
  it('Command uses the unified command / result workspace pattern', () => {
    const page = read('components/dashboard/CommandCenter.tsx')
    for (const text of [
      'Unified Command',
      'Say what you want done.',
      'Creative options',
      'Progress',
      'Expected outputs',
      'Open attached workspace',
    ]) expect(page).toContain(text)
  })

  it('Command media controls stay task-oriented and provider-light', () => {
    const page = read('components/dashboard/CommandCenter.tsx')
    expect(page).toContain('Duration')
    expect(page).toContain('Combine selected genres')
    expect(page).toContain('Genres')
    expect(page).toContain('Provider overrides')
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
    expect(apps).toContain('EXTERNAL_APP_ONBOARDING_LABEL')
    expect(apps).toContain('Build & Code')
    expect(apps).toContain('Creative Media')
    expect(apps).toContain('Safety')
    expect(apps).toContain('Memory')
  })

  it('final dashboard route tree remains singular', () => {
    const dashboardRoot = path.join(ROOT, 'app/admin/dashboard')
    for (const route of ['dashboard-v2', 'frontend-v2', 'apps', 'ai-models']) {
      expect(fs.existsSync(path.join(dashboardRoot, route)), route).toBe(false)
    }
    for (const route of ['command', 'network-apps', 'outputs', 'agents', 'memory', 'system']) {
      expect(fs.existsSync(path.join(dashboardRoot, route)), route).toBe(true)
    }
  })
})
