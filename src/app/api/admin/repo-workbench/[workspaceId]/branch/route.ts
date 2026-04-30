import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createWorkspaceBranch } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { branchName?: string; checkout?: boolean; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ success: false, error: 'confirm=true is required to create a branch' }, { status: 400 })
    if (!body.branchName) return NextResponse.json({ success: false, error: 'branchName is required' }, { status: 400 })
    const result = await createWorkspaceBranch(workspaceId, body.branchName, body.checkout !== false)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Branch creation failed' }, { status: 400 })
  }
}
