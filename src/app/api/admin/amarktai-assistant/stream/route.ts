import { NextRequest } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    message?: string
    capability?: string
    providerOverride?: string
    modelOverride?: string
    costMode?: 'cheap' | 'balanced' | 'premium'
    metadata?: Record<string, unknown>
  }
  if (!body.message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  const result = await executeCapability({
    input: body.message,
    capability: body.capability || 'chat',
    qualityTier: body.costMode,
    metadata: {
      ...body.metadata,
      streaming: true,
      source: 'amarktai_assistant',
      ignoredProviderPreference: body.providerOverride ?? null,
      ignoredModelPreference: body.modelOverride ?? null,
    },
  })
  if (!result.success) {
    return Response.json({
      success: false,
      error: result.error,
      code: result.code,
      providerAttempts: result.providerAttempts ?? [],
    }, { status: result.readiness === 'BLOCKED' ? 403 : 503 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'route',
        provider: result.provider,
        model: result.model,
        mode: 'buffered_canonical_execution',
      })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'chunk',
        content: result.output,
      })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'done',
        provider: result.provider,
        model: result.model,
        artifactId: result.artifactId ?? null,
      })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Stream-Mode': 'buffered-canonical-execution',
    },
  })
}
