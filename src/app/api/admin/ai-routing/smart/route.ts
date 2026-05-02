import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { planAiRoute } from '@/lib/ai-routing-policy'
import { shouldAvoidProvider } from '@/lib/provider-intelligence'

const smartRouteSchema = z.object({
  capability: z.enum(['chat', 'coding', 'reasoning', 'creative', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt', 'music_generation', 'embeddings', 'moderation', 'research', 'adult_image', 'adult_text']),
  costPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).optional(),
  allowAdult: z.boolean().optional().default(false),
  requireStreaming: z.boolean().optional(),
  requireStructuredOutput: z.boolean().optional(),
  avoidBadProviders: z.boolean().optional().default(true),
  appProfile: z.object({
    appSlug: z.string().optional(),
    appType: z.string().optional(),
    safetyProfile: z.enum(['standard', 'child_safe', 'religious_safe', 'adult_safe', 'education_safe', 'medical_caution', 'travel_safe']).optional(),
    defaultCostPreference: z.enum(['free_first', 'cheap', 'balanced', 'premium']).optional(),
  }).optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = smartRouteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid smart routing request', details: parsed.error.flatten() }, { status: 422 })
  }

  const basePlan = await planAiRoute(parsed.data)
  if (!parsed.data.avoidBadProviders || !basePlan.candidates.length) {
    return NextResponse.json({ success: true, plan: basePlan, smartRoutingApplied: false })
  }

  const appSlug = parsed.data.appProfile?.appSlug || 'amarktai-network'
  const candidates = []
  const avoidance: Array<{ provider: string; model: string; avoid: boolean; reason: string }> = []

  for (const candidate of basePlan.candidates) {
    if (candidate.blocked) {
      candidates.push(candidate)
      continue
    }

    const decision = await shouldAvoidProvider({
      appSlug,
      provider: candidate.provider,
      model: candidate.model,
      capability: parsed.data.capability,
      days: 14,
    })
    avoidance.push({ provider: candidate.provider, model: candidate.model, avoid: decision.avoid, reason: decision.reason })
    candidates.push(decision.avoid
      ? { ...candidate, blocked: true, blocker: `Provider intelligence: ${decision.reason}` }
      : candidate)
  }

  const selected = basePlan.blockers.length > 0 ? null : candidates.find((candidate) => !candidate.blocked) ?? null
  const blockers = [...basePlan.blockers]
  if (!selected && blockers.length === 0) blockers.push('Smart routing avoided every configured provider. Review provider scores or disable avoidBadProviders for manual override.')

  return NextResponse.json({
    success: true,
    smartRoutingApplied: true,
    avoidance,
    plan: {
      ...basePlan,
      candidates,
      selected,
      blockers,
      generatedAt: new Date().toISOString(),
    },
  })
}
