import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runAvailablePackageCheck, type AvailablePackageCheck } from '@/lib/repo-workbench'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { command?: string }
    const command = body.command
    if (!command || !['lint', 'test', 'build'].includes(command)) {
      return NextResponse.json({ success: false, error: 'command must be lint, test, or build' }, { status: 400 })
    }
    const result = await runAvailablePackageCheck(workspaceId, command as AvailablePackageCheck)
    return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 500 })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Check failed' }, { status: 500 })
  }
}
