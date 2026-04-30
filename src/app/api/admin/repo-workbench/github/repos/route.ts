import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listGitHubRepos } from '@/lib/github-integration'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const result = await listGitHubRepos()
  return NextResponse.json({ success: !result.error, repos: result.repos, blocker: result.error })
}
