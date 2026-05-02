import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { planAiRoute } from '@/lib/ai-routing-policy'
import { selectGenXModel, streamGenXChat, type GenXCapability, type GenXModelPolicy, type GenXOperationType } from '@/lib/genx-client'
import { streamUniversalProvider } from '@/lib/universal-provider-call'

const streamSchema = z.object({
  message: z.string().min(1).max(24_000),
  capability: z.enum(['chat', 'coding', 'reasoning', 'creative', 'research', 'adult_text']).default('chat'),
  costPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).default('balanced'),
  systemPrompt: z.string().max(8_000).optional(),
  allowAdult: z.boolean().default(false),
  timeoutMs: z.number().min(5_000).max(90_000).optional(),
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

function genxPolicy(costPreference: string): GenXModelPolicy {
  if (costPreference === 'cheap' || costPreference === 'free_first') return 'cheap'
  if (costPreference === 'premium') return 'best'
  return 'balanced'
}

function genxCapability(capability: string): { capability: GenXCapability; operation: GenXOperationType } {
  switch (capability) {
    case 'coding': return { capability: 'code_generation', operation: 'code' }
    case 'reasoning': return { capability: 'reasoning', operation: 'plan' }
    case 'research': return { capability: 'research', operation: 'plan' }
    case 'adult_text': return { capability: 'adult_text', operation: 'chat' }
    case 'creative':
    case 'chat':
    default:
      return { capability: 'chat', operation: 'chat' }
  }
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
      const requestStartedAt = Date.now()
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

        const systemPrompt = payload.systemPrompt ?? [
          'You are Aiva, the Amarktai Network operator assistant.',
          'Hold a real-time conversation, answer directly, and keep replies practical.',
          'Do not claim actions were completed unless the tool or API result proves it.',
          'When giving code/deploy guidance, prefer safe, reversible, copy-paste-ready steps.',
        ].join('\n')

        if (plan.selected.provider === 'genx') {
          const mapped = genxCapability(payload.capability)
          const selectedModel = await selectGenXModel(genxPolicy(payload.costPreference), mapped.capability, mapped.operation)

          controller.enqueue(sse('status', {
            message: 'Streaming through GenX',
            provider: 'genx',
            model: selectedModel,
          }))

          const result = await streamGenXChat({
            model: selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: payload.message },
            ],
            max_tokens: 1400,
            temperature: payload.capability === 'creative' || payload.capability === 'adult_text' ? 0.8 : 0.35,
            stream: true,
            metadata: {
              source: 'admin_conversation_stream',
              capability: payload.capability,
              costPreference: payload.costPreference,
              appSlug: payload.appProfile?.appSlug ?? 'amarktai-network',
            },
          }, (event) => {
            if (event.type === 'chunk' && event.content) controller.enqueue(sse('token', { text: event.content }))
            if (event.type === 'error') controller.enqueue(sse('error', { message: event.error ?? 'GenX stream error' }))
          })

          if (!result.success) {
            controller.enqueue(sse('error', { message: result.error ?? 'GenX stream failed', provider: 'genx', model: result.model }))
            controller.close()
            return
          }

          controller.enqueue(sse('done', {
            provider: 'genx',
            model: result.model,
            routeReason: plan.selected.reason,
            streaming: 'native',
            latencyMs: Date.now() - requestStartedAt,
          }))
          controller.close()
          return
        }

        controller.enqueue(sse('status', {
          message: 'Streaming selected provider',
          provider: plan.selected.provider,
          model: plan.selected.model,
        }))

        const result = await streamUniversalProvider({
          providerKey: plan.selected.provider,
          model: plan.selected.model,
          message: payload.message,
          systemPrompt,
          maxTokens: 1400,
          temperature: payload.capability === 'creative' || payload.capability === 'adult_text' ? 0.8 : 0.35,
          timeoutMs: payload.timeoutMs,
        }, (event) => {
          if (event.type === 'start') {
            controller.enqueue(sse('status', {
              message: 'Native provider stream opened',
              provider: event.providerKey,
              model: event.model,
              streaming: event.streaming,
            }))
          }
          if (event.type === 'token' && event.content) {
            controller.enqueue(sse('token', {
              text: event.content,
              firstTokenMs: event.firstTokenMs,
              streaming: event.streaming,
            }))
          }
          if (event.type === 'error') {
            controller.enqueue(sse('error', {
              message: event.error ?? 'Provider stream error',
              provider: event.providerKey,
              model: event.model,
              latencyMs: event.latencyMs,
              firstTokenMs: event.firstTokenMs,
            }))
          }
        })

        if (!result.ok) {
          controller.close()
          return
        }

        controller.enqueue(sse('done', {
          provider: result.providerKey,
          model: result.model,
          latencyMs: result.latencyMs,
          routeReason: plan.selected.reason,
          streaming: 'native',
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
