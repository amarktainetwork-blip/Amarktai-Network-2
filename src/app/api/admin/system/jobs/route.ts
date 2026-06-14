import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getQueueStatus } from '@/lib/job-queue'
import { listRecords } from '@/lib/local-json-store'
import { listExecutions } from '@/lib/execution'
import { listVideoProjects } from '@/lib/long-form-video'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const executions = listExecutions({ limit: 50 })
  const videoProjects = listVideoProjects().slice(0, 50)
  const jobs = [
    ...videoProjects.map((project) => ({
      id: project.id,
      type: 'long_form_video',
      status: project.status,
      capability: 'video_generation',
      provider: project.requestedProvider,
      model: project.requestedModel,
      createdAt: project.createdAt,
      completedAt: project.completedAt,
      error: project.error ?? project.blocker,
      artifactId: project.finalArtifactId,
      artifactUrl: project.finalVideoUrl,
      appSlug: project.appSlug,
      promptSummary: project.prompt.slice(0, 140),
    })),
    ...executions.map((execution) => {
      const artifact = execution.artifacts.at(-1)
      const result = execution.result && typeof execution.result === 'object'
        ? execution.result as Record<string, unknown>
        : null
      const providerAttempts = Array.isArray(result?.providerAttempts)
        ? result.providerAttempts
        : []
      return {
        id: execution.executionId,
        type: 'execution',
        status: execution.status,
        capability: execution.detectedCapability,
        provider: execution.providerPlan.provider,
        model: execution.modelPlan.model,
        createdAt: execution.createdAt,
        completedAt: execution.completedAt,
        error: execution.error,
        artifactId: artifact?.artifactId ?? null,
        artifactUrl: artifact?.url ?? null,
        appSlug: execution.appSlug,
        promptSummary: execution.input.prompt.slice(0, 140),
        providerAttempts,
      }
    }),
  ]
  return NextResponse.json({
    queue: await getQueueStatus(),
    recent: listRecords('jobs/command-jobs.json').slice(-50).reverse(),
    executions,
    videoProjects,
    jobs,
  })
}
