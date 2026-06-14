import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

const routeSchema = z.object({
  capability: z.string().min(1),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const matrix = await getV1BrainRouteMatrix()
  return NextResponse.json({
    success: true,
    source: matrix.source,
    summary: matrix.summary,
    capabilities: matrix.capabilities,
    mediaCapabilities: matrix.capabilities.filter((capability) =>
      ['image', 'video', 'audio', 'music', 'transcript'].includes(capability.outputType),
    ),
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = routeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid route request' }, { status: 422 })
  }
  const matrix = await getV1BrainRouteMatrix()
  const capabilityId = taxonomyCapability(parsed.data.capability)
  const capability = matrix.capabilities.find((entry) => entry.id === capabilityId)
  if (!capability) {
    return NextResponse.json({ success: false, error: 'Capability is not in the V1 matrix.' }, { status: 404 })
  }
  return NextResponse.json({
    success: true,
    route: capability.selectedRoute,
    fallbacks: capability.fallbackRoutes,
    readiness: capability.readiness,
    blocker: capability.blocker,
    requiredSourceInput: capability.requiredSourceInput,
  })
}

function taxonomyCapability(capability: string) {
  const map: Record<string, string> = {
    coding: 'text_generation',
    image: 'text_to_image',
    image_generation: 'text_to_image',
    video: 'text_to_video',
    video_generation: 'text_to_video',
    tts: 'text_to_speech',
    voice_tts: 'text_to_speech',
    stt: 'automatic_speech_recognition',
    voice_stt: 'automatic_speech_recognition',
    adult_text: 'text_generation',
    adult_image: 'text_to_image',
    adult_video: 'text_to_video',
    adult_voice: 'text_to_speech',
  }
  return map[capability] ?? capability
}
