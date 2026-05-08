import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getResearchToolStatus } from '@/lib/research-tools'
import { routeLiveModel } from '@/lib/live-ai-routing'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { prompt?: string; appSlug?: string }
  if (!body.prompt?.trim()) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })

  const [tools, route] = await Promise.all([
    getResearchToolStatus(),
    Promise.resolve(routeLiveModel({ capability: 'research', appSlug: body.appSlug ?? 'amarktai', costMode: 'balanced' })),
  ])

  return NextResponse.json({
    success: true,
    researchAgent: 'Research Agent',
    prompt: body.prompt,
    tools,
    route,
    workflow: [
      'search internet',
      'analyze competing apps',
      'compare features',
      'propose architecture',
      'estimate build scope',
      'create app setup',
      'generate Workbench tasks',
      'wait for owner approval',
    ],
  })
}
