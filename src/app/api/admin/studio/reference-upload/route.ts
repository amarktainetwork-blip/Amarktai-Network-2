import { NextRequest, NextResponse } from 'next/server'
import { createArtifact } from '@/lib/artifact-store'
import { getSession } from '@/lib/session'

function safeString(value: FormDataEntryValue | null, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const incoming = await request.formData().catch(() => null)
  if (!incoming) return NextResponse.json({ success: false, error: 'multipart form data is required' }, { status: 400 })

  const file = incoming.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: 'reference image file is required' }, { status: 400 })
  }
  if (file.type && !file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'reference upload must be an image file' }, { status: 400 })
  }

  const appSlug = safeString(incoming.get('appSlug'), 'amarktai-network')
  const purpose = safeString(incoming.get('purpose'), 'studio_reference')
  const name = file instanceof File ? file.name : 'reference-image'
  const content = Buffer.from(await file.arrayBuffer())
  if (content.length === 0) return NextResponse.json({ success: false, error: 'reference image file is empty' }, { status: 400 })

  try {
    const artifact = await createArtifact({
      appSlug,
      type: 'image',
      subType: 'studio_reference_image',
      title: `Studio reference: ${name.slice(0, 80)}`,
      description: 'Uploaded Studio reference image for media execution',
      provider: 'upload',
      model: 'manual-upload',
      content,
      mimeType: file.type || 'image/png',
      metadata: {
        capability: 'reference_image',
        purpose,
        sourceFile: name,
      },
    })
    return NextResponse.json({
      success: true,
      artifact,
      artifactId: artifact.id,
      storageUrl: artifact.storageUrl,
      referenceImageUrl: artifact.storageUrl,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reference image artifact persistence failed'
    return NextResponse.json({ success: false, error: message, blocker: message }, { status: 500 })
  }
}
