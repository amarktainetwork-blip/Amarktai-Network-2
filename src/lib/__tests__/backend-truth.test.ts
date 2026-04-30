import { afterEach, describe, expect, it, vi } from 'vitest'

describe('backend capability truth', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('GenX status separates configured from available', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: { integrationConfig: { findUnique: vi.fn().mockResolvedValue(null) } },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({ decryptVaultKey: (value: string) => value }))

    process.env.GENX_API_URL = 'https://query.genx.sh'
    process.env.GENX_API_KEY = 'gnxk_live_123456789'

    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [{ id: 'gpt-5', category: 'text' }] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        return new Response(JSON.stringify({ error: 'probe' }), { status: 400 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { getGenXStatusAsync, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const status = await getGenXStatusAsync()

    expect(status.configured).toBe(true)
    expect(status.available).toBe(true)
    expect(status.modelCount).toBe(1)
  })

  it('GenX configured does not mean available when catalog probe fails', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: { integrationConfig: { findUnique: vi.fn().mockResolvedValue(null) } },
    }))
    vi.doMock('@/lib/crypto-vault', () => ({ decryptVaultKey: (value: string) => value }))

    process.env.GENX_API_URL = 'https://query.genx.sh'
    process.env.GENX_API_KEY = 'gnxk_live_123456789'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))

    const { getGenXStatusAsync, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const status = await getGenXStatusAsync()

    expect(status.configured).toBe(true)
    expect(status.available).toBe(false)
    expect(status.error).toContain('GenX catalog probe failed')
  })

  it('/api/brain/video-generate returns a truthful blocker when no renderer exists', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: { videoGenerationJob: { create: vi.fn() } } }))
    vi.doMock('@/lib/brain', () => ({
      getVaultApiKey: vi.fn().mockResolvedValue(null),
      callProvider: vi.fn().mockResolvedValue({ ok: false, output: null }),
    }))
    vi.doMock('@/lib/genx-client', () => ({
      GENX_VIDEO_MODELS: ['veo-3.1'],
      callGenXMedia: vi.fn().mockResolvedValue({ success: false, error: 'not available' }),
    }))

    const { POST } = await import('@/app/api/brain/video-generate/route')
    const response = await POST(new Request('http://test.local/api/brain/video-generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'make a video' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.executed).toBe(false)
    expect(data.generation_available).toBe(false)
    expect(data.blocker).toContain('No real video generation provider is configured')
  })
})
