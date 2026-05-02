import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderScoreSummaries, readProviderResults } from '@/lib/provider-intelligence'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug') || 'amarktai-network'
  const provider = searchParams.get('provider') || undefined
  const days = Number(searchParams.get('days') || '14')
  const includeRaw = searchParams.get('includeRaw') === 'true'

  const summaries = await getProviderScoreSummaries({ appSlug, provider, days })
  const raw = includeRaw ? await readProviderResults({ appSlug, provider, days }) : undefined

  return NextResponse.json({
    success: true,
    appSlug,
    provider: provider ?? 'all',
    days,
    summaries,
    raw,
    rules: {
      avoidBelowScore: 45,
      minimumSamplesForAvoidance: 2,
      explanation: 'Provider scores are derived from provider-result JSONL logs. Routing can avoid providers with repeated failures once enough samples exist.',
    },
  })
}
