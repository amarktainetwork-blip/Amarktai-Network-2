import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, status: await getSystemRuntimeStatus() })
}
