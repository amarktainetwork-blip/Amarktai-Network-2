import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkbenchJobLogs } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { jobId } = await params
  return NextResponse.json({ success: true, logs: await getWorkbenchJobLogs(jobId) })
}
