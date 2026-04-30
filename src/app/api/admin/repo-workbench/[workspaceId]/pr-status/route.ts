import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getWorkspacePrStatus } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    return NextResponse.json({ success: true, ...(await getWorkspacePrStatus(workspaceId)) })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'PR status failed' }, { status: 500 })
  }
}
