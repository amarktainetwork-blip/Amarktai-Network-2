import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(): Promise<NextResponse> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    capability: 'realtime_voice',
    executed: false,
    availabilityLevel: 'NOT_AVAILABLE',
    error: 'Realtime voice sessions are not wired to an approved active provider.',
  }, { status: 501 })
}
