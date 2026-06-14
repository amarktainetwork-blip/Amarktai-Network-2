import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  ADULT_CAPABILITY_IDS,
  ALWAYS_BLOCKED_ADULT_CATEGORIES,
  getAdultAppCapabilityProfile,
} from '@/lib/adult-app-capabilities'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const appSlug = request.nextUrl.searchParams.get('appSlug') || 'amarktai-network'
  const [profile, models] = await Promise.all([
    getAdultAppCapabilityProfile(appSlug),
    prisma.approvedModelRegistry.findMany({
      where: { adultPermitted: true, approved: true },
      orderBy: [{ provider: 'asc' }, { modelId: 'asc' }],
    }),
  ])
  const capabilities = ADULT_CAPABILITY_IDS.map((id) => {
    const matching = models.filter((model) => {
      if (id === 'adult_text') return model.adultText
      if (id === 'adult_image') return model.adultImage
      if (id === 'adult_voice') return model.adultVoice
      if (id === 'adult_avatar') return model.adultAvatar
      return model.adultVideo
    })
    const enabled = profile.adultModeEnabled && profile.capabilities[id]
    return {
      id,
      enabled,
      readiness: !enabled
        ? 'blocked'
        : matching.some((model) => model.adapterStatus === 'implemented' && model.liveTestStatus === 'passed')
          ? 'ready'
          : 'setup_required',
      approvedRoutes: matching,
      action: !enabled ? 'Enable for app' : matching.length ? 'Test route' : 'Configure approved provider/model',
    }
  })
  return NextResponse.json({
    source: 'AppAiProfile + ApprovedModelRegistry + canonical V1 policy',
    appSlug,
    profile,
    capabilities,
    alwaysBlockedCategories: ALWAYS_BLOCKED_ADULT_CATEGORIES,
  })
}
