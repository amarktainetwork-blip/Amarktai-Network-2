import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listBranches } from '@/lib/github-integration'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const repo = new URL(req.url).searchParams.get('repo') || ''
  if (!repo) return NextResponse.json({ success: false, error: 'repo is required' }, { status: 400 })
  const result = await listBranches(repo)
  return NextResponse.json({ success: !result.error, ...result, blocker: result.error })
}
