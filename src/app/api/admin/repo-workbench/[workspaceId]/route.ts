import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { deleteRepoWorkspace } from '@/lib/repo-workbench'

export async function DELETE(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { workspaceId } = await params
    const result = await deleteRepoWorkspace(workspaceId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Workspace delete failed' }, { status: 500 })
  }
}
