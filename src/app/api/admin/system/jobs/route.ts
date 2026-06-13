import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getQueueStatus } from '@/lib/job-queue'
import { listRecords } from '@/lib/local-json-store'
import { listExecutions } from '@/lib/execution'
import { listVideoProjects } from '@/lib/long-form-video'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    queue: await getQueueStatus(),
    recent: listRecords('jobs/command-jobs.json').slice(-50).reverse(),
    executions: listExecutions({ limit: 50 }),
    videoProjects: listVideoProjects().slice(0, 50),
  })
}
