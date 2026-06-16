import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVaultApiKey: vi.fn(),
  getServiceKey: vi.fn(),
  callGenXMedia: vi.fn(),
  getGenXJobStatus: vi.fn(),
  pollQwenWanxTask: vi.fn(),
}))

vi.mock('@/lib/brain', () => ({
  getVaultApiKey: mocks.getVaultApiKey,
  callProvider: vi.fn(),
}))
vi.mock('@/lib/service-vault', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/service-vault')>()
  return {
    ...actual,
    getServiceKey: mocks.getServiceKey,
  }
})
vi.mock('@/lib/genx-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/genx-client')>()
  return {
    ...actual,
    callGenXMedia: mocks.callGenXMedia,
    getGenXJobStatus: mocks.getGenXJobStatus,
  }
})
vi.mock('@/lib/qwen-wanx-polling', () => ({ pollQwenWanxTask: mocks.pollQwenWanxTask }))

import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import {
  getProviderCapabilityAdapter,
  providerHasCanonicalPollingContract,
} from '@/lib/ai-capability-adapters'
import { getEnvKeyForProvider, getIntegrationKey } from '@/lib/provider-config'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import { runHuggingFaceInference } from '@/lib/specialist-provider-routes'
import { callUniversalProvider } from '@/lib/universal-provider-call'

const ROOT = process.cwd()

