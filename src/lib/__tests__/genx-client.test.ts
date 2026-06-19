import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integrationConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

vi.mock('@/lib/crypto-vault', () => ({
  decryptVaultKey: (value: string) => value,
}))

describe('genx-client', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      GENX_API_URL: 'https://query.genx.sh',
      GENX_API_KEY: 'gnxk_test',
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  it('submits media jobs using the GenX generate params contract', async () => {
    const bodies: unknown[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        bodies.push(body)
        if (body.model === '__probe__') {
          return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
        }
        return new Response(JSON.stringify({
          job_id: 'job_music_123',
          status: 'queued',
          model: body.model,
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { callGenXMedia, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const result = await callGenXMedia({
      model: 'lyria-3-pro-preview',
      prompt: 'cinematic synthwave track',
      type: 'audio',
      duration: 30,
      metadata: { traceId: 'trace-1', retry: false },
    })

    expect(result.success).toBe(true)
    expect(result.jobId).toBe('job_music_123')
    expect(result.status).toBe('pending')
    expect(bodies.at(-1)).toEqual({
      model: 'lyria-3-pro-preview',
      params: {
        prompt: 'cinematic synthwave track',
        duration: 30,
        type: 'audio',
      },
      metadata: {
        traceId: 'trace-1',
        retry: 'false',
      },
    })
  })

  it('normalizes GenX completed job result_url responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
      }
      if (url.endsWith('/api/v1/jobs/job_video_123')) {
        return new Response(JSON.stringify({
          id: 'job_video_123',
          status: 'completed',
          result_url: 'https://cdn.example/video.mp4',
          model: 'veo-3.1',
          created_at: '2026-04-29T00:00:00.000Z',
          updated_at: '2026-04-29T00:00:03.000Z',
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { getGenXJobStatus, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const status = await getGenXJobStatus('job_video_123')

    expect(status?.status).toBe('completed')
    expect(status?.resultUrl).toBe('https://cdn.example/video.mp4')
    expect(status?.result?.url).toBe('https://cdn.example/video.mp4')
  })

  it('normalizes nested GenX music audio URL responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        if (body.model === '__probe__') {
          return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          model: 'lyria-3-clip-preview',
          output: { audioUrl: 'https://cdn.example/music.mp3' },
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { callGenXMedia, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const result = await callGenXMedia({
      model: 'lyria-3-clip-preview',
      prompt: 'cinematic launch music',
      type: 'audio',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://cdn.example/music.mp3')
    expect(result.bytes).toBeNull()
  })

  it('normalizes GenX Gemini inline audio base64 responses', async () => {
    const audioBase64 = Buffer.from('fake-audio-bytes').toString('base64')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        if (body.model === '__probe__') {
          return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          model: 'lyria-3-clip-preview',
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'audio/wav',
                  data: audioBase64,
                },
              }],
            },
          }],
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { callGenXMedia, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const result = await callGenXMedia({
      model: 'lyria-3-clip-preview',
      prompt: 'cinematic launch music',
      type: 'audio',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBeNull()
    expect(result.contentType).toBe('audio/wav')
    expect(result.bytes?.toString('utf8')).toBe('fake-audio-bytes')
  })

  it('fails GenX music responses that contain no audio output', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        if (body.model === '__probe__') {
          return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          model: 'lyria-3-clip-preview',
          text: 'Gemini returned no audio data',
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { callGenXMedia, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const result = await callGenXMedia({
      model: 'lyria-3-clip-preview',
      prompt: 'cinematic launch music',
      type: 'audio',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('no audio bytes')
    expect(result.url).toBeNull()
    expect(result.bytes).toBeNull()
  })

  it('streams GenX chat chunks from the OpenAI-compatible SSE endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
      }
      if (url.endsWith('/v1/chat/completions')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        expect(body.stream).toBe(true)
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'))
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { streamGenXChat, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const chunks: string[] = []
    const result = await streamGenXChat({
      model: 'gpt-5.4-mini',
      messages: [{ role: 'user', content: 'hello' }],
    }, (event) => {
      if (event.type === 'chunk' && event.content) chunks.push(event.content)
    })

    expect(result.success).toBe(true)
    expect(result.output).toBe('Hello')
    expect(chunks).toEqual(['Hel', 'lo'])
  })

  it('resolves auto:* aliases before GenX chat execution', async () => {
    const bodies: Array<{ model?: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }
      if (url.endsWith('/api/v1/generate')) {
        return new Response(JSON.stringify({ error: 'probe model' }), { status: 400 })
      }
      if (url.endsWith('/v1/chat/completions')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        bodies.push(body)
        return new Response(JSON.stringify({
          model: body.model,
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    const { callGenXChat, invalidateEndpointProfile } = await import('@/lib/genx-client')
    invalidateEndpointProfile()
    const result = await callGenXChat({
      model: 'auto:coding-best',
      messages: [{ role: 'user', content: 'plan' }],
    })

    expect(result.success).toBe(true)
    expect(bodies.at(-1)?.model).toBe('gpt-5.3-codex')
    expect(bodies.at(-1)?.model).not.toMatch(/^auto:/)
  })
})
