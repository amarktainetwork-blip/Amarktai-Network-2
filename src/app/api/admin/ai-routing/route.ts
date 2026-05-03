import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { defaultAppCapabilityProfiles, planAiRoute, type AiCapability, type AiRouteRequest } from '@/lib/ai-routing-policy'

const capabilitySchema = z.enum([
  'chat',
  'coding',
  'reasoning',
  'creative',
  'image_generation',
  'video_generation',
  'voice_tts',
  'voice_stt',
  'music_generation',
  'embeddings',
  'moderation',
  'research',
  'adult_image',
  'adult_text',
])

const routeSchema = z.object({
  capability: capabilitySchema,
  costPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).optional(),
  allowAdult: z.boolean().optional(),
  requireStreaming: z.boolean().optional(),
  requireStructuredOutput: z.boolean().optional(),
  appProfile: z.object({
    appSlug: z.string().optional(),
    appType: z.string().optional(),
    safetyProfile: z.enum(['standard', 'child_safe', 'religious_safe', 'adult_safe', 'education_safe', 'medical_caution', 'travel_safe']).optional(),
    enabledCapabilities: z.array(capabilitySchema).optional(),
    defaultCostPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).optional(),
    maxDailyUsd: z.number().optional(),
    maxMonthlyUsd: z.number().optional(),
    notes: z.string().optional(),
  }).optional(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profiles = defaultAppCapabilityProfiles()
  const routeSamples = await Promise.all([
    planAiRoute({ capability: 'chat', costPreference: 'cheap' }),
    planAiRoute({ capability: 'coding', costPreference: 'balanced' }),
    planAiRoute({ capability: 'image_generation', costPreference: 'balanced' }),
    planAiRoute({ capability: 'adult_text', costPreference: 'balanced', allowAdult: true, appProfile: { safetyProfile: 'adult_safe' } }),
  ])

  return NextResponse.json({
    success: true,
    profiles,
    routeSamples,
    note: 'This endpoint is the Phase 2 foundation for app-aware provider/model routing. It does not execute providers; it explains the safest route plan from runtime truth.',
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = routeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid route request',
      details: parsed.error.flatten(),
    }, { status: 422 })
  }

  const routeRequest: AiRouteRequest = {
    ...parsed.data,
    capability: parsed.data.capability as AiCapability,
    appProfile: parsed.data.appProfile
      ? {
          ...parsed.data.appProfile,
          enabledCapabilities: parsed.data.appProfile.enabledCapabilities as AiCapability[] | undefined,
        }
      : undefined,
  }

  const plan = await planAiRoute(routeRequest)
  return NextResponse.json({ success: true, plan })
}
