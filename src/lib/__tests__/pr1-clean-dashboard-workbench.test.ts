import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { APPROVED_AI_PROVIDERS, APPROVED_WORKBENCH_MODELS } from '@/lib/approved-ai-catalog'
import { CANONICAL_PROVIDERS } from '@/lib/provider-catalog'
import { createGitAskPass, getRepoModelChoices, parseGitHubRepoUrl, scrubSecrets } from '@/lib/repo-workbench'

const ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('PR 1 clean dashboard', () => {
  const canonical = [
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
  ]

  const deletedRoutes = [
    'build-studio',
    'workspace',
    'brain',
    'genx-models',
    'integrations',
    'access',
    'deployments',
    'emotions',
    'events',
    'lab',
    'labs',
    'media-hub',
    'media',
    'monitor',
    'onboarding',
    'operations',
    'readiness',
    'voice',
    'video',
    'music-studio',
    'aiva',
    'amarktai-assistant',
    'repo-workbench',
    'command-center',
    'diagnostics',
    'creative-studio',
    'memory',
  ]

  it('has only the ten canonical dashboard sections', () => {
    const pageFiles = fs.readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(pageFiles).toEqual([
      'actions',
      'agents',
      'ai-models',
      'apps',
      'assistant',
      'costs',
      'settings',
      'system',
      'workbench',
    ])

    for (const relPath of canonical) {
      expect(fs.existsSync(path.join(ROOT, relPath)), relPath).toBe(true)
    }
  })

  it('deletes old duplicate dashboard pages instead of redirecting them', () => {
    for (const route of deletedRoutes) {
      expect(fs.existsSync(path.join(ROOT, route)), route).toBe(false)
    }
  })

  it('deletes duplicate GitHub routes replaced by Workbench', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../app/api/admin/github'))).toBe(false)
    expect(fs.existsSync(path.resolve(__dirname, '../../app/api/admin/repo-workbench/github/token'))).toBe(false)
  })

  it('uses the canonical nav labels only', () => {
    const layout = read('layout.tsx')
    const navSource = fs.readFileSync(path.resolve(__dirname, '../dashboard-nav.ts'), 'utf8')
    for (const label of ['Overview', 'Workbench', 'Apps', 'Agents', 'AI Models', 'Assistant', 'Costs', 'Actions', 'Settings', 'System']) {
      expect(navSource).toContain(label)
    }
    expect(layout).toContain('DASHBOARD_NAV_ITEMS')
    for (const oldLabel of ['Command Center', 'Creative Studio', 'Diagnostics', 'Memory', 'Research', 'Repo Workbench']) {
      expect(navSource).not.toContain(oldLabel)
    }
  })

  it('does not show internal recovery wording or old assistant naming', () => {
    const visibleSource = canonical.map(read).join('\n')
    for (const banned of ['Ready to wire', 'Backend pending', 'Phase 2', 'fake green lights', 'blockers', 'Aiva', 'AIVA']) {
      expect(visibleSource).not.toContain(banned)
    }
    expect(visibleSource).toContain('AmarktAI Assistant')
  })
})

describe('PR 1 approved provider catalog', () => {
  const approvedLabels = ['GenX', 'Hugging Face', 'Qwen/DashScope', 'MiniMax/Mimo', 'Groq', 'Together AI', 'OpenAI']
  const bannedLabels = ['Anthropic', 'Gemini', 'DeepSeek', 'Grok', 'xAI', 'OpenRouter', 'Mistral', 'Cohere', 'NVIDIA', 'Replicate', 'Suno', 'Udio']

  it('has one approved provider catalog', () => {
    expect(APPROVED_AI_PROVIDERS.map((provider) => provider.displayName)).toEqual(approvedLabels)
    expect(CANONICAL_PROVIDERS.map((provider) => provider.displayName)).toEqual(approvedLabels)
  })

  it('does not expose banned providers in dashboard provider sources', () => {
    const sources = [
      fs.readFileSync(path.resolve(__dirname, '../approved-ai-catalog.ts'), 'utf8'),
      fs.readFileSync(path.resolve(__dirname, '../provider-catalog.ts'), 'utf8'),
      fs.readFileSync(path.resolve(__dirname, '../ai-model-catalog.ts'), 'utf8'),
      read('settings/page.tsx'),
      read('ai-models/page.tsx'),
      read('workbench/page.tsx'),
    ].join('\n')

    for (const banned of bannedLabels) {
      expect(sources).not.toContain(banned)
    }
  })

  it('keeps Hugging Face task-based in the UI', () => {
    const source = read('ai-models/page.tsx')
    expect(source).toContain('Hugging Face task routes')
    expect(source).toContain('taskLabel')
    expect(source).not.toContain('Custom model ID')
  })

  it('Workbench model choices use approved providers only', async () => {
    const choices = await getRepoModelChoices()
    const approvedKeys = new Set(APPROVED_AI_PROVIDERS.map((provider) => provider.key))
    expect(choices.all.length).toBeGreaterThan(0)
    for (const model of choices.all) {
      expect(approvedKeys.has(model.provider as never), model.provider).toBe(true)
    }
    expect(APPROVED_WORKBENCH_MODELS.map((model) => model.costMode).sort()).toContain('cheap')
    expect(APPROVED_WORKBENCH_MODELS.map((model) => model.costMode).sort()).toContain('balanced')
    expect(APPROVED_WORKBENCH_MODELS.map((model) => model.costMode).sort()).toContain('premium')
  })
})

describe('PR 1 Workbench simple flow and token safety', () => {
  const source = read('workbench/page.tsx')

  it('shows the required main controls', () => {
    for (const text of [
      'Repo selector',
      'Branch selector',
      'AI/model selector',
      'Cost mode selector',
      'Prompt box',
      'Plan fix',
      'Apply fix',
      'Run checks',
      'Create PR',
      'Merge',
      'Deploy',
    ]) {
      expect(source).toContain(text)
    }
  })

  it('has the required output tabs', () => {
    for (const text of ['Plan', 'Files changed', 'Diff', 'Checks', 'PR', 'Deploy log']) {
      expect(source).toContain(text)
    }
  })

  it('does not ask for a GitHub token in Workbench', () => {
    expect(source).not.toContain('GitHub token')
    expect(source).not.toContain('GITHUB_TOKEN')
    expect(source).not.toContain('PAT')
    expect(source).not.toContain('type="password"')
  })

  it('parses GitHub repos without embedding tokens in the remote URL', () => {
    expect(parseGitHubRepoUrl('https://github.com/owner/repo.git')).toEqual({
      owner: 'owner',
      repo: 'repo',
      remoteUrl: 'https://github.com/owner/repo.git',
    })
  })

  it('uses safe askpass auth and sanitizes logs', async () => {
    const askPassPath = await createGitAskPass()
    const script = fs.readFileSync(askPassPath, 'utf8')
    fs.rmSync(askPassPath, { force: true })

    expect(script).toContain('GIT_ASKPASS_TOKEN')
    expect(script).not.toContain('ghp_secret')
    expect(scrubSecrets('clone failed for https://x-access-token:ghp_secret123@github.com/o/r.git Bearer sk-secret')).not.toContain('ghp_secret123')
    expect(scrubSecrets('token=ghp_secret123')).toContain('token=[redacted]')
  })
})
