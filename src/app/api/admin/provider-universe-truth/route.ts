import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderUniverseTruth } from '@/lib/provider-universe-truth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const truth = await getProviderUniverseTruth()
    return NextResponse.json({ success: true, truth })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Provider universe compatibility adapter failed.',
      },
      { status: 500 },
    )
  }
}
