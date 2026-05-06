import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { streamGenXChat } from '@/lib/genx-client'
import { routeLiveModel } from '@/lib/live-ai-routing'
import { recordEstimatedCost } from '@/lib/cost-tracking'

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
  if (!body.message?.trim()) return Response.json({ error: 'message is required' }, { status: 400 })

  const route = routeLiveModel({
    capability: normalizeCapability(body.capability),
    appSlug: String(body.metadata?.appSlug ?? 'studio'),
    selectedProvider: body.providerOverride,
    selectedModel: body.modelOverride,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: String(body.metadata?.adultPolicy ?? 'full_adult_app_mode') as never,
  })
  if (route.blockedReason || !route.selectedProvider || !route.selectedModel) {
    return Response.json({ success: false, error: route.blockedReason ?? 'No approved route is available', route }, { status: 409 })
  }
  const selectedProvider = route.selectedProvider
  const selectedModel = route.selectedModel

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }
      send({ status: 'Routing', route })
      try {
        if (selectedProvider === 'genx') {
          await streamGenXChat({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are AmarktAI Network Superbrain Console. Use dashboard, app, memory, emotion, and Workbench context when helpful. Follow safety policy.' },
              { role: 'user', content: body.message! },
            ],
            stream: true,
            metadata: body.metadata,
          }, (event) => {
            if (event.type === 'chunk') send({ content: event.content })
            if (event.type === 'error') send({ status: event.error })
            if (event.type === 'done') send({ status: 'Done' })
          }, request.signal)
        } else {
          send({ content: `Route selected: ${selectedProvider}/${selectedModel}.\n\n${body.message}` })
          send({ status: 'Done' })
        }
        await recordEstimatedCost({
          provider: selectedProvider,
          model: selectedModel,
          appSlug: String(body.metadata?.appSlug ?? 'studio'),
          agentId: 'amarktai-assistant',
          capability: body.capability ?? 'chat',
          runType: 'studio-stream',
          costMode: route.costMode,
          estimatedCostUsd: route.estimatedCostUsd,
        }).catch(() => null)
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        send({ status: error instanceof Error ? error.message : 'Studio stream failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

function normalizeCapability(value?: string) {
  if (value === 'code') return 'coding'
  if (value === 'image_generation') return 'image'
  if (value === 'video_generation') return 'video'
  if (value === 'tts') return 'voice_tts'
  if (value === 'stt') return 'voice_stt'
  if (value === 'scrape_website') return 'research'
  if (value === 'adult_text') return 'adult_text'
  return 'chat'
}
