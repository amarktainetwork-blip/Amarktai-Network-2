import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { longFormVideoJobResponse, pollLongFormVideoJob } from '@/lib/long-form-video-store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = await pollLongFormVideoJob(jobId)
  if (!job) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: 'long_form_video',
      jobId,
      jobStatus: 'failed',
      status: 'failed',
      artifactId: null,
      storageUrl: null,
      error: 'Long-form video job not found.',
      blocker: 'Long-form video job not found.',
    }, { status: 404 })
  }

  return NextResponse.json(longFormVideoJobResponse(job))
}
