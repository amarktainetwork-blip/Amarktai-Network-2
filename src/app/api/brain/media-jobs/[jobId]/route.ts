import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { localMediaJobResponse, pollLocalMediaJob } from '@/lib/media-job-store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = await pollLocalMediaJob(jobId)
  if (!job) {
    return NextResponse.json({
      success: false,
      executed: false,
      jobId,
      jobStatus: 'failed',
      status: 'failed',
      artifactId: null,
      storageUrl: null,
      error: 'Media job not found.',
      blocker: 'Media job not found.',
    }, { status: 404 })
  }

  return NextResponse.json(localMediaJobResponse(job))
}
