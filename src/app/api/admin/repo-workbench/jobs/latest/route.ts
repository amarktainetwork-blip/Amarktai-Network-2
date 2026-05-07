import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getLatestWorkbenchJob } from '@/lib/repo-workbench'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, job: await getLatestWorkbenchJob() })
}
