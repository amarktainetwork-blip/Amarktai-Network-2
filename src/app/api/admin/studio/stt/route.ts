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
import {
  resolveRoutingQuality,
  selectCapabilityRoutePlan,
} from '@/lib/capability-routing-policy'

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
  const qualityTier = await resolveRoutingQuality({
    requested: String(incoming.get('qualityTier') || ''),
    appSlug,
    surface: 'studio',
  })
  const routePlan = await selectCapabilityRoutePlan({
    capability: 'automatic_speech_recognition',
    qualityTier,
    requestedProvider: provider === 'auto' ? undefined : provider as never,
    requestedModel: model && model !== 'auto' ? model : undefined,
  })
  if (!routePlan.selected) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: 'stt',
      readiness: routePlan.setupRequired ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
      jobStatus: routePlan.setupRequired ? 'needs_setup' : 'unavailable',
      error: routePlan.reason,
    }, { status: routePlan.setupRequired ? 503 : 501 })
  }
  let execution = createExecution({
    appSlug,
    actor: { type: 'admin', label: 'Media Studio' },
    requestedCapability: 'stt',
    prompt: `Transcribe ${file instanceof File ? file.name : 'audio input'}`,
    files: [file instanceof File ? file.name : 'audio input'],
    action: 'generate',
    selectedProvider: routePlan.selected.route.provider,
    selectedModel: routePlan.selected.model,
    costMode: qualityTier === 'auto' ? 'balanced' : qualityTier,
    metadata: {
      source: 'media_studio',
      sourceFile: file instanceof File ? file.name : 'audio input',
      language,
      qualityTier,
    },
  })
  execution = startExecution(execution.executionId) ?? execution

  try {
    const form = new FormData()
    form.append('file', file, file instanceof File ? file.name : 'audio.webm')
    form.append('appSlug', appSlug)
    form.append('executionId', execution.executionId)
    form.append('provider', routePlan.selected.route.provider)
    form.append('model', routePlan.selected.model)
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
