import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/content-filter', () => ({
  blockedExplanation: (categories: string[]) => `blocked: ${categories.join(',')}`,
  getAppSafetyConfig: () => ({ safeMode: false, adultMode: true, suggestiveMode: true }),
  loadAppSafetyConfigFromDB: vi.fn().mockResolvedValue({ safeMode: false, adultMode: true, suggestiveMode: true }),
  scanContent: vi.fn((text: string) => {
    if (text.toLowerCase().includes('minor')) {
      return { flagged: true, categories: ['csam'], message: 'blocked', confidence: 1, scanner: 'keyword_fallback' }
    }
    return { flagged: false, categories: [], message: '', confidence: 0, scanner: 'keyword_fallback' }
  }),
}))

vi.mock('@/lib/brain', () => ({
  authenticateApp: vi.fn(async () => ({ ok: false, statusCode: 401, error: 'Unauthorized' })),
  getVaultApiKey: vi.fn(async (provider: string) => {
    if (provider === 'huggingface') return 'hf_test'
    if (provider === 'together') return 'together_test'
    if (provider === 'grok' || provider === 'xai') return null
    return null
  }),
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => ({ isLoggedIn: true })),
}))

vi.mock('@/lib/artifact-store', () => ({
  createArtifact: vi.fn(async () => ({
    id: 'artifact_adult_text_1',
    storageUrl: '/api/artifacts/file/adult-text.txt',
  })),
}))

describe('/api/brain/adult-text', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('refuses degrading prompts before provider execution', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'huggingface',
        prompt: 'make her feel worthless in a degrading scene',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.status).toBe('policy_refused')
    expect(fetchMock).not.toHaveBeenCalled()
  }, 30_000)

  it('requires an endpoint for cataloged Hugging Face GGUF adult text models', async () => {
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'huggingface',
        prompt: 'write a consenting adult romance scene',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('needs_setup')
    expect(data.attempts[0].status).toBe('needs_endpoint')
  })

  it('blocks Together adult text fallback until explicit config is enabled', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'together',
        prompt: 'write a short consenting adult romance paragraph',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toContain('TOGETHER_ADULT_FALLBACK_ENABLED=true')
    expect(data.error).toContain('TOGETHER_ADULT_TEXT_MODEL')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses Together adult text fallback only with explicit config', async () => {
    vi.stubEnv('TOGETHER_ADULT_FALLBACK_ENABLED', 'true')
    vi.stubEnv('TOGETHER_ADULT_TEXT_MODEL', 'approved-adult-text-model')
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.together.xyz/v1/chat/completions')
      const body = JSON.parse(String(init?.body ?? '{}'))
      expect(body.model).toBe('approved-adult-text-model')
      expect(body.messages[0].content).toContain('consenting adults only')
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'A consenting adult romance paragraph.' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/brain/adult-text/route')

    const response = await POST(new Request('http://test.local/api/brain/adult-text', {
      method: 'POST',
      body: JSON.stringify({
        appSlug: '__admin_test__',
        provider: 'together',
        prompt: 'write a short consenting adult romance paragraph',
      }),
    }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.provider).toBe('together')
    expect(data.model).toBe('approved-adult-text-model')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('routes adult_text capability through Hugging Face endpoints without GenX fallback', async () => {
    vi.stubEnv('HF_ADULT_TEXT_ENDPOINT', 'https://hf.test/adult-text')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://hf.test/adult-text')
      const body = JSON.parse(String(init?.body ?? '{}'))
      expect(body.inputs).toContain('adult roleplay conversation for consenting adults')
      return new Response(JSON.stringify({
        generated_text: 'A respectful consenting adult conversation response.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { executeCapability } = await import('@/lib/runtime-execution')

    const result = await executeCapability({
      input: 'adult roleplay conversation for consenting adults',
      capability: 'adult_text',
      adultMode: true,
      safeMode: false,
      providerOverride: 'huggingface',
    })

    expect(result.success).toBe(true)
    expect(result.capability).toBe('adult_text')
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(false)
    expect(result.output).toContain('consenting adult')
  }, 30_000)
})
