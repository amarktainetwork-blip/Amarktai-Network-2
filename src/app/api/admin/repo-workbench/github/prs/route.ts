import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getGitHubToken } from '@/lib/repo-workbench'
import { sanitizeRepoSlug } from '@/lib/workspace-security'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const repoFullName = sanitizeRepoSlug(new URL(req.url).searchParams.get('repo') || '')
    const token = await getGitHubToken()
    if (!token) return NextResponse.json({ success: false, prs: [], blocker: 'GitHub token not configured' }, { status: 503 })
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
    const data = await res.json().catch(() => [])
    if (!res.ok) return NextResponse.json({ success: false, prs: [], blocker: data?.message ?? 'Failed to list PRs' }, { status: res.status })
    return NextResponse.json({ success: true, prs: data })
  } catch (err) {
    return NextResponse.json({ success: false, prs: [], error: err instanceof Error ? err.message : 'Failed to list PRs' }, { status: 400 })
  }
}
