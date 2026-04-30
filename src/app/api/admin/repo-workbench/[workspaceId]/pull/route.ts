import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { pullWorkspaceLatest } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json().catch(() => ({})) as { force?: boolean }
    const result = await pullWorkspaceLatest(workspaceId, Boolean(body.force))
    return NextResponse.json(result, { status: result.success ? 200 : 409 })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Pull failed' }, { status: 500 })
  }
}
