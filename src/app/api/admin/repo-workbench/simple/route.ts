import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { importRepo, runMagicPipeline } from '@/lib/repo-workbench'

const simpleSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().min(1).default('main'),
  command: z.string().min(1).max(20_000),
  quality: z.enum(['best', 'good', 'balanced', 'cheap']).default('balanced'),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = simpleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid simple Repo Workbench request', details: parsed.error.flatten() }, { status: 422 })
  }

  const workspace = await importRepo(parsed.data.repoUrl, parsed.data.branch)
  const run = await runMagicPipeline({
    workspaceId: workspace.id,
    instruction: parsed.data.command,
    quality: parsed.data.quality,
  })

  return NextResponse.json({
    success: true,
    mode: 'simple',
    workspace: {
      id: workspace.id,
      owner: workspace.owner,
      repo: workspace.repo,
      branch: workspace.branch,
      status: workspace.status,
      currentCommit: workspace.currentCommit,
    },
    run,
    nextSteps: run.patchId
      ? [
          'Open Repo Workbench review for the generated patch.',
          'Review the diff carefully.',
          'Apply the patch if acceptable.',
          'Run checks.',
          'Commit, push and create PR from Repo Workbench.',
          'Merge in GitHub after review.',
        ]
      : [
          'No valid patch diff was generated.',
          'Review the report artifact and rerun with a more specific command if needed.',
        ],
    truth: 'This endpoint imports/syncs the repo and runs the coding pipeline. It does not auto-merge, deploy, or claim PR creation until those later actions return proof.',
  })
}
