import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { planAiRoute } from '@/lib/ai-routing-policy'
import { shouldAvoidProvider } from '@/lib/provider-intelligence'
import { routeLiveModel } from '@/lib/live-ai-routing'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { getRuntimeProviderStatus } from '@/lib/runtime-capability-truth'

const smartRouteSchema = z.object({
  capability: z.enum([
    'chat', 'coding', 'reasoning', 'creative', 'image_generation', 'video_generation',
    'voice_tts', 'voice_stt', 'tts', 'stt', 'audio', 'music_generation', 'embeddings',
    'moderation', 'research', 'adult_image', 'adult_text', 'adult_video', 'adult_voice',
  ]),
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

  const canonicalCapability = parsed.data.capability === 'voice_tts'
    ? 'tts'
    : parsed.data.capability === 'voice_stt'
      ? 'stt'
      : parsed.data.capability
  const mediaRoute = getMediaCapabilityRoute(canonicalCapability)
  if (mediaRoute) {
    const appSlug = parsed.data.appProfile?.appSlug || 'amarktai-network'
    const adultCapability = canonicalCapability.startsWith('adult_')
    const safetyBlocker = adultCapability && !parsed.data.allowAdult
      ? 'Adult capability requested but allowAdult is false.'
      : adultCapability && parsed.data.appProfile?.safetyProfile !== 'adult_safe'
        ? 'Adult capability requires app safetyProfile="adult_safe".'
        : null
    const runtimeProviders = await getRuntimeProviderStatus()
    const connected = new Set(runtimeProviders.filter((provider) => provider.connected).map((provider) => provider.key))
    const candidates = []
    const avoidance: Array<{ provider: string; model: string; avoid: boolean; reason: string }> = []

    for (const entry of mediaRoute.providers) {
      const routed = routeLiveModel({
        capability: canonicalCapability as Parameters<typeof routeLiveModel>[0]['capability'],
        appSlug,
        selectedProvider: entry.provider,
        selectedModel: entry.model,
        costMode: parsed.data.costPreference === 'premium'
          ? 'premium'
          : parsed.data.costPreference === 'cheap' || parsed.data.costPreference === 'free_first'
            ? 'cheap'
            : 'balanced',
        adultPolicy: adultCapability && parsed.data.allowAdult ? 'full_adult_app_mode' : 'off',
        requiresMedia: true,
      })
      const configured = connected.has(entry.provider)
      const decision = parsed.data.avoidBadProviders && configured
        ? await shouldAvoidProvider({
          appSlug,
          provider: entry.provider,
          model: entry.model,
          capability: canonicalCapability,
          days: 14,
        })
        : { avoid: false, reason: configured ? 'Provider intelligence disabled.' : 'Provider is not connected.' }
      avoidance.push({ provider: entry.provider, model: entry.model, avoid: decision.avoid, reason: decision.reason })
      candidates.push({
        provider: entry.provider,
        model: entry.model,
        displayName: entry.model,
        costTier: 'genx',
        reason: routed.reason || `Canonical ${canonicalCapability} route.`,
        enabled: !routed.blockedReason,
        configured,
        blocked: Boolean(safetyBlocker || routed.blockedReason || !configured || decision.avoid),
        blocker: safetyBlocker
          ?? routed.blockedReason
          ?? (!configured ? `Provider "${entry.provider}" is missing or has not passed its live test.` : null)
          ?? (decision.avoid ? `Provider intelligence: ${decision.reason}` : null),
      })
    }

    const selected = candidates.find((candidate) => !candidate.blocked) ?? null
    const blockers = [
      ...(safetyBlocker ? [safetyBlocker] : []),
      ...(!selected && !safetyBlocker ? [`No tested provider is available for ${canonicalCapability}.`] : []),
    ]
    return NextResponse.json({
      success: true,
      smartRoutingApplied: true,
      avoidance,
      plan: {
        capability: canonicalCapability,
        costPreference: parsed.data.costPreference ?? 'balanced',
        selected,
        candidates,
        blockers,
        safetyProfile: parsed.data.appProfile?.safetyProfile ?? 'standard',
        streamingSupported: canonicalCapability === 'adult_text',
        generatedAt: new Date().toISOString(),
      },
    })
  }

  const basePlan = await planAiRoute(parsed.data as Parameters<typeof planAiRoute>[0])
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
