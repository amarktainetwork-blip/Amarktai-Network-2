import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  executeCapability: vi.fn(),
  ensureExecution: vi.fn(),
  startExecution: vi.fn(),
  recordExecutionResponse: vi.fn(),
  getSession: vi.fn(),
  createArtifact: vi.fn(),
  execFile: vi.fn(),
}))

vi.mock('@/lib/capability-router', () => ({
  executeCapability: mocks.executeCapability,
}))

vi.mock('@/lib/execution', () => ({
  ensureExecution: mocks.ensureExecution,
  startExecution: mocks.startExecution,
  recordExecutionResponse: mocks.recordExecutionResponse,
}))

vi.mock('@/lib/session', () => ({
  getSession: mocks.getSession,
}))

vi.mock('@/lib/artifact-store', () => ({
  createArtifact: mocks.createArtifact,
}))

vi.mock('child_process', () => ({
  execFile: mocks.execFile,
}))

describe('research runtime contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureExecution.mockReturnValue({ executionId: 'exec-1' })
    mocks.startExecution.mockReturnValue(undefined)
    mocks.recordExecutionResponse.mockReturnValue({ executionId: 'exec-1' })
    mocks.getSession.mockResolvedValue({ isLoggedIn: true })
    mocks.execFile.mockImplementation((command, args, options, callback) => {
      const done = typeof options === 'function' ? options : callback
      done?.(null, {
        stdout: JSON.stringify({
          url: 'https://example.com',
          title: 'Example',
          content: 'Example content',
          method: 'python-crawler',
        }),
        stderr: '',
      })
      return {} as never
    })
  })

  it('routes Brain research through the canonical capability engine and preserves canonical fields', async () => {
    mocks.executeCapability.mockResolvedValue({
      success: true,
      capability: 'research',
      readiness: 'READY',
      provider: 'qwen',
      model: 'qwen-plus',
      outputType: 'text',
      output: 'research answer',
      artifactId: 'artifact-1',
      artifactUrl: '/api/admin/artifacts/artifact-1/content',
      jobId: null,
      providerJobId: null,
      pollUrl: null,
      status: 'completed',
      fallbackUsed: false,
      providerAttempts: [{ provider: 'qwen', model: 'qwen-plus', status: 'completed' }],
      warning: null,
      error: null,
    })

    const { POST } = await import('@/app/api/brain/research/route')
    const response = await POST(new Request('http://localhost/api/brain/research', {
      method: 'POST',
      body: JSON.stringify({ query: 'market trends', depth: 'deep', appSlug: 'marketing-app' }),
      headers: { 'Content-Type': 'application/json' },
    }) as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.executeCapability).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'research',
      appId: 'marketing-app',
      saveArtifact: true,
      metadata: expect.objectContaining({
        depth: 'deep',
        executionId: 'exec-1',
        researchRuntimeStatus: 'PARTIAL',
      }),
    }))
    expect(payload).toMatchObject({
      capability: 'deep_research',
      success: true,
      answer: 'research answer',
      provider: 'qwen',
      model: 'qwen-plus',
      artifactId: 'artifact-1',
      artifactUrl: '/api/admin/artifacts/artifact-1/content',
      readiness: 'READY',
      status: 'completed',
      providerAttempts: [{ provider: 'qwen', model: 'qwen-plus', status: 'completed' }],
      executionId: 'exec-1',
      depth: 'deep',
    })
    expect(payload).not.toHaveProperty('providerOverride')
    expect(payload).not.toHaveProperty('modelOverride')
  })

  it('keeps admin url research capability-level and records ignored provider/model/endpoint preferences', async () => {
    mocks.createArtifact.mockResolvedValue({
      id: 'artifact-url-1',
      downloadUrl: '/api/admin/artifacts/artifact-url-1/content',
    })

    const { POST } = await import('@/app/api/admin/research/url/route')
    const response = await POST(new Request('http://localhost/api/admin/research/url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com',
        appSlug: 'research-app',
        provider: 'qwen',
        model: 'qwen-plus',
        endpoint: 'https://provider.example/v1',
      }),
      headers: { 'Content-Type': 'application/json' },
    }) as never)
    const payload = await response.json()

    expect(payload).toMatchObject({
      success: true,
      capability: 'scrape_website',
      artifactId: 'artifact-url-1',
      artifactUrl: '/api/admin/artifacts/artifact-url-1/content',
      ignoredProviderPreference: 'qwen',
      ignoredModelPreference: 'qwen-plus',
      ignoredEndpointPreference: 'https://provider.example/v1',
    })
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'scrape_website',
      type: 'research_result',
      subType: 'research_source',
      provider: 'local-crawler',
      metadata: expect.objectContaining({
        ignoredProviderPreference: 'qwen',
        ignoredModelPreference: 'qwen-plus',
        ignoredEndpointPreference: 'https://provider.example/v1',
      }),
    }))
  })

  it('reports research jobs and opportunities as artifact-backed truth when listed from admin jobs', async () => {
    vi.resetModules()
    vi.doMock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ isLoggedIn: true }) }))
    vi.doMock('@/lib/service-vault', () => ({ getServiceKey: vi.fn().mockResolvedValue('firecrawl-key') }))
    vi.doMock('@/lib/local-json-store', () => ({
      LOCAL_STORE_FILES: { research: 'research/research-jobs.json' },
      checkWritable: vi.fn().mockReturnValue({ writable: true }),
      listRecords: vi.fn().mockReturnValue([{ id: 'local-research-1', appSlug: 'app', title: 'Local', url: 'https://local', notes: '', tags: [], scrapedMethod: 'local', firecrawlAvailable: false, content: '', status: 'completed', createdAt: '2026-06-16T00:00:00.000Z' }]),
    }))
    vi.doMock('@/lib/artifact-store', () => ({
      listArtifacts: vi.fn().mockResolvedValue({
        artifacts: [{
          id: 'artifact-research-1',
          appSlug: 'app',
          title: 'DB Research',
          subType: 'research_source',
          status: 'completed',
          createdAt: new Date('2026-06-16T00:00:00.000Z'),
          metadata: { sourceUrl: 'https://example.com', notes: 'note', tags: ['market'], scrapedMethod: 'playwright' },
        }, {
          id: 'artifact-opportunity-1',
          appSlug: 'app',
          title: 'Opportunity',
          subType: 'research_opportunity',
          status: 'completed',
          createdAt: new Date('2026-06-16T00:00:00.000Z'),
          metadata: { tags: ['idea'] },
        }],
      }),
    }))

    const { GET } = await import('@/app/api/admin/research/jobs/route')
    const response = await GET(new NextRequest('http://localhost/api/admin/research/jobs?appSlug=app'))
    const payload = await response.json()

    expect(payload).toMatchObject({
      total: 3,
      firecrawlAvailable: true,
      storageReady: true,
      driver: 'db+local',
    })
    expect(payload.jobs).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'artifact-research-1', subType: 'research_source', driver: 'db' }),
      expect.objectContaining({ id: 'artifact-opportunity-1', subType: 'research_opportunity', driver: 'db' }),
      expect.objectContaining({ id: 'local-research-1', driver: 'local_vps' }),
    ]))

    vi.doUnmock('@/lib/session')
    vi.doUnmock('@/lib/service-vault')
    vi.doUnmock('@/lib/local-json-store')
    vi.doUnmock('@/lib/artifact-store')
  })
})
