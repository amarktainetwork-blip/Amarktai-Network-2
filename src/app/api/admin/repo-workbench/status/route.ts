import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return NextResponse.json(await getRepoWorkbenchStatus())
  } catch (error) {
    return NextResponse.json(
      {
        gitInstalled: false,
        ghInstalled: false,
        githubTokenConfigured: false,
        workspaceWritable: false,
        genxAvailable: false,
        canImport: false,
        canPatch: false,
        canCommit: false,
        canPush: false,
        canCreatePr: false,
        blockers: [error instanceof Error ? error.message : 'Repo Workbench status check failed'],
      },
      { status: 200 },
    )
  }
}
