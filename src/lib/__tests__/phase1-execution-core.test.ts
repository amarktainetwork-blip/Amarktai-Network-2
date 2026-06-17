import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = vi.hoisted(() => {
  const stores = new Map<string, Array<Record<string, unknown>>>()
  let sequence = 0
  return {
    stores,
    reset() {
      stores.clear()
      sequence = 0
    },
    id() {
      sequence += 1
      return `execution-test-${sequence}`
    },
  }
})

vi.mock('@/lib/local-json-store', () => {
  const files = {
    memory: 'memory/memory.json',
    approvals: 'approvals/approvals.json',
    artifacts: 'artifacts/artifacts.json',
    research: 'research/research-jobs.json',
    apps: 'apps/apps.json',
    agents: 'agents/agents.json',
    jobs: 'jobs/jobs.json',
    mediaJobs: 'jobs/media-jobs.json',
    executions: 'jobs/executions.json',
  }
  return {
    LOCAL_STORE_FILES: files,
    generateId: () => memory.id(),
    appendRecord: (file: string, record: Record<string, unknown>) => {
      const records = memory.stores.get(file) ?? []
      const saved = { ...record, id: record.id ?? memory.id() }
      records.push(saved)
      memory.stores.set(file, records)
      return saved
    },
    listRecords: (file: string) => [...(memory.stores.get(file) ?? [])],
    findRecord: (file: string, id: string) =>
      (memory.stores.get(file) ?? []).find((record) => record.id === id) ?? null,
    updateRecord: (file: string, id: string, updates: Record<string, unknown>) => {
      const records = memory.stores.get(file) ?? []
      const index = records.findIndex((record) => record.id === id)
      if (index < 0) return null
      records[index] = { ...records[index], ...updates }
      memory.stores.set(file, records)
      return records[index]
    },
  }
})

import {
  completeExecution,
  createExecution,
  evaluateApprovalPolicy,
  getExecution,
  planExecution,
} from '@/lib/execution'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'

const PROHIBITED_DIRECT = new Set([
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'replicate',
  'suno',
  'udio',
  'openrouter',
  'cohere',
  'mistral',
  'nvidia',
  'grok',
  'xai',
])

beforeEach(() => memory.reset())

describe('Phase 1 execution planning', () => {
  it('creates the complete shared execution contract', () => {
    const execution = createExecution({
      appSlug: 'playground',
      actor: { type: 'admin', id: 'admin-1' },
      requestedCapability: 'chat',
      prompt: 'Summarize the launch plan',
      files: ['launch.md'],
      metadata: { source: 'command-center' },
    })

    expect(execution).toMatchObject({
      executionId: expect.any(String),
      appSlug: 'playground',
      actor: { type: 'admin', id: 'admin-1' },
      requestedCapability: 'chat',
      detectedCapability: 'chat',
      input: { prompt: 'Summarize the launch plan', files: ['launch.md'] },
      approval: { required: false, status: 'not_required' },
      riskLevel: 'low',
      status: 'planned',
      artifacts: [],
      jobs: [],
      result: null,
      error: null,
    })
    expect(execution.providerPlan).toHaveProperty('provider')
    expect(execution.modelPlan).toHaveProperty('model')
    expect(execution.events[0].type).toBe('planned')
  })

  it('detects and plans capability-first tasks', () => {
    expect(planExecution({ prompt: 'Patch this repository bug' }).detectedCapability).toBe(
      'repo_edit',
    )
    expect(planExecution({ prompt: 'Build a customer support app' }).detectedCapability).toBe(
      'app_build',
    )
    expect(planExecution({ prompt: 'Research market competitors' }).detectedCapability).toBe(
      'research',
    )
    expect(planExecution({ prompt: 'Create a cinematic video' }).detectedCapability).toBe(
      'video_generation',
    )
  })

  it.each([
    'deployment',
    'pr_create',
    'external_publish',
    'webhook',
    'repo_destructive',
    'voice_clone',
    'avatar_clone',
  ] as const)('requires approval for risky action %s', (action) => {
    const decision = evaluateApprovalPolicy(
      { prompt: 'execute', action },
      action === 'voice_clone' ? 'adult_voice' : 'repo_edit',
      0.1,
    )
    expect(decision).toMatchObject({ required: true, status: 'pending' })
  })

  it.each([
    ['chat', 'generate'],
    ['research', 'generate'],
    ['repo_edit', 'repo_scan'],
    ['image_generation', 'generate'],
  ] as const)('does not require approval for safe %s work', (capability, action) => {
    const decision = evaluateApprovalPolicy(
      { prompt: 'safe task', action },
      capability,
      0.1,
    )
    expect(decision.required).toBe(false)
  })

  it('requires approval for expensive media and policy-sensitive adult media', () => {
    expect(
      evaluateApprovalPolicy(
        { prompt: 'long video', expensiveMedia: true },
        'video_generation',
        0.75,
      ).required,
    ).toBe(true)
    expect(
      evaluateApprovalPolicy(
        { prompt: 'adult image', adultApprovalRequired: true },
        'adult_image',
        0.1,
      ).required,
    ).toBe(true)
  })

  it('blocks adult execution unless adult policy allows it', () => {
    const blocked = planExecution({
      prompt: 'adult text',
      requestedCapability: 'adult_text',
      adultPolicy: 'off',
    })
    expect(blocked.blockedReason).toContain('Adult capability')

    const execution = createExecution({
      prompt: 'adult image',
      requestedCapability: 'adult_image',
      adultPolicy: 'off',
    })
    expect(execution.status).toBe('blocked')
  })

  it('links completed output to an artifact without inventing pending artifacts', () => {
    const execution = createExecution({
      prompt: 'Generate a research report',
      requestedCapability: 'research',
    })
    const completed = completeExecution({
      executionId: execution.executionId,
      result: { answer: 'grounded result' },
      artifact: {
        artifactId: 'artifact-123',
        type: 'research_result',
        url: '/api/artifacts/file/report',
      },
    })

    expect(completed).toMatchObject({
      status: 'completed',
      result: { answer: 'grounded result' },
      artifacts: [{ artifactId: 'artifact-123' }],
    })
    expect(getExecution(execution.executionId)?.artifacts).toHaveLength(1)

    const pending = createExecution({
      prompt: 'Generate a video',
      requestedCapability: 'video_generation',
    })
    expect(pending.artifacts).toEqual([])
  })

  it('never places prohibited direct providers in an execution plan', () => {
    const capabilities = [
      'chat',
      'code',
      'image_generation',
      'video_generation',
      'research',
      'app_build',
      'repo_edit',
    ] as const
    for (const capability of capabilities) {
      const plan = planExecution({ prompt: capability, requestedCapability: capability })
      const providers = [
        plan.providerPlan.provider,
        ...plan.providerPlan.fallbackProviders,
      ].filter((provider): provider is string => Boolean(provider))
      expect(providers.every((provider) => APPROVED_DIRECT_PROVIDER_IDS.includes(provider as never))).toBe(
        true,
      )
      expect(providers.some((provider) => PROHIBITED_DIRECT.has(provider))).toBe(false)
    }
  })
})
