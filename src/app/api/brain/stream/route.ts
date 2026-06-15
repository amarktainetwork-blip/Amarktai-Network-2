import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApp } from '@/lib/brain'
import { executeCapability } from '@/lib/capability-router'
import { scanContent } from '@/lib/content-filter'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'

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

  const result = await executeCapability({
    input: body.message,
    capability: streamCapability(body.taskType),
    appId: auth.app.slug,
    providerOverride: body.provider,
    modelOverride: body.model,
    metadata: {
      streaming: true,
      systemPrompt: body.systemPrompt ?? null,
      routingProfile: body.costMode === 'free_first'
        ? 'cheap'
        : body.costMode === 'quality_first'
          ? 'premium'
          : 'balanced',
    },
  })
  if (!result.success || !result.output || !result.provider || !result.model) {
    return NextResponse.json(
      {
        error: result.error ?? 'NO_ROUTE_FOUND',
        code: result.code ?? 'NO_ROUTE_FOUND',
        traceId,
        providerAttempts: result.providerAttempts ?? [],
      },
      { status: 503 },
    )
  }
  const selected = { provider: result.provider, model: result.model, output: result.output }

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

function streamCapability(taskType: string) {
  const normalized = taskType.toLowerCase()
  if (normalized.includes('reason')) return 'reasoning'
  if (normalized.includes('research')) return 'research'
  if (normalized.includes('code')) return 'code'
  return 'chat'
}
