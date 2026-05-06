import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { LIVE_ROUTING_CAPABILITIES, routeLiveModel } from '@/lib/live-ai-routing'

const routeSchema = z.object({
  capability: z.enum([
    'chat',
    'reasoning',
    'coding',
    'research',
    'image',
    'video',
    'voice_tts',
    'voice_stt',
    'avatar_video',
    'moderation',
    'adult_text',
    'adult_image',
    'adult_video',
    'adult_voice',
  ]),
  appSlug: z.string().optional(),
  selectedProvider: z.string().optional(),
  selectedModel: z.string().optional(),
  costMode: z.enum(['cheap', 'balanced', 'premium']).optional(),
  adultPolicy: z.enum(['off', 'allowed']).optional(),
  budgetRemainingUsd: z.number().optional(),
  requiresStreaming: z.boolean().optional(),
  requiresMedia: z.boolean().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    success: true,
    capabilities: LIVE_ROUTING_CAPABILITIES,
    samples: [
      routeLiveModel({ capability: 'chat', costMode: 'cheap' }),
      routeLiveModel({ capability: 'coding', costMode: 'balanced' }),
      routeLiveModel({ capability: 'voice_tts', costMode: 'balanced' }),
      routeLiveModel({ capability: 'adult_text', costMode: 'premium', adultPolicy: 'allowed' }),
    ],
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = routeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid route request', details: parsed.error.flatten() }, { status: 422 })
  }

  return NextResponse.json({ success: true, route: routeLiveModel(parsed.data) })
}
