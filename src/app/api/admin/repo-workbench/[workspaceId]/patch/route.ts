import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createPatchProposal, type AgentMode } from '@/lib/repo-workbench'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { taskId?: string; request?: string; files?: string[]; agentMode?: AgentMode; modelId?: string }
    if (!body.request?.trim()) return NextResponse.json({ error: 'request is required' }, { status: 400 })
    const status = await getRepoWorkbenchStatus()
    if (!status.canPatch) {
      return NextResponse.json({ success: false, setupRequired: true, error: status.blockers.join('; ') || 'Repo patch prerequisites are not ready' }, { status: 503 })
    }
    const result = await createPatchProposal({
      workspaceId,
      taskId: body.taskId,
      request: body.request,
      files: Array.isArray(body.files) ? body.files : [],
      agentMode: body.agentMode || 'fullstack_builder',
      modelId: body.modelId,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Patch generation failed' }, { status: 500 })
  }
}
