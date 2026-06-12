import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createArtifact } from '@/lib/artifact-store'
import { completeExecution, createExecution, failExecution, startExecution } from '@/lib/execution'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const projects = await prisma.playgroundProject.findMany({ orderBy: { updatedAt: 'desc' }, take: 50 }).catch(() => [])
  return NextResponse.json({ projects, workflow: ['Clarify', 'Plan', 'Design', 'Generate', 'Media policy', 'Preview', 'Runtime QA', 'Final gate'] })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as {
    name?: string
    prompt?: string
    type?: string
    provider?: string
    model?: string
    costMode?: 'cheap' | 'balanced' | 'premium'
  }
  if (!body.name?.trim() || !body.prompt?.trim()) return NextResponse.json({ error: 'name and prompt are required' }, { status: 400 })
  try {
    const execution = createExecution({
      appSlug: 'app-builder',
      actor: { type: 'admin', label: 'App Builder' },
      requestedCapability: 'app_build',
      prompt: body.prompt.trim(),
      action: 'generate',
      selectedProvider: body.provider,
      selectedModel: body.model,
      costMode: body.costMode,
      metadata: { projectName: body.name.trim(), projectType: body.type || 'app_builder' },
    })
    startExecution(execution.executionId)
    const workflow = [{ stage: 'Clarify', status: 'ready' }, { stage: 'Plan', status: 'pending' }, { stage: 'Design', status: 'pending' }, { stage: 'Generate', status: 'pending' }, { stage: 'Media policy', status: 'pending' }, { stage: 'Preview', status: 'pending' }, { stage: 'Runtime QA', status: 'pending' }, { stage: 'Final gate', status: 'pending' }]
    const project = await prisma.playgroundProject.create({
      data: {
        name: body.name.trim(),
        description: body.prompt.trim(),
        type: body.type || 'app_builder',
        status: 'draft',
        promptHistoryJson: JSON.stringify([{ role: 'user', content: body.prompt.trim(), createdAt: new Date().toISOString() }]),
        workflowsJson: JSON.stringify(workflow),
      },
    })
    const blueprint = {
      projectId: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      sourcePrompt: body.prompt.trim(),
      workflow,
    }
    try {
      const artifact = await createArtifact({
        appSlug: 'app-builder',
        appId: String(project.id),
        executionId: execution.executionId,
        type: 'app_blueprint',
        subType: 'draft_blueprint',
        capability: 'app_build',
        title: `${project.name} blueprint`,
        description: project.description,
        provider: execution.providerPlan.provider ?? undefined,
        model: execution.modelPlan.model ?? undefined,
        mimeType: 'application/json',
        content: Buffer.from(JSON.stringify(blueprint, null, 2)),
        metadata: { projectId: project.id, projectType: project.type },
      })
      const completed = completeExecution({
        executionId: execution.executionId,
        result: { projectId: project.id, artifactId: artifact.id },
        artifact: { artifactId: artifact.id, type: artifact.type, url: artifact.downloadUrl },
      })
      return NextResponse.json({
        project,
        blueprint,
        artifact,
        executionId: execution.executionId,
        execution: completed,
      }, { status: 201 })
    } catch (artifactError) {
      const message = `Project draft was created but its blueprint artifact could not be persisted: ${
        artifactError instanceof Error ? artifactError.message : 'unknown error'
      }`
      failExecution(execution.executionId, message)
      return NextResponse.json({ error: message, projectId: project.id, executionId: execution.executionId }, { status: 503 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Project storage unavailable' }, { status: 503 })
  }
}
