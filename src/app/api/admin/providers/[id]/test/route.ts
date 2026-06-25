import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  getProviderRuntime,
  getProviderTaskRuntime,
  sanitizeRuntimeProviderError,
  type ProviderTask,
} from '@/lib/provider-runtime'
import { getProviderKey } from '@/lib/provider-config'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

type TestPayload = {
  success?: boolean
  ok?: boolean
  error?: string
  detail?: string
  note?: string
  connected?: boolean
  [key: string]: unknown
}

function isProviderTask(value: string): value is ProviderTask {
  return [
    'health',
    'models',
    'chat',
    'streaming_chat',
    'text_generation',
    'research',
    'summarization',
    'translation',
    'embeddings',
    'rerank',
    'text_to_image',
    'image_to_image',
    'image_edit',
    'image_analysis',
    'ocr',
    'text_to_video',
    'image_to_video',
    'video_job_poll',
    'music_instrumental',
    'music_song',
    'text_to_speech',
    'speech_to_text',
    'avatar_image',
    'avatar_video',
    'adult_text',
    'adult_image',
    'adult_voice',
    'adult_video',
  ].includes(value)
}

function proofPayload(input: {
  ok: boolean
  provider: string
  task: ProviderTask
  status: string
  latencyMs: number
  endpoint?: string
  routeShape?: string
  artifactHandling?: string
  supportsAsyncJob?: boolean
  requiresDedicatedEndpoint?: boolean
  endpointConfigured?: boolean
  error?: string
  detail?: string
}) {
  return {
    ok: input.ok,
    success: input.ok,
    provider: input.provider,
    task: input.task,
    status: input.status,
    latencyMs: input.latencyMs,
    endpoint: input.endpoint,
    routeShape: input.routeShape,
    artifactHandling: input.artifactHandling,
    supportsAsyncJob: input.supportsAsyncJob,
    requiresDedicatedEndpoint: input.requiresDedicatedEndpoint,
    endpointConfigured: input.endpointConfigured,
    error: input.error,
    detail: input.detail,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const startedAt = Date.now()
  const { id: providerKey } = await params
  if (!(ACTIVE_PROVIDER_KEYS as readonly string[]).includes(providerKey)) {
    return NextResponse.json({
      ok: false,
      success: false,
      provider: providerKey,
      status: 'unsupported',
      error: 'Unknown or disallowed provider',
      latencyMs: Date.now() - startedAt,
    }, { status: 400 })
  }

  const runtime = getProviderRuntime(providerKey)
  if (!runtime) {
    return NextResponse.json({
      ok: false,
      success: false,
      provider: providerKey,
      status: 'unsupported',
      error: 'Unknown or disallowed provider',
      latencyMs: Date.now() - startedAt,
    }, { status: 400 })
  }

  const body = await request.json().catch(() => ({})) as { task?: string }
  const taskParam = body.task ?? request.nextUrl.searchParams.get('task') ?? 'health'
  if (!isProviderTask(taskParam)) {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: 'health',
      status: 'unsupported',
      latencyMs: Date.now() - startedAt,
      error: `Unsupported provider task: ${taskParam}`,
    }))
  }

  const taskRuntime = getProviderTaskRuntime(runtime.key, taskParam)
  if (!taskRuntime) {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: taskParam,
      status: 'unsupported',
      latencyMs: Date.now() - startedAt,
      error: `Provider ${runtime.displayName} does not support ${taskParam}.`,
    }))
  }

  const providerKeyValue = await getProviderKey(runtime.key)
  if (!providerKeyValue) {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: taskParam,
      status: 'unconfigured',
      latencyMs: Date.now() - startedAt,
      endpoint: taskRuntime.endpoint,
      routeShape: taskRuntime.routeShape,
      artifactHandling: taskRuntime.artifactHandling,
      supportsAsyncJob: taskRuntime.supportsAsyncJob,
      requiresDedicatedEndpoint: taskRuntime.requiresDedicatedEndpoint,
      endpointConfigured: false,
      error: `${runtime.displayName} API key is not configured.`,
    }))
  }

  const endpointConfigured = taskRuntime.dedicatedEndpointEnv
    ? Boolean(process.env[taskRuntime.dedicatedEndpointEnv])
    : !taskRuntime.requiresDedicatedEndpoint

  if (taskRuntime.status === 'requires_endpoint' || (taskRuntime.requiresDedicatedEndpoint && !endpointConfigured)) {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: taskParam,
      status: 'requires_endpoint',
      latencyMs: Date.now() - startedAt,
      endpoint: taskRuntime.endpoint,
      routeShape: taskRuntime.routeShape,
      artifactHandling: taskRuntime.artifactHandling,
      supportsAsyncJob: taskRuntime.supportsAsyncJob,
      requiresDedicatedEndpoint: true,
      endpointConfigured,
      error: taskRuntime.dedicatedEndpointEnv
        ? `Dedicated endpoint is not configured: ${taskRuntime.dedicatedEndpointEnv}.`
        : 'Dedicated endpoint is required for this task.',
    }))
  }

  if (taskRuntime.status !== 'working') {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: taskParam,
      status: taskRuntime.status,
      latencyMs: Date.now() - startedAt,
      endpoint: taskRuntime.endpoint,
      routeShape: taskRuntime.routeShape,
      artifactHandling: taskRuntime.artifactHandling,
      supportsAsyncJob: taskRuntime.supportsAsyncJob,
      requiresDedicatedEndpoint: taskRuntime.requiresDedicatedEndpoint,
      endpointConfigured,
      detail: taskRuntime.notes,
      error: 'Capability requires live verification before it can be marked healthy.',
    }))
  }

  try {
    const res = await fetch(`${request.nextUrl.origin}/api/admin/settings/test-provider`, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: runtime.key }),
    })
    const payload = await res.json().catch(() => ({})) as TestPayload
    const success = res.ok && (payload.success === true || payload.ok === true || payload.connected === true)
    return NextResponse.json(proofPayload({
      ok: success,
      provider: runtime.key,
      task: taskParam,
      status: success ? 'working' : 'failed',
      latencyMs: Date.now() - startedAt,
      endpoint: taskRuntime.endpoint,
      routeShape: taskRuntime.routeShape,
      artifactHandling: taskRuntime.artifactHandling,
      supportsAsyncJob: taskRuntime.supportsAsyncJob,
      requiresDedicatedEndpoint: taskRuntime.requiresDedicatedEndpoint,
      endpointConfigured,
      detail: success ? String(payload.detail || payload.note || taskRuntime.notes) : undefined,
      error: success ? undefined : sanitizeRuntimeProviderError(payload.error || payload.detail || payload.note || 'Live test failed.'),
    }))
  } catch (error) {
    return NextResponse.json(proofPayload({
      ok: false,
      provider: runtime.key,
      task: taskParam,
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      endpoint: taskRuntime.endpoint,
      routeShape: taskRuntime.routeShape,
      artifactHandling: taskRuntime.artifactHandling,
      supportsAsyncJob: taskRuntime.supportsAsyncJob,
      requiresDedicatedEndpoint: taskRuntime.requiresDedicatedEndpoint,
      endpointConfigured,
      error: sanitizeRuntimeProviderError(error),
    }))
  }
}
