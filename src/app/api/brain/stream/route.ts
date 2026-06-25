import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { authenticateApp, getVaultApiKey, callProvider } from '@/lib/brain'
import { scanContent } from '@/lib/content-filter'
import { getAppAgent, buildAgentSystemPrompt } from '@/lib/app-agent'

// ── Provider streaming configuration ──────────────────────────────────────────

/** Base URLs for chat-completions-compatible streaming providers */
const STREAMING_PROVIDERS: Record<string, { baseUrl: string }> = {
  genx:      { baseUrl: 'https://query.genx.sh' },
  groq:       { baseUrl: 'https://api.groq.com/openai' },
  together:   { baseUrl: 'https://api.together.xyz' },
  mimo:      { baseUrl: 'https://api.xiaomimimo.com' },
}

/** Default models per provider for streaming */
const DEFAULT_STREAM_MODELS: Record<string, string> = {
  genx:      'auto:chat-balanced',
  groq:       'llama-3.3-70b-versatile',
  together:   'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  huggingface: 'meta-llama/Llama-3.3-70B-Instruct',
  mimo:      'mimo-v2.5',
}

// ── Request schema ────────────────────────────────────────────────────────────

const streamRequestSchema = z.object({
  appId: z.string().min(1).max(200),
  appSecret: z.string().min(1),
  taskType: z.string().min(1).max(100),
  message: z.string().min(1).max(32_000),
  traceId: z.string().optional(),
  /** Preferred provider for streaming (default: auto-select first available) */
  provider: z.string().optional(),
  /** Preferred model (default: provider default) */
  model: z.string().optional(),
  /** System prompt override */
  systemPrompt: z.string().max(4000).optional(),
  /**
   * Cost routing mode:
   *   free_first   — prefers cheapest/free providers (groq, together, huggingface)
   *   balanced     — default: quality/cost balance (genx, groq, together, mimo)
   *   quality_first — prefers highest-quality providers (genx, groq, together, mimo)
   */
  costMode: z.enum(['free_first', 'balanced', 'quality_first']).optional(),
})

