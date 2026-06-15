import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVaultApiKey: vi.fn(),
  getServiceKey: vi.fn(),
  callGenXMedia: vi.fn(),
  getGenXJobStatus: vi.fn(),
}))

vi.mock('@/lib/brain', () => ({
  getVaultApiKey: mocks.getVaultApiKey,
  callProvider: vi.fn(),
}))
vi.mock('@/lib/service-vault', () => ({ getServiceKey: mocks.getServiceKey }))
vi.mock('@/lib/genx-client', () => ({
  callGenXMedia: mocks.callGenXMedia,
  getGenXJobStatus: mocks.getGenXJobStatus,
}))
vi.mock('@/lib/qwen-wanx-polling', () => ({ pollQwenWanxTask: vi.fn() }))

import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import { getProviderCapabilityAdapter } from '@/lib/ai-capability-adapters'
import { callUniversalProvider } from '@/lib/universal-provider-call'

function adapterInput(
  capabilityId: string,
  provider: 'qwen' | 'together' | 'huggingface' | 'genx',
  model: string,
) {
  const capability = getCapabilityDefinition(capabilityId)!
  const route = capability.providerRoutes.find((entry) => entry.provider === provider)!
  return {
    capability,
    route,
    prompt: 'Create a launch visual',
    references: [],
    context: {},
    model,
  }
}

describe('provider adapter contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVaultApiKey.mockResolvedValue('provider-secret')
    mocks.getServiceKey.mockResolvedValue('mimo-secret')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('uses the DashScope AIGC multimodal endpoint and input.messages for Qwen image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: { choices: [{ message: { content: [{ image: 'https://cdn.example/qwen.png' }] } }] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getProviderCapabilityAdapter('qwen')!.execute(
      adapterInput('text_to_image', 'qwen', 'qwen-image-2.0'),
    )

    expect(result.status).toBe('completed')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/services/aigc/multimodal-generation/generation')
    expect(url).not.toContain('/chat/completions')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('qwen-image-2.0')
    expect(body.input.messages[0].content).toEqual([{ text: 'Create a launch visual' }])
    expect(init.headers).toMatchObject({ Authorization: 'Bearer provider-secret' })
  })

  it('uses Together image generations rather than chat completions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ url: 'https://cdn.example/together.png' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getProviderCapabilityAdapter('together')!.execute(
      adapterInput('text_to_image', 'together', 'black-forest-labs/FLUX.1-schnell'),
    )

    expect(result.status).toBe('completed')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.together.ai/v1/images/generations')
    expect(fetchMock.mock.calls[0][0]).not.toContain('chat/completions')
  })

  it('uses the api-key header for MiMo OpenAI-compatible calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'ok' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await callUniversalProvider({
      providerKey: 'mimo',
      model: 'mimo-v2.5',
      message: 'hello',
    })

    expect(result.ok).toBe(true)
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers['api-key']).toBe('mimo-secret')
    expect(headers.Authorization).toBeUndefined()
  })

  it('treats Hugging Face loading and 503 responses as retryable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Model is currently loading' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )))

    const result = await getProviderCapabilityAdapter('huggingface')!.execute(
      adapterInput(
        'text_to_image',
        'huggingface',
        'stabilityai/stable-diffusion-xl-base-1.0',
      ),
    )

    expect(result).toMatchObject({
      status: 'failed',
      errorCategory: 'provider_busy',
      retryable: true,
      rawStatus: 503,
    })
    expect(result.error).not.toContain('provider-secret')
  })

  it('normalizes the GenX asynchronous job and polling flow', async () => {
    mocks.callGenXMedia.mockResolvedValue({
      success: true,
      model: 'veo-3.1',
      url: null,
      jobId: 'provider-job-1',
      error: null,
    })
    mocks.getGenXJobStatus.mockResolvedValue({
      status: 'completed',
      resultUrl: 'https://cdn.example/video.mp4',
      error: null,
    })
    const adapter = getProviderCapabilityAdapter('genx')!
    const input = adapterInput('text_to_video', 'genx', 'veo-3.1')

    const started = await adapter.execute(input)
    expect(started).toMatchObject({
      status: 'processing',
      providerJobId: 'provider-job-1',
    })
    const completed = await adapter.poll!('provider-job-1', input)
    expect(completed).toMatchObject({
      status: 'completed',
      mediaUrl: 'https://cdn.example/video.mp4',
    })
  })
})
