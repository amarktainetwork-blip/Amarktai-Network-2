import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createProject, listProjects } from '@/lib/playground'
import type { ProjectStatus, ProjectType } from '@/lib/playground'
import { createExecution } from '@/lib/execution'
import {
  getCommandCenterExecution,
  listCommandCenterHistory,
  runCommandCenter,
  type CommandCenterRunInput,
} from '@/lib/command-center'

/** GET /api/admin/playground - execution history or legacy playground projects. */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  try {
    const executionId = searchParams.get('executionId')
    if (executionId) {
      const run = await getCommandCenterExecution(executionId)
      return run
        ? NextResponse.json(run)
        : NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    if (!searchParams.has('projects') && !searchParams.has('type')) {
      const runs = await listCommandCenterHistory(Number(searchParams.get('limit')) || 30)
      return NextResponse.json({ runs, executions: runs.map((run) => run.execution) })
    }

    const type = searchParams.get('type') as ProjectType | undefined
    const status = searchParams.get('status') as ProjectStatus | undefined
    const projects = await listProjects({
      type: type ?? undefined,
      status: status ?? undefined,
    })
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Playground' },
      { status: 500 },
    )
  }
}

/** POST /api/admin/playground - run Command Center or create a legacy project. */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as CommandCenterRunInput & {
      name?: string
      type?: ProjectType
      description?: string
      tags?: string[]
    }

    if (body.prompt || body.executionId || body.quickAction) {
      const run = await runCommandCenter(body)
      return NextResponse.json(
        run,
        { status: run.status === 'awaiting_approval' ? 202 : 201 },
      )
    }

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'prompt or name and type are required' },
        { status: 400 },
      )
    }
    const project = await createProject({
      name: body.name,
      type: body.type,
      description: body.description,
      tags: body.tags,
    })
    const execution = createExecution({
      appSlug: 'playground',
      actor: { type: 'admin', label: 'Command Center' },
      requestedCapability: body.type === 'code_assistant' ? 'code' : 'chat',
      prompt: body.description || body.name,
      action: 'generate',
      metadata: { projectId: project.id, projectType: body.type },
    })
    return NextResponse.json(
      { ...project, executionId: execution.executionId, execution },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Command Center execution failed'
    return NextResponse.json(
      { error: message },
      {
        status: message === 'prompt is required' || message === 'Execution not found.'
          ? 400
          : 500,
      },
    )
  }
}
