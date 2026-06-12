import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  executeCapability: vi.fn(),
  createArtifact: vi.fn(),
  getArtifact: vi.fn(),
  canViewArtifactUnderAppPolicy: vi.fn(),
  loadAppSafetyConfigFromDB: vi.fn(),
  completeExecution: vi.fn(),
  createExecution: vi.fn(),
  failExecution: vi.fn(),
  getExecution: vi.fn(),
  listExecutions: vi.fn(),
  recordExecutionResponse: vi.fn(),
  startExecution: vi.fn(),
  updateExecution: vi.fn(),
  getSystemRuntimeStatus: vi.fn(),
}))

vi.mock('@/lib/capability-router', () => {
  const capabilities = [
    'chat', 'code', 'file_analysis', 'image_generation', 'image_edit',
    'video_generation', 'image_to_video', 'music_generation', 'lyrics_generation',
    'tts', 'stt', 'voice_response', 'adult_text', 'adult_image', 'adult_video',
    'adult_voice', 'suggestive_image', 'suggestive_video', 'repo_edit',
    'app_build', 'deploy_plan', 'research', 'scrape_website',
  ]
  return {
    CAPABILITY_ROUTER_CAPABILITIES: capabilities,
    executeCapability: mocks.executeCapability,
  }
})
vi.mock('@/lib/artifact-store', () => ({
  createArtifact: mocks.createArtifact,
  getArtifact: mocks.getArtifact,
}))
vi.mock('@/lib/artifact-policy', () => ({
  canViewArtifactUnderAppPolicy: mocks.canViewArtifactUnderAppPolicy,
}))
vi.mock('@/lib/content-filter', () => ({
  loadAppSafetyConfigFromDB: mocks.loadAppSafetyConfigFromDB,
}))
vi.mock('@/lib/execution', () => ({
  completeExecution: mocks.completeExecution,
  createExecution: mocks.createExecution,
  failExecution: mocks.failExecution,
  getExecution: mocks.getExecution,
  listExecutions: mocks.listExecutions,
  recordExecutionResponse: mocks.recordExecutionResponse,
  startExecution: mocks.startExecution,
  updateExecution: mocks.updateExecution,
}))
vi.mock('@/lib/system-runtime-status', () => ({
  getSystemRuntimeStatus: mocks.getSystemRuntimeStatus,
}))

import { commandCenterErrorMessage, runCommandCenter } from '@/lib/command-center'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

function execution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exec_1',
    executionId: 'exec_1',
    appSlug: 'amarktai-network',
    appId: null,
    actor: { type: 'admin', label: 'Command Center' },
    requestedCapability: 'chat',
    detectedCapability: 'chat',
    action: 'generate',
    input: { prompt: 'Help me', files: [], metadata: { source: 'command_center' } },
    providerPlan: {
      provider: 'groq',
      fallbackProviders: ['together'],
      reason: 'Connected approved route.',
    },
    modelPlan: {
      model: 'llama',
      fallbackModels: ['fallback'],
      task: null,
      costMode: 'balanced',
    },
    approval: {
      required: false,
      status: 'not_required',
      reason: null,
      approvalId: null,
    },
    riskLevel: 'low',
    estimatedCostUsd: 0,
    status: 'planned',
    jobs: [],
    artifacts: [],
    events: [],
    result: null,
    error: null,
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

