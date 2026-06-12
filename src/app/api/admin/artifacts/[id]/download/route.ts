import { NextRequest, NextResponse } from 'next/server'
import { canViewArtifactUnderAppPolicy } from '@/lib/artifact-policy'
import { getArtifact } from '@/lib/artifact-store'
import { getSession } from '@/lib/session'
import { getStorageDriver } from '@/lib/storage-driver'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const artifact = await getArtifact((await params).id).catch(() => null)
  if (!artifact || !(await canViewArtifactUnderAppPolicy(artifact))) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }
  if (artifact.status !== 'completed') {
    return NextResponse.json({ error: `Artifact is ${artifact.status}, not downloadable` }, { status: 409 })
  }

  let data: Buffer | null = null
  if (artifact.storagePath) {
    data = await getStorageDriver().get(artifact.storagePath)
  } else if (artifact.storageUrl.startsWith('https://')) {
    const response = await fetch(artifact.storageUrl, { signal: AbortSignal.timeout(30_000) })
    if (response.ok) data = Buffer.from(await response.arrayBuffer())
  }
  if (!data) return NextResponse.json({ error: 'Artifact file is unavailable' }, { status: 404 })

  const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'
  const filename = safeFilename(artifact.title || artifact.id, artifact.mimeType)
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': artifact.mimeType || 'application/octet-stream',
      'Content-Length': String(data.length),
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function safeFilename(title: string, mimeType: string): string {
  const base = title.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'artifact'
  if (base.includes('.')) return base
  const extension = mimeType.split('/')[1]?.split(';')[0]?.replace('plain', 'txt').replace('mpeg', 'mp3')
  return extension ? `${base}.${extension}` : base
}
