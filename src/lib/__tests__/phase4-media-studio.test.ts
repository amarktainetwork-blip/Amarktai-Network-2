import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getArtifact: vi.fn(),
  getExecution: vi.fn(),
  listExecutions: vi.fn(),
}))

vi.mock('@/lib/artifact-store', () => ({
  getArtifact: mocks.getArtifact,
}))
vi.mock('@/lib/execution', () => ({
  getExecution: mocks.getExecution,
  listExecutions: mocks.listExecutions,
}))

import { mediaStudioResponse } from '@/lib/media-studio'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'

const ROOT = path.resolve(__dirname, '../../')
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

function execution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exec_media',
    executionId: 'exec_media',
    appSlug: 'amarktai-network',
    appId: null,
    actor: { type: 'admin', label: 'Media Studio' },
    requestedCapability: 'image_generation',
    detectedCapability: 'image_generation',
    action: 'generate',
    input: { prompt: 'Create an image', files: [], metadata: { source: 'media_studio' } },
    providerPlan: { provider: 'genx', fallbackProviders: ['qwen'], reason: 'Approved media route.' },
    modelPlan: { model: 'image-model', fallbackModels: [], task: null, costMode: 'balanced' },
    approval: { required: false, status: 'not_required', reason: null, approvalId: null },
    riskLevel: 'medium',
    estimatedCostUsd: 0.1,
    status: 'completed',
    jobs: [],
    artifacts: [{ artifactId: 'artifact_media', createdAt: '2026-06-12T00:00:00.000Z' }],
    events: [],
    result: { success: true, readiness: 'READY', artifactId: 'artifact_media' },
    error: null,
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
    completedAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getExecution.mockReturnValue(execution())
  mocks.listExecutions.mockReturnValue([execution()])
  mocks.getArtifact.mockResolvedValue({
    id: 'artifact_media',
    title: 'Generated image',
    type: 'image',
    status: 'completed',
    previewUrl: '/api/admin/artifacts/artifact_media/download',
    downloadUrl: '/api/admin/artifacts/artifact_media/download',
  })
})

describe('Phase 4 Media Studio execution contract', () => {
  it('returns execution, route, approval, job, result, and artifact metadata', async () => {
    const response = await mediaStudioResponse('exec_media')
    expect(response).toMatchObject({
      executionId: 'exec_media',
      status: 'completed',
      readiness: 'READY',
      capability: 'image_generation',
      providerPlan: { provider: 'genx' },
      modelPlan: { model: 'image-model' },
      approval: { required: false },
    })
    expect(response?.artifacts[0]).toMatchObject({
      id: 'artifact_media',
      previewUrl: expect.any(String),
      downloadUrl: expect.any(String),
    })
  })

  it('does not claim artifacts for pending media jobs', async () => {
    mocks.getExecution.mockReturnValue(execution({
      status: 'queued',
      jobs: [{ jobId: 'job_1', status: 'processing', pollUrl: '/api/brain/media-jobs/job_1' }],
      artifacts: [],
      result: { success: true, jobStatus: 'processing', artifactId: null },
      completedAt: null,
    }))
    const response = await mediaStudioResponse('exec_media')
    expect(response?.status).toBe('queued')
    expect(response?.job?.status).toBe('processing')
    expect(response?.artifacts).toEqual([])
  })
})