/**
 * POST /api/brain/stream
 *
 * Server-Sent Events (SSE) streaming endpoint for real-time AI responses.
 * Provider selection is constrained by the active provider mesh.
 *
 * Events emitted:
 *   - `data: {"type":"chunk","content":"..."}` — incremental response text
 *   - `data: {"type":"done","traceId":"...","model":"...","provider":"..."}` — stream complete
 *   - `data: {"type":"error","message":"..."}` — error occurred
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof streamRequestSchema>
  try {
    const raw = await request.json()
    body = streamRequestSchema.parse(raw)
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof z.ZodError
          ? `Invalid request: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`
          : 'Invalid JSON body',
      },
      { status: 422 },
    )
  }

  const traceId = body.traceId || randomUUID()

  // ── Content filter ────────────────────────────────────────────────────
  const inputFilter = scanContent(body.message)
  if (inputFilter.flagged) {
    return NextResponse.json(
      { error: 'Input blocked by safety filter', traceId, categories: inputFilter.categories },
      { status: 403 },
    )
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = await authenticateApp(body.appId, body.appSecret)
  if (!auth.ok || !auth.app) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized', traceId },
      { status: auth.statusCode },
    )
  }

  // ── Resolve provider and model ────────────────────────────────────────
  const resolvedProvider = await resolveProvider(body.provider, body.costMode)
  if (!resolvedProvider) {
    return NextResponse.json(
      { error: 'No streaming provider is configured — add at least one API key.', traceId },
      { status: 503 },
    )
  }
  const resolvedModel = body.model || DEFAULT_STREAM_MODELS[resolvedProvider] || 'llama-3.3-70b-versatile'

  // ── Resolve system prompt: body override → app agent → generic fallback ─
  const appName = auth.app.name
  let systemPrompt = body.systemPrompt
  if (!systemPrompt) {
    try {
      const agent = await getAppAgent(auth.app.slug)
      if (agent?.active) {
        systemPrompt = buildAgentSystemPrompt(agent)
      }
    } catch {
      // Agent lookup failure must not block streaming
    }
  }
  if (!systemPrompt) {
    systemPrompt = `You are a helpful assistant for ${appName}.`
  }

  // ── Stream response via SSE ──────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // ── HuggingFace non-streaming fallback ─────────────
        // This provider does not support SSE — call via callProvider and
        // emit the full response as a single chunk + done event.
        if (resolvedProvider === 'huggingface') {
          const result = await callProvider(
            resolvedProvider,
            resolvedModel,
            body.message,
          )
          if (!result.ok) {
            send({ type: 'error', message: result.error ?? `${resolvedProvider} call failed` })
          } else {
            const text = typeof result.output === 'string' ? result.output : JSON.stringify(result.output)
            send({ type: 'chunk', content: text })
            send({ type: 'done', traceId, model: resolvedModel, provider: resolvedProvider })
          }
          controller.close()
          return
        }

        // ── Chat-completions-compatible streaming ──────────────────────
        const providerConfig = STREAMING_PROVIDERS[resolvedProvider]
        if (!providerConfig) {
          send({ type: 'error', message: `Provider "${resolvedProvider}" does not support streaming.` })
          controller.close()
          return
        }

        const apiKey = await getVaultApiKey(resolvedProvider)
        if (!apiKey) {
          send({ type: 'error', message: `Provider ${resolvedProvider} is not configured — add an API key via Admin → AI Providers.` })
          controller.close()
          return
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        }

        const response = await fetch(`${providerConfig.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: resolvedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: body.message },
            ],
            stream: true,
          }),
        })

        if (!response.ok || !response.body) {
          send({ type: 'error', message: `${resolvedProvider} HTTP ${response.status}` })
          controller.close()
          return
        }

        await processSSEStream(response.body, (data) => {
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) send({ type: 'chunk', content })
          } catch { /* skip malformed */ }
        })

        send({ type: 'done', traceId, model: resolvedModel, provider: resolvedProvider })
        controller.close()
      } catch (err) {
        send({ type: 'error', message: String(err) })
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Trace-Id': traceId,
      'X-Stream-Provider': resolvedProvider,
      'X-Stream-Model': resolvedModel,
      'X-Cost-Mode': body.costMode ?? 'balanced',
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve which provider to use (auto-select first available or explicit).
 * Checks DB vault first via getVaultApiKey(), falls back to env vars.
 *
 * costMode determines the priority order when no explicit provider is given:
 *   free_first   — groq → together → huggingface → mimo
 *   balanced     — genx → groq → together → huggingface → mimo (default)
 *   quality_first — genx → groq → together → mimo → huggingface
 */
async function resolveProvider(
  requested?: string,
  costMode?: 'free_first' | 'balanced' | 'quality_first',
): Promise<string | null> {
  const allSupported = [...Object.keys(STREAMING_PROVIDERS), 'huggingface']

  if (requested && allSupported.includes(requested)) {
    return requested
  }

  // Priority order per cost mode
  const COST_MODE_PRIORITY: Record<string, string[]> = {
    free_first: [
      'groq', 'together', 'huggingface', 'mimo',
    ],
    balanced: [
      'genx', 'groq', 'together', 'huggingface', 'mimo',
    ],
    quality_first: [
      'genx', 'groq', 'together', 'mimo', 'huggingface',
    ],
  }

  const priority = COST_MODE_PRIORITY[costMode ?? 'balanced']

  for (const provider of priority) {
    const key = await getVaultApiKey(provider)
    if (key) return provider
  }

  return null
}

/** Process an SSE stream, calling handler for each data line. */
async function processSSEStream(
  body: ReadableStream<Uint8Array>,
  handler: (data: string) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data && data !== '[DONE]') {
          handler(data)
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.startsWith('data: ')) {
    const data = buffer.slice(6).trim()
    if (data && data !== '[DONE]') {
      handler(data)
    }
  }
}
