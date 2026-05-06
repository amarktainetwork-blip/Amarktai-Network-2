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

describe('PR59 final Superbrain dashboard architecture', () => {
  it('final nav only contains Studio, Workbench, Apps & Agents, Memory & Learning, Operations, Settings', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Studio',
      'Workbench',
      'Apps & Agents',
      'Memory & Learning',
      'Operations',
      'Settings',
    ])
  })

  it('removes old top-level dashboard pages and nav concepts', () => {
    const deleted = ['apps', 'agents', 'ai-models', 'assistant', 'playground', 'creative-studio', 'costs', 'actions', 'system']
    for (const route of deleted) expect(fs.existsSync(path.join(DASHBOARD, route)), route).toBe(false)
    const navSource = read('lib/dashboard-nav.ts')
    for (const oldLabel of ['Overview', 'AI Models', 'Playground', 'Creative Studio', 'Assistant', 'Costs', 'Actions', 'System']) {
      expect(navSource).not.toContain(oldLabel)
    }
  })

  it('Studio tabs exist and are wired to chat, routing, memory, Workbench, and apps', () => {
    const source = read('app/admin/dashboard/page.tsx')
    for (const tab of ['Chat', 'Coding', 'Research', 'Image', 'Video', 'Music / Audio', 'Voice / TTS', 'STT / Transcription', 'Avatar / Talking Video', 'Adult', 'Artifacts']) {
      expect(source).toContain(tab)
    }
    expect(source).toContain('/api/admin/amarktai-assistant/stream')
    expect(source).toContain('/api/admin/ai-model-catalog')
    expect(source).toContain('/api/admin/memory')
    expect(source).toContain('/admin/dashboard/workbench')
    expect(source).toContain('/admin/dashboard/apps-agents')
  })

  it('Workbench has one-button start flow and no wall of primary action buttons', () => {
    const source = read('app/admin/dashboard/workbench/page.tsx')
    for (const label of ['Repo', 'Branch', 'AI / model', 'Prompt', 'Start work', 'Approve changes', 'Create PR']) {
      expect(source).toContain(label)
    }
    for (const hiddenPrimary of ['Generate patch', 'Apply fix', 'Run checks', 'Commit\"', 'Push\"']) {
      expect(source).not.toContain(hiddenPrimary)
    }
    for (const step of ['Planning', 'Files selected', 'Patch prepared', 'Checks running', 'Commit ready', 'PR ready', 'Deploy ready']) {
      expect(source).toContain(step)
    }
  })

  it('Auto model routing resolves to real model IDs', () => {
    for (const alias of ['auto:coding-best', 'auto:coding-balanced', 'auto:assistant', 'auto:anything']) {
      expect(resolveModelAlias({ provider: 'genx', selectedModelId: alias })).not.toMatch(/^auto:/)
    }
    const route = routeLiveModel({ capability: 'coding', costMode: 'balanced', selectedProvider: 'auto' })
    expect(route.selectedModel).toBeTruthy()
    expect(route.selectedModel).not.toMatch(/^auto:/)
  })

  it('universal catalog exposes GenX catalog groups and approved providers', async () => {
    const catalog = await getUniversalModelCatalog()
    expect(catalog.models.length).toBeGreaterThan(10)
    for (const group of ['coding', 'reasoning', 'chat', 'image', 'video', 'music/audio', 'voice/TTS', 'STT', 'embeddings/moderation']) {
      expect(catalog.grouped[group as keyof typeof catalog.grouped]).toBeDefined()
    }
    expect(catalog.genx.modelCount).toBeGreaterThan(0)
    expect(catalog.providers.map((provider) => provider.displayName)).toEqual(['GenX', 'Hugging Face', 'Qwen/DashScope', 'MiniMax/Mimo', 'Groq', 'Together AI', 'OpenAI'])
  })

  it('adult mode is visible, app-policy gated, and does not require a separate key', () => {
    const studio = read('app/admin/dashboard/page.tsx')
    const settings = read('app/admin/dashboard/settings/page.tsx')
    expect(studio).toContain('Adult')
    expect(ADULT_POLICY_VALUES).toContain('full_adult_app_mode')
    expect(adultPolicyAllows('full_adult_app_mode', 'adult_video')).toBe(true)
    expect(adultPolicyAllows('off', 'adult_text')).toBe(false)
    expect(settings).toContain('does not require a separate adult key')
  })

  it('all canonical agents exist', () => {
    const required = [
      'Coding Agent',
      'Code Review Agent',
      'Repo Audit Agent',
      'Deployment Agent',
      'Research Agent',
      'Scraping Agent',
      'Creative Agent',
      'Image Agent',
      'Video Agent',
      'Music/Audio Agent',
      'Voice Agent',
      'Avatar/Talking Video Agent',
      'Marketing Agent',
      'App Operator Agent',
      'System/VPS Agent',
      'Cost/Budget Agent',
      'Safety/Policy Agent',
      'Adult Policy Agent',
      'Memory/Learning Agent',
      'QA/Test Agent',
      'Product/UX Agent',
    ]
    const names = OPERATOR_AGENTS.map((agent) => agent.name)
    for (const name of required) expect(names).toContain(name)
  })

  it('Apps & Agents supports VPS path, service, domain, repo, package, agents, namespaces, and policy', () => {
    const source = read('app/admin/dashboard/apps-agents/page.tsx')
    for (const text of ['domain/subdomain', 'repo', 'VPS path', 'service name', 'health endpoint', 'assigned agents', 'assigned model package', 'memory namespace', 'storage namespace', 'adult policy', 'deployment profile']) {
      expect(source).toContain(text)
    }
  })

  it('Memory & Learning exposes memory, emotion, learning, retrieval, scheduler, and storage abstraction', () => {
    const source = read('app/admin/dashboard/memory-learning/page.tsx')
    for (const text of ['user memory', 'app memory', 'agent memory', 'emotional state/context', 'memory retrieval', 'daily learning scheduler', 'cross-agent knowledge sharing', 'local VPS storage first']) {
      expect(source).toContain(text)
    }
  })

  it('Operations shows VPS, storage, jobs, artifacts, approvals, costs, provider usage, and research stack', () => {
    const source = read('app/admin/dashboard/operations/page.tsx')
    for (const text of ['VPS', 'Storage', 'Jobs', 'Approvals', 'Month spend', 'Provider usage', 'App usage', 'Firecrawl', 'Crawl4AI', 'Playwright']) {
      expect(source).toContain(text)
    }
  })

  it('storage root and artifacts are writable when configured', () => {
    const oldRoot = process.env.AMARKTAI_STORAGE_ROOT
    const tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-storage-'))
    process.env.AMARKTAI_STORAGE_ROOT = tempRoot
    const result = checkWritable(LOCAL_STORE_FILES.artifacts)
    expect(result.writable).toBe(true)
    process.env.AMARKTAI_STORAGE_ROOT = oldRoot
    fs.rmSync(tempRoot, { recursive: true, force: true })
  })

  it('Assistant memory and emotion context exists through Studio context route', () => {
    const contextRoute = read('app/api/admin/amarktai-assistant/context/route.ts')
    const studio = read('app/admin/dashboard/page.tsx')
    expect(contextRoute).toContain('AmarktAI Assistant')
    expect(studio).toContain('Memory and emotion state available')
  })

  it('Research Agent routes exist for autonomous app research and Workbench tasks', () => {
    expect(fs.existsSync(path.join(API, 'research/assist/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(API, 'research/status/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(API, 'research/send-to-repo-workbench/route.ts'))).toBe(true)
    const source = read('app/api/admin/research/assist/route.ts')
    expect(source).toContain('generate Workbench tasks')
  })

  it('does not contain the retired assistant name anywhere in app, lib, or prisma source', () => {
    const retired = String.fromCharCode(65, 105, 118, 97)
    const files = [
      ...walk(path.join(ROOT, 'app')),
      ...walk(path.join(ROOT, 'lib')),
      path.resolve(ROOT, '../prisma/schema.prisma'),
    ]
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source.includes(retired), file).toBe(false)
      expect(source.includes(retired.toUpperCase()), file).toBe(false)
    }
  })
})

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(target))
    if (entry.isFile() && /\.(ts|tsx|prisma)$/.test(entry.name)) out.push(target)
  }
  return out
}
