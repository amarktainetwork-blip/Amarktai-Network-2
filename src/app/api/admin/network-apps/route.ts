import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { NETWORK_APPS, NETWORK_APPS_EMPTY_MESSAGE } from '@/lib/network-apps-registry'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ apps: NETWORK_APPS, message: NETWORK_APPS_EMPTY_MESSAGE })
}
