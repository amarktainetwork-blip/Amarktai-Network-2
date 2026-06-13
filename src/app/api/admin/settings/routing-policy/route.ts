import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  resolveRoutingQuality,
  saveRoutingDefaults,
  ROUTING_QUALITY_TIERS,
} from '@/lib/capability-routing-policy'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const [studio, connectedApps] = await Promise.all([
    resolveRoutingQuality({ surface: 'studio' }),
    resolveRoutingQuality({ surface: 'connected_apps' }),
  ])
  return NextResponse.json({ success: true, routingPolicy: { studio, connectedApps } })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    studio?: string
    connectedApps?: string
  }
  if (
    !body.studio
    || !body.connectedApps
    || !ROUTING_QUALITY_TIERS.includes(body.studio as never)
    || !ROUTING_QUALITY_TIERS.includes(body.connectedApps as never)
  ) {
    return NextResponse.json({
      success: false,
      error: 'studio and connectedApps must be cheap, balanced, premium, auto, or mixed.',
    }, { status: 400 })
  }
  const routingPolicy = await saveRoutingDefaults({
    studio: body.studio as never,
    connectedApps: body.connectedApps as never,
  })
  return NextResponse.json({ success: true, routingPolicy })
}
