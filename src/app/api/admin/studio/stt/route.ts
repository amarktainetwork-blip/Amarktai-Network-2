import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { POST as sttPost } from '@/app/api/brain/stt/route'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const incoming = await request.formData().catch(() => null)
  if (!incoming) return NextResponse.json({ success: false, error: 'multipart form data is required' }, { status: 400 })

  const file = incoming.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: 'audio file is required' }, { status: 400 })
  }

  const appSlug = String(incoming.get('appSlug') || 'amarktai')
  const provider = String(incoming.get('provider') || 'auto')
  const model = String(incoming.get('model') || '')
  const language = String(incoming.get('language') || '')

  const form = new FormData()
  form.append('file', file, file instanceof File ? file.name : 'audio.webm')
  form.append('provider', provider)
  if (model && model !== 'auto') form.append('model', model)
  if (language) form.append('language', language)

  const response = await sttPost(new NextRequest(new URL('/api/brain/stt', 'http://studio.local'), {
    method: 'POST',
    body: form,
  }))
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  let artifact: unknown = null

  if (response.ok && data.executed && typeof data.transcript === 'string') {
    try {
      artifact = await createArtifact({
        appSlug,
        type: 'transcript',
        subType: 'studio_stt',
        title: `Transcript: ${(file instanceof File ? file.name : 'audio').slice(0, 80)}`,
        description: 'Studio STT transcription',
        provider: String(data.provider ?? provider),
        model: String(data.model ?? model),
        content: Buffer.from(data.transcript, 'utf8'),
        mimeType: 'text/plain',
        metadata: { language: data.language ?? language, sourceFile: file instanceof File ? file.name : 'audio' },
      })
    } catch (error) {
      artifact = { id: null, warning: error instanceof Error ? error.message : 'Artifact persistence failed' }
    }
  }

  return NextResponse.json({
    success: response.ok && Boolean(data.executed),
    executed: Boolean(data.executed),
    result: data,
    artifact,
    error: response.ok ? undefined : data.error,
  }, { status: response.status })
}