function artifact(id = 'artifact_1') {
  return {
    id,
    executionId: 'exec_1',
    jobId: null,
    appSlug: 'amarktai-network',
    appId: null,
    workspaceId: null,
    type: 'text',
    subType: 'chat',
    title: 'Command result',
    description: '',
    summary: '',
    provider: 'groq',
    model: 'llama',
    capability: 'chat',
    traceId: '',
    storageDriver: 'local',
    storagePath: '',
    storageUrl: '',
    downloadUrl: `/api/admin/artifacts/${id}/download`,
    previewUrl: `/api/admin/artifacts/${id}/download`,
    mimeType: 'text/plain',
    fileSize: 10,
    fileSizeBytes: 10,
    previewable: true,
    downloadable: true,
    status: 'completed',
    errorMessage: '',
    costUsdCents: 0,
    metadata: {},
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    updatedAt: new Date('2026-06-12T00:00:00.000Z'),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getExecution.mockReturnValue(null)
  mocks.listExecutions.mockReturnValue([])
  mocks.loadAppSafetyConfigFromDB.mockResolvedValue({
    safeMode: true,
    adultMode: false,
    suggestiveMode: false,
  })
  mocks.canViewArtifactUnderAppPolicy.mockResolvedValue(true)
  mocks.createExecution.mockReturnValue(execution())
  mocks.startExecution.mockImplementation((id: string) =>
    execution({ executionId: id, id, status: 'running' }),
  )
  mocks.executeCapability.mockResolvedValue({
    success: true,
    capability: 'chat',
    readiness: 'READY',
    provider: 'groq',
    model: 'llama',
    outputType: 'text',
    output: 'Done',
    artifactId: 'artifact_1',
    fallbackUsed: false,
  })
  mocks.recordExecutionResponse.mockReturnValue(execution({
    status: 'completed',
    result: { success: true, output: 'Done', artifactId: 'artifact_1' },
    artifacts: [{ artifactId: 'artifact_1', createdAt: '2026-06-12T00:00:00.000Z' }],
  }))
  mocks.getArtifact.mockImplementation(async (id: string) =>
    id === 'artifact_1' ? artifact(id) : null,
  )
})

