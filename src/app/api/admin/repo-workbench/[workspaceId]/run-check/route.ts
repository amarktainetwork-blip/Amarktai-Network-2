import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runWorkbenchCommand } from '@/lib/repo-workbench'

const LEGACY_CHECKS: Record<string, string> = {
  install: 'npm install',
  ci: 'npm ci',
  test: 'npm test',
  lint: 'npm run lint',
  build: 'npm run build',
  audit: 'npm audit --audit-level=moderate',
}

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { command?: string }
    const command = body.command ? (LEGACY_CHECKS[body.command] ?? body.command) : ''
    if (!command) return NextResponse.json({ success: false, error: 'command is required' }, { status: 400 })
    const result = await runWorkbenchCommand(workspaceId, command)
    return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 500 })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Check failed' }, { status: 500 })
  }
}
