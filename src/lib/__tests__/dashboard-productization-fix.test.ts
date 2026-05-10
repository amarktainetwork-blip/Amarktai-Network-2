import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('dashboard emergency productization fix', () => {
  it('Studio starts empty and does not render fake job states before a real run', () => {
    const page = read('app/admin/dashboard/studio/page.tsx')
    const modesBlock = page.slice(page.indexOf('const studioModes'), page.indexOf('const unavailableAdultModes'))
    expect(modesBlock).not.toContain("capability: 'adult_video'")
    expect(modesBlock).not.toContain("capability: 'adult_voice'")
    expect(page).toContain('const hasRealJob = Boolean(jobStatus || status || lastPayload || lastResult || streaming || executing)')
    expect(page).toContain('No active jobs yet.')
    expect(page).toContain('{hasRealJob && (')
    expect(page).toContain('Run a command to see live results here.')
  })

  it('Studio keeps route and context details behind Advanced details', () => {
    const page = read('app/admin/dashboard/studio/page.tsx')
    expect(page).toContain('Advanced route details')
    expect(page).toContain('<RouteFact label="Route details" value={tabTruth.detail} />')
    expect(page).toContain('<RouteFact label="Context" value="Dashboard-aware context loaded; Workspace memory available; Workbench handoff enabled." />')
    expect(page).not.toContain('<p className="flex items-center gap-2"><Brain')
  })

  it('Workbench state machine separates plan, patch, approval, checks, commit, and PR', () => {
    const page = read('app/admin/dashboard/workbench/page.tsx')
    expect(page).toContain('const hasPlan = Boolean(taskId || log.plan)')
    expect(page).toContain("if (!hasPlan) return { id: 'start', label: 'Start task'")
    expect(page).toContain("if (!hasPatch && steps['Patch prepared'] === 'waiting') return { id: 'patch', label: 'Generate patch'")
    expect(page).toContain('async function generatePatch()')
    expect(page).toContain('Generate patch from the approved plan.')
    expect(page).not.toContain("Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item))")
  })

  it('Settings has one unified setup surface and no adult video or voice defaults in normal UI', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    expect(settings).toContain('Unified setup list')
    expect(settings).not.toContain('Tools & system services')
    expect(settings).not.toContain('<h2 className="text-sm font-black text-slate-200">AI providers</h2>')
    expect(settings).toContain("const NORMAL_ADULT_POLICY_VALUES = ADULT_POLICY_VALUES.filter((policy) => policy !== 'adult_video' && policy !== 'adult_voice')")
  })

  it('Operations keeps debug blocker categories and file paths collapsed', () => {
    const operations = read('app/admin/dashboard/operations/page.tsx')
    const advancedIndex = operations.indexOf('Advanced governance/debug')
    const blockerIndex = operations.indexOf('requiredBlockerCategories.map', advancedIndex)
    const metricsIndex = operations.indexOf('{/* Top metrics */}')
    expect(advancedIndex).toBeGreaterThan(-1)
    expect(blockerIndex).toBeGreaterThan(advancedIndex)
    expect(blockerIndex).toBeLessThan(metricsIndex)
    expect(operations).toContain('Advanced file paths')
    expect(operations).toContain("settingsTruth?.storage.status ?? (storage.writable ? 'Connected' : 'Failed')")
  })

  it('Apps and Memory read as root workspace workflows instead of broken onboarding or empty states', () => {
    const apps = read('app/admin/dashboard/apps-agents/page.tsx')
    const memory = read('app/admin/dashboard/memory-learning/page.tsx')
    expect(apps).toContain('Root workspace active.')
    expect(apps).toContain('Not available yet')
    expect(apps).toContain('{EXTERNAL_APP_ONBOARDING_LABEL}')
    expect(apps).not.toContain('Adult policy values')
    expect(memory).toContain('No memory yet.')
    expect(memory).toContain('Studio and Workbench create memory when tasks are saved.')
    expect(memory).toContain('Save current Studio result')
    expect(memory).toContain('Save Workbench summary')
  })

  it('Dashboard source contains no user-facing Superbrain wording and no duplicate route tree', () => {
    const dashboardRoot = path.join(ROOT, 'app/admin/dashboard')
    const files = walkFiles(dashboardRoot)
    const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
    expect(source.toLowerCase()).not.toContain('superbrain')
    for (const route of ['dashboard-v2', 'frontend-v2']) {
      expect(fs.existsSync(path.join(dashboardRoot, route)), route).toBe(false)
    }
  })
})

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath]
  })
}
