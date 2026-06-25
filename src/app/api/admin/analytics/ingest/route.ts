/**
 * POST /api/admin/analytics/ingest
 * Ingests analytics metrics and records a learning signal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { ingestAnalytics, type AnalyticMetric } from '@/lib/publishing-scheduler'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const campaignId = body.campaignId as string | undefined
  const assetId = body.assetId as string | undefined
  const platform = (body.platform as string) ?? 'generic_export'
  // Accept both 'metric'/'value' (frontend form) and 'metricName'/'metricValue' (direct API)
  const metricName = (body.metricName ?? body.metric) as AnalyticMetric | undefined
  const metricValue = (body.metricValue ?? body.value) as number | undefined

  if (!metricName || metricValue === undefined) {
    return NextResponse.json({ error: 'metric (or metricName) and value (or metricValue) are required' }, { status: 400 })
  }

  try {
    const result = await ingestAnalytics({
      appSlug,
      campaignId,
      assetId,
      platform,
      metricName,
      metricValue,
      source: 'manual',
      metadata: body.metadata as Record<string, unknown> | undefined,
    })
    return NextResponse.json({ ok: true, metric: metricName, value: metricValue, id: result.id })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ingest failed' }, { status: 500 })
  }
}
