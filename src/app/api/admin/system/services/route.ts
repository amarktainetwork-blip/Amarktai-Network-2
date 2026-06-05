import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVpsSnapshot } from '@/lib/vps-monitor'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const snapshot = await getVpsSnapshot()
  return NextResponse.json({ services: snapshot.services, checkedAt: snapshot.checkedAt })
}
