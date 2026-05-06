import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { OPERATOR_AGENTS, assignAgentToAppPackage, listOperatorAgents } from '@/lib/agent-registry'
import { confirmAppAiPackage } from '@/lib/app-ai-package'
import { summarizeCostRuns, type CostRunRecord } from '@/lib/cost-tracking'
import { LIVE_ROUTING_CAPABILITIES, routeLiveModel } from '@/lib/live-ai-routing'
import { getAvailablePackageChecks, parseGitHubRepoUrl, scrubSecrets } from '@/lib/repo-workbench'

const ROOT = path.resolve(__dirname, '../../')
const DASHBOARD = path.join(ROOT, 'app/admin/dashboard')
const API = path.join(ROOT, 'app/api/admin')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('PR 2 Workbench live flow', () => {
  const workbenchSource = read('app/admin/dashboard/workbench/page.tsx')

  it('shows the full safe operator sequence', () => {
    for (const text of [
      'Repo selector',
      'Branch selector',
      'AI/model selector',
      'Cost mode selector',
      'Prompt box',
      'Plan fix',
      'Generate patch',
      'Apply fix',
      'Run checks',
      'Commit',
      'Push',
      'Create PR',
      'Merge',
      'Deploy',
    ]) {
      expect(workbenchSource).toContain(text)
    }
  })

  it('has live Workbench endpoints for each step', () => {
    for (const relPath of [
      'repo-workbench/import/route.ts',
      'repo-workbench/[workspaceId]/plan/route.ts',
      'repo-workbench/[workspaceId]/patch/route.ts',
      'repo-workbench/[workspaceId]/apply-patch/route.ts',
      'repo-workbench/[workspaceId]/checks/route.ts',
      'repo-workbench/[workspaceId]/run-check/route.ts',
      'repo-workbench/[workspaceId]/commit/route.ts',
      'repo-workbench/[workspaceId]/push/route.ts',
      'repo-workbench/[workspaceId]/pr/route.ts',
      'repo-workbench/[workspaceId]/merge/route.ts',
      'repo-workbench/[workspaceId]/deploy/route.ts',
    ]) {
      expect(fs.existsSync(path.join(API, relPath)), relPath).toBe(true)
    }
  })

  it('keeps GitHub token out of Workbench and redacts secrets from logs', () => {
    expect(workbenchSource).not.toContain('type="password"')
    expect(workbenchSource).not.toContain('GITHUB_TOKEN')
    expect(workbenchSource).not.toContain('PAT')
    expect(parseGitHubRepoUrl('https://github.com/amarktainetwork-blip/Amarktai-Network-2.git').remoteUrl).toBe('https://github.com/amarktainetwork-blip/Amarktai-Network-2.git')
    expect(scrubSecrets('https://x-access-token:ghp_secret123@github.com/o/r.git token=ghp_secret123 Bearer sk-secret')).not.toContain('ghp_secret123')
  })

  it('runs only available package checks', async () => {
    const tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-checks-'))
    const repo = path.join(tempRoot, 'repos', 'o__r__main')
    fs.mkdirSync(repo, { recursive: true })
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ scripts: { lint: 'next lint', build: 'next build' } }))
    const previousRoot = process.env.REPO_WORKSPACE_ROOT
    process.env.REPO_WORKSPACE_ROOT = tempRoot

    const { prisma } = await import('@/lib/prisma')
    const repoWorkspace = prisma.repoWorkspace as unknown as { findUnique: unknown }
    const original = repoWorkspace.findUnique
    repoWorkspace.findUnique = async () => ({ id: 'w1', owner: 'o', repo: 'r', branch: 'main', localPath: repo, remoteUrl: '', provider: 'github', currentCommit: '', status: 'ready', lastSyncedAt: null, createdAt: new Date(), updatedAt: new Date() })
    await expect(getAvailablePackageChecks('w1')).resolves.toEqual(['lint', 'build'])
    repoWorkspace.findUnique = original
    process.env.REPO_WORKSPACE_ROOT = previousRoot
    fs.rmSync(tempRoot, { recursive: true, force: true })
  })
})

