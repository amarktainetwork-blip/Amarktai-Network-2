import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { assignAgentToAppPackage, listOperatorAgents } from '@/lib/agent-registry'

const assignSchema = z.object({
  appSlug: z.string().min(1),
  agentId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = request.nextUrl.searchParams.get('appSlug') || 'dashboard'
  return NextResponse.json({
    success: true,
    surface: 'operator_catalog',
    runtimeExecutionOwner: 'src/lib/agent-runtime.ts',
    note: 'This endpoint lists operator/admin agent catalog entries. It is not the canonical runtime readiness or deployment truth for app-executed agents.',
    agents: listOperatorAgents(appSlug),
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = assignSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid agent assignment' }, { status: 422 })
  }

  return NextResponse.json({
    success: true,
    assignment: assignAgentToAppPackage(parsed.data.agentId, parsed.data.appSlug),
  })
}
