import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { PROVIDER_MESH } from '@/lib/provider-mesh'

const ROOT = path.resolve(__dirname, '../../')
const read = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf8')

describe('final dashboard source-of-truth wiring', () => {
  it('keeps exactly the six truthful dashboard routes', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/admin/dashboard/app-builder',
      '/admin/dashboard/workbench',
      '/admin/dashboard/studio',
      '/admin/dashboard/outputs',
      '/admin/dashboard/settings',
      '/admin/dashboard/system',
    ])
    expect(DASHBOARD_NAV_ITEMS.some((item) => item.label === 'Agents')).toBe(false)
    expect(DASHBOARD_NAV_ITEMS.some((item) => item.label === 'Command' || item.label === 'Network Apps')).toBe(false)
  })

  it('uses one provider mesh with all required connections', () => {
    expect(PROVIDER_MESH.map((node) => node.id)).toEqual([
      'genx', 'huggingface', 'mimo', 'groq', 'together',
      'github', 'redis', 'qdrant', 'local-crawler', 'playwright', 'scrapy', 'trafilatura',
      'ffmpeg', 'storage', 'smtp',
    ])
    expect(PROVIDER_MESH.every((node) => node.settingsVisible && node.systemVisible && !node.normalUserVisible)).toBe(true)
  })

  it('Settings saves, tests, refreshes, and never paints configured keys green', () => {
    const page = read('app/admin/dashboard/settings/page.tsx')
    const truth = read('lib/platform-settings-truth.ts')
    expect(page).toContain('/api/admin/settings/key')
    expect(page).toContain('entry.testRoute')
    expect(page).toContain('await refresh()')
    expect(page).toContain('Live test passed')
    expect(truth).toContain('configured && notes.lastTestPassed')
  })

  it('Workspace selects connected providers and starts real media routes', () => {
    const router = read('lib/command-router.ts')
    const route = read('app/api/admin/command/route.ts')
    expect(router).toContain('routeCommandWithProviderMesh')
    expect(router).toContain('selectedProviders')
    expect(route).toContain("route.intent === 'create_image'")
    expect(route).toContain("route.intent === 'create_movie'")
    expect(route).toContain("route.intent === 'create_song'")
  })

  it('keeps technical details in Settings and System', () => {
    const command = read('components/dashboard/CommandCenter.tsx')
    const overview = read('app/admin/dashboard/page.tsx')
    expect(command).not.toContain('model catalog dump')
    expect(overview).not.toContain('JSON.stringify')
    expect(read('app/admin/dashboard/system/page.tsx')).toContain('runtime diagnostics')
  })

  it('retains protected repository and system routes behind attached workspaces', () => {
    for (const relPath of [
      'app/api/admin/repo-workbench/[workspaceId]/audit/route.ts',
      'app/api/admin/repo-workbench/[workspaceId]/pr/route.ts',
      'app/api/admin/repo-workbench/[workspaceId]/deploy/route.ts',
      'app/api/admin/system/vps/route.ts',
    ]) expect(fs.existsSync(path.join(ROOT, relPath)), relPath).toBe(true)
  })
})
