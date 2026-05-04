/**
 * POST /api/admin/research/send-to-repo-workbench
 *
 * Send a research artifact or opportunity to the Repo Workbench as a task.
 * Creates a RepoTask linked to the current or new workspace, or creates an
 * approval request if no workspace is configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getArtifact } from '@/lib/artifact-store'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { artifactId, workspaceId, repoSlug, description, taskType } = body as {
      artifactId?: string
      workspaceId?: string
      repoSlug?: string
      description?: string
      taskType?: string
    }

    let context = description ?? ''

    if (artifactId) {
      const artifact = await getArtifact(artifactId)
      if (artifact) {
        context = `[Research: ${artifact.title}]\n\n${artifact.description}\n\n${context}`
      }
    }

    if (!context.trim()) {
      return NextResponse.json({ error: 'description or artifactId is required' }, { status: 400 })
    }

    // Find or use workspace
    let workspace: { id: string; owner: string; repo: string } | null = null
    try {
      if (workspaceId) {
        workspace = await prisma.repoWorkspace.findUnique({ where: { id: workspaceId } })
      } else {
        workspace = await prisma.repoWorkspace.findFirst({ orderBy: { updatedAt: 'desc' } })
      }
    } catch { /* DB may not be ready */ }

    if (!workspace) {
      // Create approval request to set up workbench first
      try {
        await prisma.systemAlert.create({
          data: {
            alertType: 'approval_request',
            severity: 'info',
            title: 'Research ready for Repo Workbench',
            message: context.slice(0, 500),
            appSlug: repoSlug ?? 'general',
            metadata: JSON.stringify({ taskType: taskType ?? 'auto', artifactId, requiresWorkspace: true }),
          },
        })
      } catch { /* graceful degradation */ }

      return NextResponse.json({
        success: false,
        queued: true,
        message: 'No active workspace found. Approval request created — configure a repo in Repo Workbench first.',
      })
    }

    // Create RepoTask
    let task: { id: string } | null = null
    try {
      task = await prisma.repoTask.create({
        data: {
          repoWorkspaceId: workspace.id,
          title: context.slice(0, 80),
          userRequest: context,
          agentMode: 'auto',
          status: 'pending',
          planJson: JSON.stringify({ taskType: taskType ?? 'auto' }),
        },
      })
    } catch { /* graceful degradation */ }

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      repo: `${workspace.owner}/${workspace.repo}`,
      taskId: task?.id ?? null,
      message: task ? 'Task queued in Repo Workbench.' : 'Workspace found but task creation failed — check database.',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send to repo workbench' }, { status: 500 })
  }
}
