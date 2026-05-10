import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { OPERATOR_AGENTS } from '@/lib/agent-registry'
import { resolveModelAlias } from '@/lib/genx-model-resolver'
import { routeLiveModel } from '@/lib/live-ai-routing'
import { getUniversalModelCatalog, ADULT_POLICY_VALUES, adultPolicyAllows } from '@/lib/universal-model-catalog'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

const ROOT = path.resolve(__dirname, '../../')
const DASHBOARD = path.join(ROOT, 'app/admin/dashboard')
const API = path.join(ROOT, 'app/api/admin')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(target))
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(target)
  }
  return out
}

describe('dashboard go-live wiring', () => {
  it('keeps exactly the final dashboard routes and one nav system', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/admin/dashboard',
      '/admin/dashboard/studio',
      '/admin/dashboard/workbench',
      '/admin/dashboard/apps-agents',
      '/admin/dashboard/memory-learning',
      '/admin/dashboard/settings',
    ])
    for (const route of ['apps', 'agents', 'ai-models', 'assistant', 'playground', 'creative-studio', 'costs', 'actions', 'system', 'dashboard-v2']) {
      expect(fs.existsSync(path.join(DASHBOARD, route)), route).toBe(false)
    }
  })

  it('Studio uses protected real routes, media polling, previews, voice/model selection, and adult blockers', () => {
    const page = read('app/admin/dashboard/studio/page.tsx')
    for (const text of [
      '/api/admin/amarktai-assistant/stream',
      '/api/admin/studio/execute',
      '/api/admin/studio/stt',
      '/api/admin/studio/workbench-handoff',
      '/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}',
      'pollStudioJob',
      'pollUrl',
      'Job created, output pending',
      '<ArtifactPreview artifact={artifact} />',
      '<audio controls src={audioPreview}',
      'type="file"',
      'Workspace memory available',
      'Advanced route details',
      'modelIdForExecution',
      'MiniMax/Mimo status',
      'Adult video and adult voice remain disabled',
      'Open/download artifact',
    ]) expect(page).toContain(text)
    expect(read('lib/studio-route-map.ts')).toContain('Avatar / Talking Video')
    expect(read('lib/studio-route-map.ts')).toContain("status: 'missing'")
  })

  it('Workbench exposes repo to deploy flow with latest job rehydration and guarded steps', () => {
    const page = read('app/admin/dashboard/workbench/page.tsx')
    for (const text of [
      'Load repos',
      'loadBranches',
      'rehydrateJob',
      'Start task',
      'Generate patch',
      'Approve changes',
      'Run checks',
      'Commit and push',
      'Create PR',
      'Next action',
      'Retry failed step',
      'Open PR URL',
      'Merge when allowed',
      'Deploy when allowed',
      'PR ready',
      'Deploy ready',
      'amarktai/${Date.now()}',
    ]) expect(page).toContain(text)
    expect(page).not.toContain('ghp_')
  })

  it('Settings and Operations expose truthful readiness/status surfaces', () => {
    const settings = read('app/admin/dashboard/settings/page.tsx')
    const truth = read('lib/platform-settings-truth.ts')
    const operations = read('app/admin/dashboard/operations/page.tsx')
    for (const status of ['Connected', 'Configured', 'Needs key', 'Needs live test', 'Needs test route', 'Unsupported', 'Failed']) {
      expect(truth).toContain(status)
    }
    expect(truth).not.toContain('Configured - needs live test')
    for (const text of ['Setup completion checklist', 'Unified setup list', 'GenX', 'GitHub', 'Storage', 'Redis', 'Playwright', 'Firecrawl', 'Webdock', 'SMTP / email', 'Exact blocker', 'Last test result']) {
      expect(settings).toContain(text)
    }
    for (const text of ['Go-live readiness', 'liveBlockers', 'Advanced governance/debug', 'broken protected API', 'build/lint/test failure', 'Active jobs', 'Recent failed jobs', 'Workbench jobs', 'Studio jobs', 'Can go live']) {
      expect(operations).toContain(text)
    }
  })

  it('dashboard links stay within the final route set and no duplicate route implementation exists', () => {
    const allowed = new Set(DASHBOARD_NAV_ITEMS.map((item) => item.href))
    const sources = walk(DASHBOARD)
      .filter((file) => file.endsWith('page.tsx') || file.endsWith('layout.tsx'))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n')
    const hrefs = [...sources.matchAll(/href=(?:{`([^`]+)`}|"([^"]+)")/g)].map((match) => match[1] ?? match[2])
    for (const href of hrefs.filter((item) => item.startsWith('/admin/dashboard'))) {
      const normalized = href.split('?')[0]
      expect([...allowed].some((route) => normalized === route || normalized.startsWith(`${route}?`) || normalized.startsWith(`${route}/`)), href).toBe(true)
    }
    for (const duplicate of ['dashboard-v2', 'frontend-v2']) {
      expect(sources).not.toContain(duplicate)
    }
  })

  it('Apps/Agents and Memory/Learning are truthful about registry, packages, memory, artifacts, and pending automation', () => {
    const apps = read('app/admin/dashboard/apps-agents/page.tsx')
    const memory = read('app/admin/dashboard/memory-learning/page.tsx')
    for (const text of ['Agent registry', 'Package store available', 'assigned agents', 'memory namespace', 'storage namespace']) {
      expect(apps).toContain(text)
    }
    for (const text of ['Recent memory writes', 'Artifacts and jobs that can feed memory', 'Learning automation truth', 'Scheduled learning remains pending']) {
      expect(memory).toContain(text)
    }
    const requiredAgents = ['Coding Agent', 'Repo Audit Agent', 'Deployment Agent', 'Research Agent', 'Scraping Agent', 'Creative Agent', 'Image Agent', 'Video Agent', 'Voice Agent', 'System/VPS Agent', 'QA/Test Agent', 'Memory/Learning Agent', 'Safety/Policy Agent']
    const names = OPERATOR_AGENTS.map((agent) => agent.name)
    for (const name of requiredAgents) expect(names).toContain(name)
  })

  it('protected admin API routes still enforce 401 without a session', () => {
    for (const relPath of [
      'app/api/admin/studio/execute/route.ts',
      'app/api/admin/studio/stt/route.ts',
      'app/api/admin/studio/workbench-handoff/route.ts',
      'app/api/admin/settings/status/route.ts',
      'app/api/admin/system/live-readiness/route.ts',
    ]) {
      const source = read(relPath)
      expect(source).toMatch(/getServerSession|getSession/)
      expect(source).toContain('status: 401')
    }
  })

  it('routing, storage, hidden login, and retired branding constraints remain intact', async () => {
    for (const alias of ['auto:coding-best', 'auto:coding-balanced', 'auto:assistant', 'auto:anything']) {
      expect(resolveModelAlias({ provider: 'genx', selectedModelId: alias })).not.toMatch(/^auto:/)
    }
    const route = routeLiveModel({ capability: 'coding', costMode: 'balanced', selectedProvider: 'auto' })
    expect(route.selectedModel).toBeTruthy()

    const catalog = await getUniversalModelCatalog()
    expect(catalog.models.length).toBeGreaterThan(10)
    expect(ADULT_POLICY_VALUES).toContain('full_adult_app_mode')
    expect(adultPolicyAllows('full_adult_app_mode', 'adult_video')).toBe(true)

    const oldRoot = process.env.AMARKTAI_STORAGE_ROOT
    const tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-storage-'))
    process.env.AMARKTAI_STORAGE_ROOT = tempRoot
    expect(checkWritable(LOCAL_STORE_FILES.artifacts).writable).toBe(true)
    process.env.AMARKTAI_STORAGE_ROOT = oldRoot
    fs.rmSync(tempRoot, { recursive: true, force: true })

    expect(read('app/admin/login/page.tsx')).toContain('/api/admin/login')
    const dashboardSources = walk(DASHBOARD).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
    expect(dashboardSources).not.toMatch(/Superbrain|Aiva|dashboard-v2|frontend-v2/)
  })

  it('required backend routes still exist for Studio and Workbench', () => {
    for (const rel of [
      'studio/execute/route.ts',
      'studio/stt/route.ts',
      'studio/workbench-handoff/route.ts',
      'repo-workbench/github/repos/route.ts',
      'repo-workbench/github/branches/route.ts',
      'repo-workbench/jobs/latest/route.ts',
      'system/live-readiness/route.ts',
    ]) {
      expect(fs.existsSync(path.join(API, rel)), rel).toBe(true)
    }
  })
})
