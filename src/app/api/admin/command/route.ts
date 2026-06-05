import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { routeCommand } from '@/lib/command-router'
import { appendRecord, listRecords } from '@/lib/local-json-store'
import { emitSystemEvent } from '@/lib/event-bus'
import type { SystemEventType } from '@/lib/event-bus'
import type { StudioCommandOptions } from '@/lib/studio-options'

const COMMAND_JOBS_FILE = 'jobs/command-jobs.json'

type CommandJob = {
  id: string
  prompt: string
  status: 'created' | 'waiting_for_approval' | 'ready'
  route: ReturnType<typeof routeCommand>
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

  const route = routeCommand(prompt, body.options)
  const createdAt = new Date().toISOString()
  const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const status = route.approvalRequired ? 'waiting_for_approval' : 'ready'
  const timeline = [
    { type: 'job_created', title: 'Command received', detail: `Routed as ${route.intent}.`, timestamp: createdAt },
    { type: 'plan_created', title: `${route.surface} plan ready`, detail: route.nextVisibleStep, timestamp: createdAt },
    ...(route.approvalRequired
      ? [{ type: 'waiting_for_approval', title: 'Approval required', detail: route.approvalReason ?? 'Review before continuing.', timestamp: createdAt }]
      : [{ type: 'agent_started', title: route.agentTeam[0], detail: 'The attached capability is ready to continue.', timestamp: createdAt }]),
  ]

  const job = appendRecord<CommandJob>(COMMAND_JOBS_FILE, {
    id,
    prompt,
    status,
    route,
    timeline,
    createdAt,
  })

  emitSystemEvent('job_progress', { jobId: job.id, intent: route.intent, status, timeline }, route.appModule)
  for (const item of timeline) {
    emitSystemEvent(item.type as SystemEventType, { jobId: job.id, intent: route.intent, title: item.title, detail: item.detail }, route.appModule)
  }
  return NextResponse.json({ job }, { status: 201 })
}
