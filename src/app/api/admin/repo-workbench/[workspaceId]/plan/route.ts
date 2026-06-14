import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createPlanTask, type AgentMode } from '@/lib/repo-workbench'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import {
  completeExecution,
  createExecution,
  failExecution,
  startExecution,
} from '@/lib/execution'

export async function POST(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { request?: string; scope?: string; agentMode?: AgentMode; modelId?: string }
    if (!body.request?.trim()) return NextResponse.json({ error: 'request is required' }, { status: 400 })
    const execution = createExecution({
      appSlug: 'repo-workbench',
      appId: workspaceId,
      actor: { type: 'admin', label: 'Repo Workbench' },
      requestedCapability: 'repo_edit',
      prompt: body.request.trim(),
      action: 'repo_scan',
      selectedModel: body.modelId,
      metadata: {
        workspaceId,
        scope: body.scope || 'auto',
        agentMode: body.agentMode || 'fullstack_builder',
      },
    })
    const status = await getRepoWorkbenchStatus()
    if (!status.canPatch) {
      failExecution(execution.executionId, status.blockers.join('; ') || 'Repo planning prerequisites are not ready')
      return NextResponse.json({ success: false, setupRequired: true, error: status.blockers.join('; ') || 'Repo planning prerequisites are not ready' }, { status: 503 })
    }
    startExecution(execution.executionId)
    const result = await createPlanTask({
      workspaceId,
      request: body.request,
      scope: body.scope || 'auto',
      agentMode: body.agentMode || 'fullstack_builder',
      modelId: body.modelId,
      executionId: execution.executionId,
    })
    const completed = completeExecution({
      executionId: execution.executionId,
      result,
      artifact: result.artifact?.id
        ? { artifactId: result.artifact.id, type: 'implementation_plan', url: result.artifact.storageUrl }
        : undefined,
      job: result.task?.id
        ? { jobId: result.task.id, type: 'repo_plan', status: result.task.status }
        : undefined,
    })
    return NextResponse.json({
      success: true,
      ...result,
      executionId: execution.executionId,
      execution: completed,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Plan failed' }, { status: 500 })
  }
}
