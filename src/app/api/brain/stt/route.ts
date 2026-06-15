import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { capabilityHttpStatus } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  if (!(request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type must be multipart/form-data.' }, { status: 400 })
  }
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'An audio file is required.' }, { status: 400 })
  }
  const result = await executeCapability({
    input: 'Transcribe the supplied audio accurately.',
    capability: 'stt',
    files: ['inline:audio'],
    appId: value(form.get('appSlug')),
    providerOverride: value(form.get('provider')),
    modelOverride: value(form.get('model')),
    saveArtifact: true,
    metadata: {
      executionId: value(form.get('executionId')),
      language: value(form.get('language')),
      referenceData: Buffer.from(await file.arrayBuffer()),
      referenceMimeType: (file as File).type || 'audio/webm',
    },
  })
  return NextResponse.json(result, { status: capabilityHttpStatus(result) })
}

function value(input: FormDataEntryValue | null) {
  return typeof input === 'string' && input && input !== 'auto' ? input : undefined
}
