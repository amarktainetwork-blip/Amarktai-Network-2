import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getCostSummary, recordEstimatedCost } from '@/lib/cost-tracking'

const recordSchema = z.object({
  provider: z.string(),
  model: z.string(),
  appSlug: z.string().default('dashboard'),
  agentId: z.string().optional(),
  capability: z.string(),
  runType: z.string(),
  costMode: z.enum(['cheap', 'balanced', 'premium']),
  estimatedCostUsd: z.number().min(0),
})

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, summary: await getCostSummary() })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = recordSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid cost record' }, { status: 422 })
  return NextResponse.json({ success: true, record: await recordEstimatedCost(parsed.data) })
}