describe('Phase 4 Media Studio product coverage', () => {
  it('keeps the dashboard route and required production controls', () => {
    const page = read('app/admin/dashboard/studio/page.tsx')
    for (const term of [
      'App context',
      'Choose a task and create.',
      'Project',
      'Brand kit',
      'Image edit',
      "label: 'Music'",
      "label: 'Voice'",
      "label: 'Avatar'",
      "setMode('normal')",
      "setMode('adult')",
      'Capability readiness',
      'Approval',
      'Execution / job progress',
      'Artifact result',
      'Long-form / multi-scene',
      'Scene count',
    ]) expect(page).toContain(term)
    expect(page).not.toContain('Media job history')
    expect(page).not.toContain('Reusable artifacts')
    expect(page).not.toContain('Model, optional')
  })

  it('wires Studio execution to the canonical execution and artifact systems', () => {
    const route = read('app/api/admin/studio/execute/route.ts')
    const service = read('lib/media-studio.ts')
    for (const term of [
      'createExecution',
      'recordExecutionResponse',
      'mediaStudioResponse',
      'listMediaStudioHistory',
      'executionId',
    ]) expect(route).toContain(term)
    expect(service).toContain('providerPlan')
    expect(route).not.toContain('createLocalMediaJob')
    expect(route).not.toContain('persistCanonicalMediaResult')
  })

  it('dispatches every required JSON media flow through the canonical orchestrator', () => {
    const route = read('app/api/admin/studio/execute/route.ts')
    const contracts = read('lib/capability-contracts.ts')
    expect(route).toContain('executeCapabilityOrchestration')
    expect(route).toContain('videoPlanPost')
    expect(route).toContain('providerAttempts')
    expect(route).not.toContain('imagePost')
    expect(route).not.toContain('musicPost')
    for (const capability of [
      'image_generation',
      'image_edit',
      'suggestive_image',
      'music_generation',
      'lyrics_generation',
      'tts',
      'video_generation',
      'adult_image',
      'adult_video',
      'adult_voice',
    ]) expect(contracts).toContain(`'${capability}'`)
  })

  it('creates and links canonical STT transcript executions and artifacts', () => {
    const wrapper = read('app/api/admin/studio/stt/route.ts')
    const producer = read('app/api/brain/stt/route.ts')
    expect(wrapper).toContain("requestedCapability: 'stt'")
    expect(wrapper).toContain('recordExecutionResponse')
    expect(producer).toContain('executeCapability')
    expect(producer).toContain('executionId')
    expect(read('lib/orchestrator.ts')).toContain("return 'transcript'")
  })

  it('threads execution IDs into every completed media producer', () => {
    for (const file of [
      'app/api/brain/image/route.ts',
      'app/api/brain/suggestive-image/route.ts',
      'app/api/admin/music-studio/route.ts',
    ]) expect(read(file), file).toContain('executionId')
    for (const file of [
      'app/api/brain/image-edit/route.ts',
      'app/api/brain/video/route.ts',
      'app/api/brain/video-generate/route.ts',
      'app/api/brain/tts/route.ts',
      'app/api/brain/adult-image/route.ts',
    ]) expect(read(file), file).toContain('delegateJsonCapability')
    expect(read('lib/brain-route-delegate.ts')).toContain('executionId')
    expect(read('app/api/brain/stt/route.ts')).toContain('executionId')
  })

  it('does not allow Studio Music to complete without a downloadable artifact', () => {
    const route = read('app/api/admin/music-studio/route.ts')
    expect(route).toContain('requiresMusicArtifact')
    expect(route).toContain('hasMusicArtifact')
    expect(route).toContain('missingMusicArtifact')
    expect(route).toContain('Failed - no completed audio artifact.')
    expect(route).toContain("jobStatus: processing ? 'processing' : completed ? 'completed' : 'failed'")
  })

  it('reconciles completed provider jobs into executions', () => {
    expect(read('lib/media-job-store.ts')).toContain('recordExecutionResponse')
    expect(read('app/api/brain/video-generate/[jobId]/route.ts')).toContain('recordExecutionResponse')
  })

  it('keeps adult and suggestive media app-policy gated', () => {
    const route = read('app/api/admin/studio/execute/route.ts')
    const page = read('app/admin/dashboard/studio/page.tsx')
    expect(route).toContain('loadAppSafetyConfigFromDB')
    expect(route).toContain("'full_adult_app_mode'")
    expect(page).toContain('policy.safeMode')
    expect(page).toContain('policy.adultMode')
    expect(page).toContain('policy.suggestiveMode')
    expect(read('app/api/brain/adult-image/route.ts')).toContain('delegateJsonCapability')
    expect(read('lib/orchestrator.ts')).toContain('scanContent')
  })

  it('uses only approved direct providers and keeps removed voice authentication absent', () => {
    expect(APPROVED_DIRECT_PROVIDER_IDS).toEqual([
      'genx', 'huggingface', 'mimo', 'groq', 'together',
    ])
    const corpus = [
      read('app/admin/dashboard/studio/page.tsx'),
      read('app/api/admin/studio/execute/route.ts'),
      read('lib/media-studio.ts'),
    ].join('\n').toLowerCase()
    expect(corpus).not.toContain(['voice', 'login'].join('-'))
    for (const prohibited of ['openai', 'anthropic', 'gemini', 'deepseek', 'minimax', 'replicate', 'suno', 'udio']) {
      expect(corpus).not.toContain(`'${prohibited}'`)
    }
  })
})
