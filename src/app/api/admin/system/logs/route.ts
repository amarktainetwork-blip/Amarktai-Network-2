import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listRecords } from '@/lib/local-json-store'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') || 50), 200)
  return NextResponse.json({ events: listRecords('jobs/command-jobs.json').slice(-limit).reverse(), note: 'Raw system journal access is intentionally not exposed by default.' })
}
