import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const ROOT = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('V1 capability recovery and visible product replacement', () => {
  it('keeps the live planner from blocking provider fallback', () => {
    const planner = read('src/lib/execution/task-planner.ts')
    expect(planner).toContain('const policyBlockedReason')
    expect(planner).toContain('blockedReason: policyBlockedReason')
    expect(planner).toContain('canonical orchestrator')
  })

  it('exposes only the requested visible V1 navigation', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Command Center',
      'Studio',
      'Apps',
      'Jobs',
      'Artifacts',
      'Providers',
      'Settings',
    ])
    for (const hidden of ['Capabilities', 'Repo Workbench', 'App Builder', 'MCP']) {
      expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain(hidden)
    }
  })

  it('provides persisted creative workspace and long-form video APIs', () => {
    for (const file of [
      'src/lib/creative-workspaces.ts',
      'src/lib/long-form-video.ts',
      'src/app/api/admin/creative-workspaces/route.ts',
      'src/app/api/admin/video-projects/route.ts',
    ]) expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true)
    const pipeline = read('src/lib/long-form-video.ts')
    expect(pipeline).toContain('executeCapabilityOrchestration')
    expect(pipeline).toContain('pollLocalMediaJob')
    expect(pipeline).toContain("'ffmpeg'")
    expect(pipeline).toContain("'ffprobe'")
    expect(pipeline).toContain('validateVideo')
    expect(pipeline).toContain("'-f', 'concat'")
    expect(pipeline).toContain("type: 'video'")
    expect(pipeline).toContain('totalDuration ?? 90')
  })

  it('surfaces long-form projects in the canonical Jobs view', () => {
    const jobsRoute = read('src/app/api/admin/system/jobs/route.ts')
    expect(jobsRoute).toContain('listVideoProjects')
    expect(jobsRoute).toContain("type: 'long_form_video'")
    const jobs = read('src/app/admin/dashboard/jobs/page.tsx')
    expect(jobs).toContain('data.jobs')
    expect(jobs).toContain('View artifact')
  })

  it('renders the recovered product surfaces and preview modes', () => {
    const studio = read('src/app/admin/dashboard/studio/page.tsx')
    for (const term of [
      'Chat / text',
      'Image edit',
      'Long-form / multi-scene',
      "label: 'Music'",
      "label: 'Avatar'",
      "label: 'Voice'",
      "setMode('adult')",
      'LongFormVideoPanel',
    ]) expect(studio).toContain(term)
    expect(studio).not.toContain('Media job history')
    expect(studio).not.toContain('Reusable artifacts')
  })

  it('keeps settings truth consolidated and adult mode accessible', () => {
    const settings = read('src/app/admin/dashboard/settings/page.tsx')
    for (const term of [
      'Provider Connections',
      'Artifact Storage',
      'Content Safety / Adult Mode',
      'Local Runtime Tools',
      'Capability Matrix',
      '/api/admin/settings/runtime-tools',
      '/api/admin/app-safety',
    ]) expect(settings).toContain(term)
  })

  it('uses the shared wordmark and branded public/login shells', () => {
    expect(read('src/components/BrandName.tsx')).toContain('AmarktAI Network')
    expect(read('src/components/public/PublicShell.tsx')).toContain('<BrandName />')
    const login = read('src/app/admin/login/page.tsx')
    expect(login).toContain('<BrandName />')
    expect(login).toContain('Sign in to your creative command center')
    expect(login).not.toContain('Operator authentication')
  })
})
