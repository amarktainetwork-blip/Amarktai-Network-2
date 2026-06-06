import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { routeCommandWithProviderMesh } from '@/lib/command-router'
import { appendRecord, listRecords } from '@/lib/local-json-store'
import { emitSystemEvent } from '@/lib/event-bus'
import type { SystemEventType } from '@/lib/event-bus'
import type { StudioCommandOptions } from '@/lib/studio-options'

const COMMAND_JOBS_FILE = 'jobs/command-jobs.json'

type CommandJob = {
  id: string
  prompt: string
  status: 'waiting_for_input' | 'waiting_for_approval' | 'running' | 'completed' | 'failed'
  route: Awaited<ReturnType<typeof routeCommandWithProviderMesh>>
  execution?: Record<string, unknown>
  timeline: Array<{ type: string; title: string; detail: string; timestamp: string }>
  createdAt: string
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const jobs = listRecords<CommandJob>(COMMAND_JOBS_FILE).slice(-30).reverse()
  return NextResponse.json({ jobs })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { prompt?: string; options?: StudioCommandOptions }
  const prompt = body.prompt?.trim()
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

  const route = await routeCommandWithProviderMesh(prompt, body.options)
  const createdAt = new Date().toISOString()
  const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let status: CommandJob['status'] = route.missingInformation.length
    ? 'waiting_for_input'
    : route.approvalRequired
      ? 'waiting_for_approval'
      : 'running'
  const timeline = [
    { type: 'job_created', title: 'Command received', detail: `Routed as ${route.intent}.`, timestamp: createdAt },
    { type: 'plan_created', title: `${route.surface} plan ready`, detail: route.nextVisibleStep, timestamp: createdAt },
    ...(route.missingInformation.length
      ? [{ type: 'waiting_for_input', title: 'One detail needed', detail: route.missingInformation[0], timestamp: createdAt }]
      : route.approvalRequired
      ? [{ type: 'waiting_for_approval', title: 'Approval required', detail: route.approvalReason ?? 'Review before continuing.', timestamp: createdAt }]
      : [{ type: 'agent_started', title: route.agentTeam[0], detail: route.selectedProviders.length ? `Starting with ${route.selectedProviders[0]}.` : 'Checking connected capabilities.', timestamp: createdAt }]),
  ]

  let execution: Record<string, unknown> | undefined
  if (status === 'running') {
    execution = await executeImmediateCommand(request, prompt, route, body.options)
    const executed = execution.executed === true
    const accepted = execution.accepted === true
    status = accepted ? 'running' : executed ? 'completed' : 'failed'
    timeline.push({
      type: status === 'failed' ? 'job_failed' : status === 'completed' ? 'job_completed' : 'job_progress',
      title: status === 'failed' ? 'Capability could not start' : status === 'completed' ? 'Output created' : 'Provider job started',
      detail: String(execution.error || execution.detail || execution.pollUrl || 'The provider accepted the job.'),
      timestamp: new Date().toISOString(),
    })
  }

  const job = appendRecord<CommandJob>(COMMAND_JOBS_FILE, {
    id,
    prompt,
    status,
    route,
    timeline,
    execution,
    createdAt,
  })

  emitSystemEvent('job_progress', { jobId: job.id, intent: route.intent, status, timeline }, route.appModule)
  for (const item of timeline) {
    emitSystemEvent(item.type as SystemEventType, { jobId: job.id, intent: route.intent, title: item.title, detail: item.detail }, route.appModule)
  }
  return NextResponse.json({ job }, { status: 201 })
}

async function executeImmediateCommand(
  originalRequest: NextRequest,
  prompt: string,
  route: Awaited<ReturnType<typeof routeCommandWithProviderMesh>>,
  options: StudioCommandOptions | undefined,
): Promise<Record<string, unknown>> {
  if (!route.selectedProviders.length) {
    return { executed: false, error: `No tested connection currently provides ${String(route.selectedCapability).replaceAll('_', ' ')}.` }
  }

  if (route.intent === 'create_image') {
    const providerOverride = route.selectedProviders.find((provider) => ['genx', 'qwen', 'together'].includes(provider))
    if (!providerOverride) return { executed: false, error: 'Connected image providers are not yet supported by the image execution route.' }
    const request = new NextRequest(originalRequest.url, {
      method: 'POST',
      headers: originalRequest.headers,
      body: JSON.stringify({ prompt, providerOverride }),
    })
    const response = await (await import('@/app/api/brain/image/route')).POST(request)
    const payload = await response.json() as Record<string, unknown>
    return {
      ...payload,
      executed: payload.executed === true,
      accepted: Boolean(payload.jobId),
      detail: payload.imageUrl ? 'Image created and available in Outputs.' : payload.jobId ? 'Image job started.' : undefined,
    }
  }

  if (route.intent === 'create_movie') {
    const provider = route.selectedProviders.find((item) => ['genx', 'together', 'qwen', 'huggingface'].includes(item))
    if (!provider) return { executed: false, error: 'Connected video providers are not yet supported by the video execution route.' }
    const duration = Math.min(30, Number(options?.duration || 4))
    const request = new NextRequest(originalRequest.url, {
      method: 'POST',
      headers: originalRequest.headers,
      body: JSON.stringify({ prompt, provider, duration, style: normalizeMovieStyle(options?.movieStyle) }),
    })
    const response = await (await import('@/app/api/brain/video-generate/route')).POST(request)
    const payload = await response.json() as Record<string, unknown>
    return {
      ...payload,
      executed: payload.executed === true,
      accepted: response.status === 202,
      detail: response.status === 202 ? 'Video job started.' : undefined,
    }
  }

  if (route.intent === 'create_song') {
    const request = new NextRequest(originalRequest.url, {
      method: 'POST',
      headers: originalRequest.headers,
      body: JSON.stringify({
        action: 'create_async',
        request: {
          theme: prompt,
          genre: options?.genres?.[0] || 'pop',
          genres: options?.genres || ['pop'],
          combineGenres: Boolean(options?.combineGenres),
          vocalStyle: options?.vocals || 'female',
          mood: options?.mood || 'uplifting',
          language: options?.language || 'English',
          durationSeconds: Number(options?.duration || 180),
          appSlug: 'content-studio',
          cleanLyrics: options?.cleanLyrics !== false,
          structure: options?.structure || 'auto',
        },
      }),
    })
    const response = await (await import('@/app/api/admin/music-studio/route')).POST(request)
    const payload = await response.json() as Record<string, unknown>
    return {
      ...payload,
      executed: response.ok,
      accepted: response.status === 202,
      detail: response.ok ? 'Song job started.' : undefined,
    }
  }

  return { executed: false, error: 'This command is attached to its guarded workspace and requires the next visible step there.' }
}

function normalizeMovieStyle(value?: string) {
  if (value === 'animated' || value === 'realistic' || value === 'documentary' || value === 'cinematic') return value
  return 'commercial'
}
