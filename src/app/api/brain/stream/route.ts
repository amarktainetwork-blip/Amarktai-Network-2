import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApp, callProvider } from '@/lib/brain'
import { scanContent } from '@/lib/content-filter'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'
import { getDefaultModelForProvider } from '@/lib/model-registry'

const streamRequestSchema = z.object({
  appId: z.string().min(1).max(200),
  appSecret: z.string().min(1),
  taskType: z.string().min(1).max(100),
  message: z.string().min(1).max(32_000),
  traceId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().max(4000).optional(),
  costMode: z.enum(['free_first', 'balanced', 'quality_first']).optional(),
})

const STREAM_PRIORITY = ['genx', 'groq', 'together', 'qwen', 'mimo', 'huggingface'] as const

export async function POST(request: NextRequest) {
  let body: z.infer<typeof streamRequestSchema>
  try {
    body = streamRequestSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError
          ? `Invalid request: ${error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
          : 'Invalid JSON body',
      },
      { status: 422 },
    )
  }

  const traceId = body.traceId || randomUUID()
  const inputFilter = scanContent(body.message)
  if (inputFilter.flagged) {
    return NextResponse.json(
      { error: 'Input blocked by safety filter', traceId, categories: inputFilter.categories },
      { status: 403 },
    )
  }

  const auth = await authenticateApp(body.appId, body.appSecret)
  if (!auth.ok || !auth.app) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized', traceId }, { status: auth.statusCode })
  }

  if (body.provider && !isApprovedDirectProvider(body.provider)) {
    return NextResponse.json(
      { error: `Provider "${body.provider}" is not approved for direct execution.`, traceId },
      { status: 400 },
    )
  }

  const providers = body.provider ? [body.provider] : STREAM_PRIORITY
  let selected: { provider: string; model: string; output: string } | null = null
  const errors: string[] = []

  for (const provider of providers) {
    const model = body.model || getDefaultModelForProvider(provider)
    const result = await callProvider(provider, model, body.message, body.systemPrompt)
    if (result.ok && result.output) {
      selected = { provider, model, output: result.output }
      break
    }
    errors.push(`${provider}: ${result.error ?? 'empty output'}`)
  }

  if (!selected) {
    return NextResponse.json(
      { error: 'No approved streaming provider is currently ready.', traceId, providers_tried: errors },
      { status: 503 },
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: selected.output })}\n\n`))
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'done',
            traceId,
            model: selected.model,
            provider: selected.provider,
          })}\n\n`,
        ),
      )
      controller.close()
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Trace-Id': traceId,
      'X-Stream-Provider': selected.provider,
      'X-Stream-Model': selected.model,
      'X-Cost-Mode': body.costMode ?? 'balanced',
    },
  })
}
