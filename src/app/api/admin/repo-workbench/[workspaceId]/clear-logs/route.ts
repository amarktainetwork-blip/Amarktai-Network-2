import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { clearRepoWorkspaceLogs } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({})) as { confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ success: false, error: 'confirm=true is required to clear logs' }, { status: 400 })
    const { workspaceId } = await params
    const result = await clearRepoWorkspaceLogs(workspaceId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Clear logs failed' }, { status: 500 })
  }
}
