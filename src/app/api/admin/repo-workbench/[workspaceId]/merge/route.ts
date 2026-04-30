import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { mergeWorkspacePr } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { prNumber?: number; confirm?: boolean; override?: boolean }
    if (!body.confirm) return NextResponse.json({ success: false, error: 'confirm=true is required to merge' }, { status: 400 })
    if (!body.prNumber) return NextResponse.json({ success: false, error: 'prNumber is required' }, { status: 400 })
    return NextResponse.json({ success: true, ...(await mergeWorkspacePr(workspaceId, body.prNumber, Boolean(body.override))) })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Merge failed' }, { status: 409 })
  }
}
