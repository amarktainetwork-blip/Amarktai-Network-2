import { NextResponse } from 'next/server'
import { archiveArtifact, getArtifact } from '@/lib/artifact-store'
import { getSession } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { confirmed?: boolean } | null
  if (body?.confirmed !== true) {
    return NextResponse.json({
      error: 'Archiving requires explicit admin confirmation',
      approvalRequired: true,
    }, { status: 409 })
  }
  const id = (await params).id
  const existing = await getArtifact(id).catch(() => null)
  if (!existing) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  if (existing.status === 'pending' || existing.status === 'processing') {
    return NextResponse.json({ error: 'Active artifacts cannot be archived' }, { status: 409 })
  }
  const artifact = await archiveArtifact(id)
  if (!artifact) return NextResponse.json({ error: 'Artifact archive failed' }, { status: 500 })
  return NextResponse.json({ artifact, archived: true })
}
