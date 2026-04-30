import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkspaceGitStatus } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const status = await getWorkspaceGitStatus(workspaceId)
    return NextResponse.json({ success: true, ...status })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Workspace status failed' }, { status: 400 })
  }
}
