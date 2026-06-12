import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { POST as sttPost } from '@/app/api/brain/stt/route'
import {
  createExecution,
  failExecution,
  recordExecutionResponse,
  startExecution,
} from '@/lib/execution'
import { mediaStudioErrorMessage, mediaStudioResponse } from '@/lib/media-studio'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const incoming = await request.formData().catch(() => null)
  const file = incoming?.get('file')
  if (!incoming || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
  }

  const appSlug = String(incoming.get('appSlug') || 'amarktai-network')
  const provider = String(incoming.get('provider') || 'auto')
  const model = String(incoming.get('model') || '')
  const language = String(incoming.get('language') || '')
  let execution = createExecution({
    appSlug,
    actor: { type: 'admin', label: 'Media Studio' },
    requestedCapability: 'stt',
    prompt: `Transcribe ${file instanceof File ? file.name : 'audio input'}`,
    files: [file instanceof File ? file.name : 'audio input'],
    action: 'generate',
    selectedProvider: provider === 'auto' ? undefined : provider,
    selectedModel: model && model !== 'auto' ? model : undefined,
    metadata: {
      source: 'media_studio',
      sourceFile: file instanceof File ? file.name : 'audio input',
      language,
    },
  })
  execution = startExecution(execution.executionId) ?? execution

  try {
    const form = new FormData()
    form.append('file', file, file instanceof File ? file.name : 'audio.webm')
    form.append('appSlug', appSlug)
    form.append('executionId', execution.executionId)
    form.append('provider', provider)
    if (model && model !== 'auto') form.append('model', model)
    if (language) form.append('language', language)
    const response = await sttPost(new NextRequest(new URL('/api/brain/stt', request.url), {
      method: 'POST',
      body: form,
    }))
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    const normalized = {
      ...payload,
      success: response.ok && payload.executed === true,
      readiness: response.ok ? 'READY' : response.status === 503 ? 'NEEDS_CONFIGURATION' : 'BLOCKED',
      jobStatus: response.ok ? 'completed' : response.status === 503 ? 'needs_setup' : 'blocked',
    }
    execution = recordExecutionResponse(execution.executionId, normalized) ?? execution
    return NextResponse.json(await mediaStudioResponse(execution), { status: response.status })
  } catch (error) {
    execution = failExecution(execution.executionId, mediaStudioErrorMessage(error)) ?? execution
    return NextResponse.json(await mediaStudioResponse(execution), { status: 500 })
  }
}
