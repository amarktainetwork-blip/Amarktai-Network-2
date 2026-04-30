import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkbenchJob, getWorkbenchJobLogs } from '@/lib/repo-workbench'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const jobId = new URL(req.url).searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 })
  try {
    const [job, logs] = await Promise.all([getWorkbenchJob(jobId), getWorkbenchJobLogs(jobId)])
    return NextResponse.json({ success: true, job, logs })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Deploy status failed' }, { status: 404 })
  }
}
