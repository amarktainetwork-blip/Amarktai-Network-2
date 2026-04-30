import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { saveGitHubConfig, validateGitHubToken } from '@/lib/github-integration'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json() as { token?: string; defaultOwner?: string }
    const token = body.token?.trim()
    if (!token) return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 })
    await saveGitHubConfig({ username: '', accessToken: token, defaultOwner: body.defaultOwner?.trim() || '' })
    const validation = await validateGitHubToken()
    return NextResponse.json({
      success: validation.valid,
      configured: true,
      authenticated: validation.valid,
      username: validation.username,
      blocker: validation.valid ? null : validation.error,
    }, { status: validation.valid ? 200 : 400 })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'GitHub token save failed' }, { status: 500 })
  }
}
