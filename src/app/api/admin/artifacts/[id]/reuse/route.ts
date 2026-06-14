import { NextResponse } from 'next/server'
import { canViewArtifactUnderAppPolicy } from '@/lib/artifact-policy'
import { getArtifact } from '@/lib/artifact-store'
import { getSession } from '@/lib/session'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const artifact = await getArtifact((await params).id).catch(() => null)
  if (!artifact || !(await canViewArtifactUnderAppPolicy(artifact))) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }
  if (artifact.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed artifacts can be reused' }, { status: 409 })
  }
  return NextResponse.json({
    sourceArtifactId: artifact.id,
    reuse: {
      id: artifact.id,
      title: artifact.title,
      description: artifact.description,
      appSlug: artifact.appSlug,
      appId: artifact.appId,
      workspaceId: artifact.workspaceId,
      type: artifact.type,
      subType: artifact.subType,
      capability: artifact.capability,
      provider: artifact.provider,
      model: artifact.model,
      mimeType: artifact.mimeType,
      previewUrl: artifact.previewUrl,
      downloadUrl: artifact.downloadUrl,
      metadata: artifact.metadata,
    },
    contextReference: {
      id: artifact.id,
      label: artifact.title,
      value: `artifact:${artifact.id}`,
      summary: `${artifact.title} (${artifact.type}, ${artifact.capability})`,
    },
  })
}
