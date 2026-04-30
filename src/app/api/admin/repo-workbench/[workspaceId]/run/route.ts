import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runMagicPipeline, runWorkbenchCommand, type QualityTier } from '@/lib/repo-workbench'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { instruction?: string; quality?: QualityTier; command?: string }
    if (body.command?.trim()) {
      const result = await runWorkbenchCommand(workspaceId, body.command)
      return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 500 })
    }
    if (!body.instruction?.trim()) return NextResponse.json({ success: false, error: 'instruction or command is required' }, { status: 400 })
    const status = await getRepoWorkbenchStatus()
    if (!status.canPatch) {
      return NextResponse.json({ success: false, setupRequired: true, error: status.blockers.join('; ') || 'Repo AI prerequisites are not ready' }, { status: 503 })
    }
    const quality: QualityTier = (['best', 'good', 'balanced', 'cheap'] as const).includes(body.quality as QualityTier)
      ? (body.quality as QualityTier)
      : 'balanced'
    const result = await runMagicPipeline({ workspaceId, instruction: body.instruction.trim(), quality })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Run failed' }, { status: 500 })
  }
}
