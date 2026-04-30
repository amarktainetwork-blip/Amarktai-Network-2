import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deployWorkspace, getWorkbenchJob } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { confirmation?: string; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ success: false, error: 'confirm=true is required to deploy' }, { status: 400 })
    return NextResponse.json({ success: true, ...(await deployWorkspace(workspaceId, body.confirmation || '')) })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Deploy failed' }, { status: 409 })
  }
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const jobId = new URL(req.url).searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 })
  return NextResponse.json({ success: true, job: await getWorkbenchJob(jobId) })
}