function source(file: string) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

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

  it('normalizes DashScope aliases and preserves Qwen auth/env truth', () => {
    const qwen = PROVIDER_TRUTH.find((provider) => provider.id === 'qwen')!

    expect(getIntegrationKey('dashscope')).toBe('qwen')
    expect(getIntegrationKey('qwen')).toBe('qwen')
    expect(qwen.envAliases).toEqual(expect.arrayContaining(['QWEN_API_KEY', 'DASHSCOPE_API_KEY']))
    expect(qwen.billing).toMatchObject({
      plan: 'standard_free_quota',
      freeQuotaEligible: true,
      paidEnabledEnv: 'QWEN_PAID_ENABLED',
    })
  })

  it('represents Qwen chat and reasoning while leaving unsupported families out of provider truth', () => {
    const qwen = PROVIDER_TRUTH.find((provider) => provider.id === 'qwen')!

    expect(qwen.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'vision',
      'ocr',
      'image',
      'video',
      'image_to_video',
      'embeddings',
      'translation',
    ]))
    expect(qwen.capabilities).not.toEqual(expect.arrayContaining([
      'music',
      'tts',
      'stt',
      'voice_clone',
      'adult_text',
      'adult_image',
      'adult_video',
      'documents',
      'agents',
    ]))
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

  it('represents Together provider truth conservatively around supported and unsupported families', () => {
    const together = PROVIDER_TRUTH.find((provider) => provider.id === 'together')!

    expect(together.envAliases).toEqual(['TOGETHER_API_KEY'])
    expect(together.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'image',
      'video',
      'image_to_video',
      'tts',
      'stt',
      'vision',
      'embeddings',
      'rerank',
      'agents',
    ]))
    expect(together.capabilities).not.toEqual(expect.arrayContaining([
      'music',
      'translation',
      'documents',
      'adult_text',
      'adult_image',
      'adult_video',
      'voice_clone',
      'ocr',
    ]))
    expect(together.features).toMatchObject({
      asyncJobs: true,
      artifactSupport: true,
      streaming: true,
    })
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

  it('resolves Hugging Face auth aliases across canonical config and specialist execution', async () => {
    process.env.HUGGINGFACE_API_KEY = ''
    process.env.HUGGINGFACEHUB_API_TOKEN = ''
    process.env.HF_TOKEN = 'hf-token-env'
    mocks.getServiceKey.mockImplementation(async (_provider: string, envVar: string) =>
      envVar === 'HF_TOKEN' ? 'hf-token-from-vault' : null,
    )
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    expect(getIntegrationKey('hf')).toBe('huggingface')
    expect(getEnvKeyForProvider('huggingface')).toBe('hf-token-env')

    const result = await runHuggingFaceInference({
      modelId: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: 'hello',
      capability: 'embeddings',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: 'Bearer hf-token-from-vault' }),
    })
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

  it('polls Qwen Wanx tasks through the canonical adapter contract', async () => {
    mocks.pollQwenWanxTask.mockResolvedValue({
      ok: true,
      executed: true,
      provider: 'qwen',
      model: 'wan2.1-t2v-turbo',
      capability: 'text_to_image_poll',
      latencyMs: 12,
      contentType: 'application/json',
      json: {
        output: {
          task_status: 'SUCCEEDED',
          video_url: 'https://cdn.example/qwen-video.mp4',
        },
      },
    })

    const adapter = getProviderCapabilityAdapter('qwen')!
    const input = adapterInput('text_to_video', 'qwen', 'wan2.1-t2v-turbo')
    const completed = await adapter.poll!('qwen-task-1', input)

    expect(completed).toMatchObject({
      status: 'completed',
      providerJobId: 'qwen-task-1',
      mediaUrl: 'https://cdn.example/qwen-video.mp4',
    })
    expect(mocks.pollQwenWanxTask).toHaveBeenCalledWith({
      taskId: 'qwen-task-1',
      model: 'wan2.1-t2v-turbo',
    })
  })

  it('polls Together video jobs through the canonical adapter contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'completed',
      outputs: { video_url: 'https://cdn.example/together.mp4' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const adapter = getProviderCapabilityAdapter('together')!
    const input = adapterInput('text_to_video', 'together', 'together-video-1')

    const completed = await adapter.poll!('together-job-1', input)

    expect(completed).toMatchObject({
      status: 'completed',
      providerJobId: 'together-job-1',
      mediaUrl: 'https://cdn.example/together.mp4',
    })
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.together.ai/v1/videos/together-job-1')
  })

  it('keeps provider async flags aligned with canonical polling support', () => {
    const asyncProviders = PROVIDER_TRUTH
      .filter((provider) => provider.features.asyncJobs)
      .map((provider) => provider.id)

    expect(asyncProviders).toEqual(['together', 'genx', 'qwen'])
    for (const provider of asyncProviders) {
      expect(providerHasCanonicalPollingContract(provider)).toBe(true)
    }
    expect(providerHasCanonicalPollingContract('huggingface')).toBe(false)
  })

  it('keeps GenX provider truth limited to the proven canonical runtime surface', () => {
    const genx = PROVIDER_TRUTH.find((provider) => provider.id === 'genx')!

    expect(genx.envAliases).toEqual(['GENX_API_KEY'])
    expect(genx.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'image',
      'video',
      'music',
      'tts',
    ]))
    expect(genx.capabilities).not.toEqual(expect.arrayContaining([
      'image_to_video',
      'stt',
      'avatar',
      'vision',
      'documents',
      'agents',
      'adult_text',
      'adult_image',
      'adult_video',
    ]))
    expect(genx.features).toMatchObject({
      streaming: true,
      asyncJobs: true,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
  })

  it('keeps Hugging Face provider truth conservative around supported metadata and unproven families', () => {
    const huggingface = PROVIDER_TRUTH.find((provider) => provider.id === 'huggingface')!

    expect(huggingface.envAliases).toEqual([
      'HUGGINGFACE_API_KEY',
      'HUGGINGFACEHUB_API_TOKEN',
      'HF_TOKEN',
    ])
    expect(huggingface.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'vision',
      'ocr',
      'image',
      'video',
      'music',
      'tts',
      'stt',
      'embeddings',
      'rerank',
      'documents',
      'translation',
      'avatar',
    ]))
    expect(huggingface.capabilities).not.toEqual(expect.arrayContaining([
      'adult_text',
      'adult_image',
      'adult_video',
      'agents',
      'voice_clone',
    ]))
    expect(huggingface.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
  })

  it('keeps admin provider-key truth within the six approved V1 providers', () => {
    const integrationKeysRoute = source('src/app/api/admin/integration-keys/route.ts')

    for (const provider of ['huggingface', 'together', 'groq', 'genx', 'qwen', 'mimo']) {
      expect(integrationKeysRoute).toMatch(new RegExp(`\\b${provider}:\\s*\\{`))
    }
    for (const provider of ['openai', 'openrouter', 'gemini', 'deepseek', 'nvidia']) {
      expect(integrationKeysRoute).not.toMatch(new RegExp(`\\b${provider}:\\s*\\{`))
    }
  })

  it('keeps provider truth aligned with the exact approved V1 provider set', () => {
    expect(PROVIDER_TRUTH.map((provider) => provider.id)).toEqual([
      'huggingface',
      'together',
      'groq',
      'genx',
      'qwen',
      'mimo',
    ])
  })
})
