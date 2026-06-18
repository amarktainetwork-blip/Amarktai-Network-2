import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVaultApiKey: vi.fn(),
  getServiceKey: vi.fn(),
  getMeshCredential: vi.fn(),
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
vi.mock('@/lib/provider-mesh-status', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/provider-mesh-status')>()
  return {
    ...actual,
    getMeshCredential: mocks.getMeshCredential,
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
import { getEnvKeyForProvider, getIntegrationKey, getProviderKey } from '@/lib/provider-config'
import { normalizeProviderCatalog } from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
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
    mocks.getMeshCredential.mockResolvedValue('provider-secret')
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
    expect(source('src/app/api/admin/settings/test-qwen/route.ts')).toContain("getProviderKey('qwen')")
    expect(source('src/app/api/admin/settings/test-qwen/route.ts')).toContain("getVaultApiKey('qwen')")
    expect(source('src/app/api/admin/settings/test-qwen/route.ts')).toContain("proofType: 'chat_route_probe'")
    expect(source('src/app/api/admin/settings/test-qwen/route.ts')).toContain('capabilityExecutionProven: false')
  })

  it('preserves Groq auth/env truth conservatively', () => {
    const groq = PROVIDER_TRUTH.find((provider) => provider.id === 'groq')!
    process.env.GROQ_API_KEY = 'groq-env-token'

    expect(getIntegrationKey('groq')).toBe('groq')
    expect(getEnvKeyForProvider('groq')).toBe('groq-env-token')
    expect(groq.envAliases).toEqual(['GROQ_API_KEY'])
    expect(source('src/app/api/admin/settings/test-groq/route.ts')).toContain("proofType: 'key_and_model_catalog_check'")
    expect(source('src/app/api/admin/settings/test-groq/route.ts')).toContain('capabilityExecutionProven: false')
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
    expect(source('src/app/api/admin/settings/test-together/route.ts')).toContain("proofType: 'key_and_model_catalog_check'")
    expect(source('src/app/api/admin/settings/test-together/route.ts')).toContain('capabilityExecutionProven: false')
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

  it('preserves MiMo auth aliases and provider truth conservatively', () => {
    const mimo = PROVIDER_TRUTH.find((provider) => provider.id === 'mimo')!
    process.env.XIAOMI_API_KEY = 'mimo-env-token'

    expect(getIntegrationKey('mimo')).toBe('mimo')
    expect(getEnvKeyForProvider('mimo')).toBe('mimo-env-token')
    expect(mimo.envAliases).toEqual(['MIMO_API_KEY', 'XIAOMI_API_KEY'])
    expect(mimo.envAliases).not.toContain('MINIMAX_API_KEY')
    expect(mimo.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'tts',
    ]))
    expect(mimo.capabilities).not.toEqual(expect.arrayContaining([
      'vision',
      'stt',
      'voice_clone',
      'image',
      'video',
      'music',
      'agents',
    ]))
    expect(mimo.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: false,
    })
    expect(source('src/lib/universal-provider-call.ts')).toContain("envVars: ['MIMO_API_KEY', 'XIAOMI_API_KEY']")
    expect(source('src/lib/universal-provider-call.ts')).not.toContain('MINIMAX_API_KEY')
    expect(source('src/lib/universal-provider-call.ts')).not.toContain('api.minimax.io')
    expect(source('src/lib/universal-model-catalog.ts')).not.toContain("['chat', 'reasoning', 'coding', 'image']")
  })

  it('keeps the canonical provider list free of MiniMax', () => {
    expect(PROVIDER_TRUTH.map((provider) => provider.id)).toEqual([
      'huggingface',
      'together',
      'groq',
      'genx',
      'qwen',
      'mimo',
    ])
    expect(source('src/lib/provider-mesh.ts')).not.toContain("id: 'minimax'")
    expect(source('src/app/api/admin/settings/test-provider/route.ts')).not.toContain("id === 'minimax'")
  })

  it('allows minimax/* model IDs only under provider=together', () => {
    const togetherVideo = normalizeProviderCatalog('together', {
      data: [{ id: 'minimax/video-01', type: 'video-generation', available: true }],
    })
    const snapshot = {
      provider: 'together' as const,
      status: 'ready' as const,
      endpoint: 'https://api.together.ai/v1/models',
      keySource: 'vault',
      models: togetherVideo,
      tasks: ['video-generation'],
      inferenceProviders: [],
      privateEndpoints: [],
      dedicatedEndpoints: [],
      discoveredAt: '2026-06-18T00:00:00.000Z',
      expiresAt: '2026-06-18T00:05:00.000Z',
      error: null,
    }
    expect(modelsForCapability(snapshot, 'video').map((model) => model.id)).toContain('minimax/video-01')
    expect(PROVIDER_TRUTH.map((provider) => provider.id)).not.toContain('minimax')
  })

  it('reads a dashboard-saved GenX key through the same provider-key path Brain uses', async () => {
    process.env.GENX_API_KEY = ''

    expect(await getProviderKey('genx')).toBe('provider-secret')
  })

  it('reads a dashboard-saved Qwen key through the same provider-key path Brain uses', async () => {
    process.env.QWEN_API_KEY = ''
    process.env.DASHSCOPE_API_KEY = ''

    expect(await getProviderKey('qwen')).toBe('provider-secret')
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
    mocks.getMeshCredential.mockResolvedValue('hf-token-from-vault')
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

  it('keeps Hugging Face specialist execution on the canonical provider-key path', async () => {
    process.env.HUGGINGFACE_API_KEY = ''
    process.env.HUGGINGFACEHUB_API_TOKEN = ''
    process.env.HF_TOKEN = ''
    mocks.getMeshCredential.mockResolvedValue('hf-canonical-saved-key')

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runHuggingFaceInference({
      modelId: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: 'hello',
      capability: 'embeddings',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: 'Bearer hf-canonical-saved-key' }),
    })
  })

  it('classifies Hugging Face FLUX task models as image generation only', () => {
    const models = normalizeProviderCatalog('huggingface', [
      { id: 'black-forest-labs/FLUX.1-schnell', pipeline_tag: 'text-to-image', available: true },
      { id: 'sentence-transformers/all-MiniLM-L6-v2', pipeline_tag: 'feature-extraction', available: true },
    ])

    expect(models.find((model) => model.id.includes('FLUX'))).toMatchObject({
      capabilities: ['image'],
      capabilityEvidence: 'model_metadata',
    })
    expect(models.find((model) => model.id.includes('MiniLM'))).toMatchObject({
      capabilities: ['embeddings'],
    })
  })

  it('classifies Qwen image and Wan video families correctly', () => {
    const models = normalizeProviderCatalog('qwen', {
      data: [
        { id: 'qwen-image-2.0', available: true },
        { id: 'wan2.1-t2v-turbo', available: true },
        { id: 'wan2.1-i2v-turbo', available: true },
        { id: 'qwen3-tts', available: true },
        { id: 'qwen3-asr', available: true },
      ],
    })

    expect(models.find((model) => model.id === 'qwen-image-2.0')?.capabilities).toContain('image')
    expect(models.find((model) => model.id === 'wan2.1-t2v-turbo')?.capabilities).toContain('video')
    expect(models.find((model) => model.id === 'wan2.1-i2v-turbo')?.capabilities).toContain('image_to_video')
    expect(models.find((model) => model.id === 'qwen3-tts')?.capabilities).toEqual(['tts'])
    expect(models.find((model) => model.id === 'qwen3-asr')?.capabilities).toEqual(['stt'])
  })

  it('classifies Together image and video families correctly', () => {
    const models = normalizeProviderCatalog('together', {
      data: [
        { id: 'black-forest-labs/FLUX.1-schnell', available: true },
        { id: 'Wan-AI/Wan2.1-T2V-14B', available: true },
        { id: 'whisper-large-v3', available: true },
      ],
    })

    expect(models.find((model) => model.id.includes('FLUX'))?.capabilities).toContain('image')
    expect(models.find((model) => model.id.includes('T2V'))?.capabilities).toContain('video')
    expect(models.find((model) => model.id === 'whisper-large-v3')?.capabilities).toEqual(['stt'])
  })

  it('does not classify Groq text models as TTS while keeping whisper as STT', () => {
    const models = normalizeProviderCatalog('groq', {
      data: [
        { id: 'llama-3.3-70b-versatile', available: true },
        { id: 'whisper-large-v3-turbo', available: true },
      ],
    })

    expect(models.find((model) => model.id === 'llama-3.3-70b-versatile')?.capabilities).not.toContain('tts')
    expect(models.find((model) => model.id === 'llama-3.3-70b-versatile')?.capabilities).toContain('chat')
    expect(models.find((model) => model.id === 'whisper-large-v3-turbo')?.capabilities).toEqual(['stt'])
  })

  it('classifies MiMo TTS and ASR families conservatively', () => {
    const models = normalizeProviderCatalog('mimo', {
      data: [
        { id: 'mimo-v2.5', available: true },
        { id: 'mimo-tts-1', available: true },
        { id: 'mimo-asr-1', available: true },
      ],
    })

    expect(models.find((model) => model.id === 'mimo-v2.5')?.capabilities).toContain('chat')
    expect(models.find((model) => model.id === 'mimo-tts-1')?.capabilities).toEqual(['tts'])
    expect(models.find((model) => model.id === 'mimo-asr-1')?.capabilities).toEqual(['stt'])
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

  it('keeps the GenX settings test scoped to catalog/chat probing rather than full capability proof', () => {
    const genxTest = source('src/app/api/admin/settings/test-genx/route.ts')

    expect(genxTest).toContain("proofType: 'catalog_and_chat_probe'")
    expect(genxTest).toContain('capabilityExecutionProven: false')
    expect(genxTest).toContain('catalogOk')
    expect(genxTest).toContain('chatOk')
    expect(genxTest).toContain('generateOk')
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

  it('keeps Groq provider truth conservative around supported and unsupported families', () => {
    const groq = PROVIDER_TRUTH.find((provider) => provider.id === 'groq')!

    expect(groq.capabilities).toEqual(expect.arrayContaining([
      'chat',
      'reasoning',
      'coding',
      'vision',
      'tts',
      'stt',
    ]))
    expect(groq.capabilities).not.toEqual(expect.arrayContaining([
      'image',
      'video',
      'image_to_video',
      'music',
      'embeddings',
      'rerank',
      'translation',
      'documents',
      'agents',
      'adult_text',
      'adult_image',
      'adult_video',
    ]))
    expect(groq.features).toMatchObject({
      streaming: true,
      asyncJobs: false,
      webhooks: false,
      toolCalling: false,
      artifactSupport: true,
    })
  })

  it('keeps MiMo async flags aligned with the actual canonical runtime contract', () => {
    const mimo = PROVIDER_TRUTH.find((provider) => provider.id === 'mimo')!

    expect(mimo.features.asyncJobs).toBe(false)
    expect(providerHasCanonicalPollingContract('mimo')).toBe(false)
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
