import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkbenchJob } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { jobId } = await params
    return NextResponse.json({ success: true, job: await getWorkbenchJob(jobId) })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Job lookup failed' }, { status: 404 })
  }
}