describe('PR 2 Assistant, apps, agents, routing, and costs', () => {
  it('brands the assistant and exposes model, cost, voice, and context controls', () => {
    const source = read('app/admin/dashboard/assistant/page.tsx')
    expect(source).toContain('AmarktAI Assistant')
    expect(source).toContain('Provider/model selector')
    expect(source).toContain('Cost mode selector')
    expect(source).toContain('Voice selector')
    expect(source).toContain('/api/admin/amarktai-assistant/context')
    expect(source).not.toContain('Aiva')
    expect(source).not.toContain('AIVA')
  })

  it('routes with approved providers, fallback chains, estimates, and reasons', () => {
    const route = routeLiveModel({ capability: 'coding', appSlug: 'amarktai-network', costMode: 'balanced' })
    const approved = new Set(APPROVED_AI_PROVIDERS.map((provider) => provider.key))
    expect(route.selectedProvider && approved.has(route.selectedProvider)).toBe(true)
    expect(route.selectedModel).toBeTruthy()
    expect(route.fallbackChain.length).toBeGreaterThan(0)
    expect(route.estimatedCostUsd).toBeGreaterThan(0)
    expect(route.reason).toContain('balanced')
    expect(LIVE_ROUTING_CAPABILITIES).toContain('adult_video')
  })

  it('keeps Hugging Face task-based in normal routing UI', () => {
    const modelCatalog = read('lib/ai-model-catalog.ts')
    const aiModelsPage = read('app/admin/dashboard/ai-models/page.tsx')
    expect(modelCatalog).toContain('HUGGING_FACE_TASK_ROUTES')
    expect(aiModelsPage).toContain('Hugging Face task routes')
    expect(aiModelsPage).not.toContain('Custom model ID')
  })

  it('creates app AI package confirmation for strategy, fallback, budgets, and adult policy', () => {
    const confirmation = confirmAppAiPackage({
      appSlug: 'demo-app',
      appName: 'Demo App',
      domain: 'demo.example',
      appType: 'coding',
      safetyProfile: 'standard',
      enabledCapabilityIds: ['coding'],
      allowedCapabilities: ['coding'],
      modelStrategy: 'balanced',
      selections: [{ capabilityId: 'coding', provider: 'genx', modelId: 'auto:coding-balanced', fallbackProvider: 'openai', fallbackModelId: 'gpt-4o' }],
      budget: { mode: 'balanced', monthlyUsd: 100, maxPerRequestUsd: 0.25, requiresApprovalAboveUsd: 0.25 },
      adultPolicy: 'off',
      permissions: {
        canChat: true,
        canUseTools: true,
        canUseRepo: true,
        canUseMedia: false,
        canUseVoice: false,
        canUseAdult: false,
        canSendMarketing: false,
        requiresApprovalForSpend: true,
        requiresApprovalForExternalActions: true,
      },
      status: 'ready',
      blockers: [],
    })
    expect(confirmation.canSave).toBe(true)
    expect(confirmation.monthlyBudgetUsd).toBe(100)
    expect(confirmation.adultPolicy).toBe('off')
  })

  it('has the required operator agent registry and app assignment', () => {
    expect(OPERATOR_AGENTS.map((agent) => agent.name)).toEqual([
      'Coding Agent',
      'Research Agent',
      'Creative Agent',
      'Marketing Agent',
      'App Operator Agent',
      'System/VPS Agent',
      'Safety/Policy Agent',
    ])
    expect(listOperatorAgents('demo-app')[0].executionRoute).toBeTruthy()
    expect(assignAgentToAppPackage('coding-agent', 'Demo App').appSlug).toBe('demo-app')
  })

  it('summarizes costs by app, provider, agent, and expensive runs', () => {
    const now = new Date().toISOString()
    const runs: CostRunRecord[] = [
      { id: '1', provider: 'genx', model: 'auto:coding-balanced', appSlug: 'app-a', agentId: 'coding-agent', capability: 'coding', runType: 'workbench', costMode: 'balanced', estimatedCostUsd: 0.12, createdAt: now },
      { id: '2', provider: 'openai', model: 'gpt-4o', appSlug: 'app-b', agentId: 'creative-agent', capability: 'image', runType: 'media', costMode: 'premium', estimatedCostUsd: 0.75, createdAt: now },
    ]
    const summary = summarizeCostRuns(runs, 1)
    expect(summary.todaySpendUsd).toBe(0.87)
    expect(summary.byApp['app-a']).toBe(0.12)
    expect(summary.byProvider.openai).toBe(0.75)
    expect(summary.byAgent['creative-agent']).toBe(0.75)
    expect(summary.recentExpensiveRuns[0].id).toBe('2')
  })
})

describe('PR 2 tools and banned dashboard clutter', () => {
  it('keeps research and Webdock outside AI providers', () => {
    const providerLabels = APPROVED_AI_PROVIDERS.map((provider) => provider.displayName)
    expect(providerLabels).not.toContain('Firecrawl')
    expect(providerLabels).not.toContain('Crawl4AI')
    expect(providerLabels).not.toContain('Playwright')
    expect(providerLabels).not.toContain('Webdock')
    expect(read('app/admin/dashboard/system/page.tsx')).toContain('Webdock')
    expect(read('app/admin/dashboard/system/page.tsx')).toContain('Firecrawl')
  })

  it('does not show banned providers or old assistant naming in visible dashboard pages', () => {
    const visible = [
      'page.tsx',
      'workbench/page.tsx',
      'apps/page.tsx',
      'agents/page.tsx',
      'ai-models/page.tsx',
      'assistant/page.tsx',
      'costs/page.tsx',
      'actions/page.tsx',
      'settings/page.tsx',
      'system/page.tsx',
    ].map((relPath) => fs.readFileSync(path.join(DASHBOARD, relPath), 'utf8')).join('\n')

    for (const banned of ['Anthropic', 'Gemini', 'DeepSeek', 'Grok', 'xAI', 'OpenRouter', 'Mistral', 'Cohere', 'NVIDIA', 'Replicate', 'Suno', 'Udio', 'Aiva', 'AIVA', 'Ready to wire', 'Backend pending', 'Phase 2', 'fake green lights', 'blockers']) {
      expect(visible).not.toContain(banned)
    }
  })
})
