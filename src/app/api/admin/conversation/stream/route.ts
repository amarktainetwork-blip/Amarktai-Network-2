import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { callProvider } from '@/lib/brain'
import { planAiRoute } from '@/lib/ai-routing-policy'

const streamSchema = z.object({
  message: z.string().min(1).max(24_000),
  capability: z.enum(['chat', 'coding', 'reasoning', 'creative', 'research', 'adult_text']).default('chat'),
  costPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).default('balanced'),
  systemPrompt: z.string().max(8_000).optional(),
  allowAdult: z.boolean().default(false),
  appProfile: z.object({
    appSlug: z.string().optional(),
    appType: z.string().optional(),
    safetyProfile: z.enum(['standard', 'child_safe', 'religious_safe', 'adult_safe', 'education_safe', 'medical_caution', 'travel_safe']).optional(),
    defaultCostPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).optional(),
  }).optional(),
})

const encoder = new TextEncoder()

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = streamSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid stream request', details: parsed.error.flatten() }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload = parsed.data

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sse('status', { message: 'Planning route', capability: payload.capability, costPreference: payload.costPreference }))

        const plan = await planAiRoute({
          capability: payload.capability,
          costPreference: payload.costPreference,
          allowAdult: payload.allowAdult,
          requireStreaming: true,
          appProfile: payload.appProfile,
        })

        controller.enqueue(sse('route', plan))

        if (!plan.selected) {
          controller.enqueue(sse('error', {
            message: 'No provider route available',
            blockers: plan.blockers,
          }))
          controller.close()
          return
        }

        controller.enqueue(sse('status', {
          message: 'Calling selected provider',
          provider: plan.selected.provider,
          model: plan.selected.model,
        }))

        const systemPrompt = payload.systemPrompt ?? [
          'You are the Amarktai Network operator assistant.',
          'Be direct, practical, and production-focused.',
          'Do not claim actions were completed unless the tool or API result proves it.',
          'When giving code/deploy guidance, prefer safe, reversible, copy-paste-ready steps.',
        ].join('\n')

        const result = await callProvider(plan.selected.provider, plan.selected.model, payload.message, systemPrompt)

        if (!result.ok || !result.output) {
          controller.enqueue(sse('error', {
            message: result.error ?? 'Provider returned no output',
            provider: result.providerKey,
            model: result.model,
            latencyMs: result.latencyMs,
          }))
          controller.close()
          return
        }

        const text = result.output
        const chunkSize = 160
        for (let index = 0; index < text.length; index += chunkSize) {
          controller.enqueue(sse('token', { text: text.slice(index, index + chunkSize) }))
          await new Promise((resolve) => setTimeout(resolve, 5))
        }

        controller.enqueue(sse('done', {
          provider: result.providerKey,
          model: result.model,
          latencyMs: result.latencyMs,
          routeReason: plan.selected.reason,
        }))
        controller.close()
      } catch (error) {
        controller.enqueue(sse('error', { message: error instanceof Error ? error.message : 'Streaming conversation failed' }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