describe('Phase 3 Command Center', () => {
  it('creates a safe execution and returns capability, route, model, result, and artifacts', async () => {
    const result = await runCommandCenter({
      prompt: 'Help me',
      appSlug: 'amarktai-network',
      capability: 'chat',
    })

    expect(mocks.createExecution).toHaveBeenCalledWith(expect.objectContaining({
      requestedCapability: 'chat',
      prompt: 'Help me',
      adultPolicy: 'off',
    }))
    expect(mocks.executeCapability).toHaveBeenCalled()
    expect(result).toMatchObject({
      executionId: 'exec_1',
      status: 'completed',
      capability: 'chat',
      providerPlan: { provider: 'groq' },
      modelPlan: { model: 'llama' },
    })
    expect(result.artifacts.map((item) => item.id)).toEqual(['artifact_1'])
  })

  it('returns approval requirements without dispatching risky work', async () => {
    mocks.createExecution.mockReturnValue(execution({
      action: 'deployment',
      status: 'awaiting_approval',
      approval: {
        required: true,
        status: 'pending',
        reason: 'Deployments require explicit approval.',
        approvalId: 'approval_1',
      },
    }))

    const result = await runCommandCenter({
      prompt: 'Deploy the release',
      action: 'deployment',
    })

    expect(result.status).toBe('awaiting_approval')
    expect(result.approval.required).toBe(true)
    expect(mocks.executeCapability).not.toHaveBeenCalled()
  })

  it('keeps pending provider jobs queued without a completed artifact', async () => {
    mocks.executeCapability.mockResolvedValue({
      success: true,
      capability: 'video_generation',
      readiness: 'READY',
      provider: 'genx',
      model: 'video-model',
      outputType: 'video',
      output: null,
      jobId: 'job_1',
      status: 'pending',
      fallbackUsed: false,
    })
    mocks.createExecution.mockReturnValue(execution({
      requestedCapability: 'video_generation',
      detectedCapability: 'video_generation',
    }))
    mocks.recordExecutionResponse.mockReturnValue(execution({
      requestedCapability: 'video_generation',
      detectedCapability: 'video_generation',
      status: 'queued',
      jobs: [{ jobId: 'job_1', status: 'pending' }],
      artifacts: [],
    }))

    const result = await runCommandCenter({
      prompt: 'Create a short video',
      quickAction: 'video',
    })

    expect(result.status).toBe('queued')
    expect(result.jobs).toEqual([{ jobId: 'job_1', status: 'pending' }])
    expect(result.artifacts).toEqual([])
  })

  it('preserves honest unavailable readiness in failed execution results', async () => {
    mocks.executeCapability.mockResolvedValue({
      success: false,
      capability: 'adult_video',
      readiness: 'UNAVAILABLE',
      provider: null,
      model: null,
      outputType: 'video',
      output: null,
      fallbackUsed: false,
      error: 'No approved adult-video execution adapter is configured.',
    })
    const failed = execution({
      requestedCapability: 'adult_video',
      detectedCapability: 'adult_video',
      status: 'failed',
      error: 'No approved adult-video execution adapter is configured.',
    })
    mocks.createExecution.mockReturnValue(execution({
      requestedCapability: 'adult_video',
      detectedCapability: 'adult_video',
    }))
    mocks.recordExecutionResponse.mockReturnValue(failed)
    mocks.updateExecution.mockImplementation((_id: string, updates: Record<string, unknown>) => ({
      ...failed,
      ...updates,
    }))

    const result = await runCommandCenter({
      prompt: 'Create lawful adult video',
      capability: 'adult_video',
    })

    expect(result.status).toBe('failed')
    expect(result.readiness).toBe('UNAVAILABLE')
    expect(result.error).toContain('No approved adult-video')
  })

  it('reuses completed policy-visible artifacts as execution context', async () => {
    const sourceArtifact = artifact('source_1')
    mocks.getArtifact.mockImplementation(async (id: string) => {
      if (id === 'source_1') return sourceArtifact
      if (id === 'artifact_1') return artifact(id)
      return null
    })

    await runCommandCenter({
      prompt: 'Use this result as context',
      artifactIds: ['source_1'],
    })

    expect(mocks.createExecution).toHaveBeenCalledWith(expect.objectContaining({
      files: ['artifact:source_1'],
      metadata: expect.objectContaining({
        artifactIds: ['source_1'],
        reusedArtifacts: [expect.objectContaining({ id: 'source_1' })],
      }),
    }))
    expect(mocks.executeCapability).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.stringContaining('source_1'),
      files: ['artifact:source_1'],
    }))
  })

  it('passes explicit adult app policy to the planner and router', async () => {
    mocks.loadAppSafetyConfigFromDB.mockResolvedValue({
      safeMode: false,
      adultMode: true,
      suggestiveMode: true,
    })
    mocks.createExecution.mockReturnValue(execution({
      requestedCapability: 'adult_text',
      detectedCapability: 'adult_text',
    }))

    await runCommandCenter({
      prompt: 'Lawful adult content',
      capability: 'adult_text',
      appSlug: 'companion-app',
    })

    expect(mocks.createExecution).toHaveBeenCalledWith(expect.objectContaining({
      adultPolicy: 'full_adult_app_mode',
    }))
    expect(mocks.executeCapability).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'companion-app',
      adultMode: true,
      safeMode: false,
    }))
  })

  it('does not dispatch adult work when the app policy blocks the plan', async () => {
    mocks.createExecution.mockReturnValue(execution({
      requestedCapability: 'adult_text',
      detectedCapability: 'adult_text',
      status: 'blocked',
      error: 'Adult execution is disabled by app policy.',
      events: [{
        id: 'exec_1:1',
        type: 'blocked',
        message: 'Adult execution is disabled by app policy.',
        level: 'warning',
        at: '2026-06-12T00:00:00.000Z',
      }],
    }))

    const result = await runCommandCenter({
      prompt: 'Adult content',
      capability: 'adult_text',
      appSlug: 'amarktai-network',
    })

    expect(mocks.createExecution).toHaveBeenCalledWith(expect.objectContaining({
      adultPolicy: 'off',
    }))
    expect(result).toMatchObject({ status: 'blocked', readiness: 'BLOCKED' })
    expect(mocks.executeCapability).not.toHaveBeenCalled()
  })

  it('keeps the route, provider policy, and removed voice authentication contract intact', () => {
    const page = read('app/admin/dashboard/command/page.tsx')
    const component = read('components/dashboard/CommandCenter.tsx')
    const service = read('lib/command-center.ts')
    const commandApi = read('app/api/admin/command/route.ts')

    expect(page).toContain('<CommandCenter />')
    expect(component).toContain('/api/admin/playground')
    expect(component).toContain('Approval status')
    expect(component).toContain('Run history')
    expect(component).toContain('/reuse')
    expect(service).toContain('executeCapability')
    expect(service).toContain('recordExecutionResponse')
    expect(commandApi).not.toContain('command-jobs.json')

    const corpus = [page, component, service, commandApi].join('\n').toLowerCase()
    expect(corpus).not.toContain(['voice', 'login'].join('-'))
    for (const prohibited of ['openai', 'anthropic', 'gemini', 'replicate']) {
      expect(component.toLowerCase()).not.toContain(`'${prohibited}'`)
    }
  })

  it('sanitizes storage implementation failures for the operator error panel', () => {
    expect(commandCenterErrorMessage(new Error(
      'Invalid prisma.artifact.create invocation: Environment variable not found: DATABASE_URL',
    ))).toBe('Artifact metadata storage is not configured.')
  })
})
