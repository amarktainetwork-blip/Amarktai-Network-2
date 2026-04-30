import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { importRepo } from '@/lib/repo-workbench'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { repoUrl?: string; repoFullName?: string; branch?: string; defaultBranch?: string }
    const repoUrl = body.repoUrl || (body.repoFullName ? `https://github.com/${body.repoFullName}` : '')
    if (!repoUrl) return NextResponse.json({ success: false, error: 'repoUrl or repoFullName is required' }, { status: 400 })
    const status = await getRepoWorkbenchStatus()
    if (!status.canImport) {
      return NextResponse.json({ success: false, setupRequired: true, error: status.blockers.join('; ') || 'Repo import prerequisites are not ready' }, { status: 503 })
    }
    const workspace = await importRepo(repoUrl, body.branch || body.defaultBranch || 'main')
    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      currentCommit: workspace.currentCommit,
      localPath: workspace.localPath,
      workspace,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Repo import failed' }, { status: 400 })
  }
}
