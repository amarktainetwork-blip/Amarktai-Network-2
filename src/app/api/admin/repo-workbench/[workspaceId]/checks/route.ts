import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAvailablePackageChecks } from '@/lib/repo-workbench'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { workspaceId } = await params
  return NextResponse.json({ success: true, checks: await getAvailablePackageChecks(workspaceId) })
}
