import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listWorkspaceBranches } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const result = await listWorkspaceBranches(workspaceId)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Branch list failed' }, { status: 500 })
  }
}
