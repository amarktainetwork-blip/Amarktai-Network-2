import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(): Promise<NextResponse> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: false,
    capability: 'realtime_voice',
    status: 'unavailable',
    ready: false,
    reason: 'No approved-provider realtime voice session adapter is wired.',
  }, { status: 503 })
}
