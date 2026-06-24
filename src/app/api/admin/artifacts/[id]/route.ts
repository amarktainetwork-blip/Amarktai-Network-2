import { NextResponse } from 'next/server'
import { canViewArtifactUnderAppPolicy } from '@/lib/artifact-policy'
import { getArtifact } from '@/lib/artifact-store'
import { getExecution } from '@/lib/execution'
import { getSession } from '@/lib/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const artifact = await getArtifact((await params).id).catch(() => null)
  if (!artifact || !(await canViewArtifactUnderAppPolicy(artifact))) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }
  const execution = artifact.executionId ? getExecution(artifact.executionId) : null
  const job = execution?.jobs.find((entry) => entry.jobId === artifact.jobId) ?? null
  return NextResponse.json({ artifact, execution, job })
}

export async function DELETE() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    error: 'Direct deletion is disabled. Use the confirmed archive action.',
  }, { status: 405 })
}
