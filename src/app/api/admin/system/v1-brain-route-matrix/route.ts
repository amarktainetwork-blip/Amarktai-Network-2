import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getV1BrainRouteMatrix())
}
