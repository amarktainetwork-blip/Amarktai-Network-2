import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getGitHubConfig, validateGitHubToken } from '@/lib/github-integration'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const config = await getGitHubConfig()
  const validation = config?.configured ? await validateGitHubToken() : { valid: false, username: null, error: 'GitHub token not configured' }
  return NextResponse.json({
    success: validation.valid,
    configured: Boolean(config?.configured),
    authenticated: validation.valid,
    username: validation.username ?? config?.username ?? null,
    tokenMasked: config?.accessTokenMasked ?? null,
    blocker: validation.valid ? null : validation.error,
  })
}
