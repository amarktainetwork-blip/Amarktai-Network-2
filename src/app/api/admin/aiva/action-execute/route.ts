import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { auditAivaAction, listAivaActionAudit } from '@/lib/aiva-action-audit'

const actionSchema = z.object({
  actionId: z.string().min(1),
  confirmed: z.boolean().optional().default(false),
  payload: z.unknown().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Number(searchParams.get('days') || '7')
  const audit = await listAivaActionAudit(days)
  return NextResponse.json({ success: true, audit, count: audit.length })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid Aiva action request', details: parsed.error.flatten() }, { status: 422 })
  }

  const entry = await auditAivaAction({
    actionId: parsed.data.actionId,
    confirmed: parsed.data.confirmed,
    payload: parsed.data.payload,
    requestedBy: 'admin',
  })

  return NextResponse.json({
    success: entry.allowed,
    executed: false,
    audit: entry,
    message: entry.allowed
      ? 'Action approved and audited. Executor wiring is intentionally separate and must be implemented per action.'
      : entry.reason,
  }, { status: entry.allowed ? 202 : 409 })
}
