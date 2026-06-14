import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getLatestCreativeSmokeReport } from '@/lib/creative-smoke-report'
import { runLiveCreativeSmokeTest } from '@/lib/creative-smoke-test'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ report: await getLatestCreativeSmokeReport() })
}

export async function POST() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ report: await runLiveCreativeSmokeTest() })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Live creative smoke test failed.',
    }, { status: 500 })
  }
}
