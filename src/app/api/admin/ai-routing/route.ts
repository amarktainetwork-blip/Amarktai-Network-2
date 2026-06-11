import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { LIVE_ROUTING_CAPABILITIES, routeLiveModel } from '@/lib/live-ai-routing'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { getAdultCapabilityGate, getRuntimeProviderStatus } from '@/lib/runtime-capability-truth'

const routeSchema = z.object({
  capability: z.enum([
    'chat',
    'reasoning',
    'coding',
    'research',
    'image',
    'image_generation',
    'video',
    'video_generation',
    'music_generation',
    'tts',
    'stt',
    'audio',
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

  const providers = await getRuntimeProviderStatus()
  const connected = new Set(providers.filter((provider) => provider.connected).map((provider) => provider.key))
  const adultGate = await getAdultCapabilityGate(providers)
  const mediaCapabilities = Object.values(MEDIA_CAPABILITY_ROUTES).map((route) => {
    const available = route.providers.filter((entry) => connected.has(entry.provider))
    const adultBlocked = route.capability.startsWith('adult_') && adultGate.status !== 'READY'
    return {
      capability: route.capability,
      route: route.route,
      execution: route.execution,
      artifactType: route.artifactType,
      status: available.length > 0 && !adultBlocked ? 'available' : 'needs_setup',
      providers: available,
      blocker: adultBlocked
        ? adultGate.blocker
        : available.length === 0
          ? 'Provider missing or no provider has passed its live test.'
          : null,
    }
  })

  return NextResponse.json({
    success: true,
    capabilities: LIVE_ROUTING_CAPABILITIES,
    mediaCapabilities,
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
