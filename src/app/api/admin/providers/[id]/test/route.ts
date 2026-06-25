/**
 * POST /api/admin/providers/[id]/test
 * Runs a live test for the specified active provider key.
 * Only allows testing active providers (genx, huggingface, together, groq, mimo).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: key } = await params
  if (!(ACTIVE_PROVIDER_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json({ error: 'Unknown or disallowed provider', ok: false }, { status: 400 })
  }

  const start = Date.now()
  try {
    const testEndpoint = `/api/admin/settings/test-${key}`
    const origin = req.nextUrl.origin
    const res = await fetch(`${origin}${testEndpoint}`, {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })
    const latencyMs = Date.now() - start
    if (res.ok) {
      return NextResponse.json({ ok: true, latencyMs })
    }
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    return NextResponse.json({ ok: false, latencyMs, error: String(body?.error ?? 'Test failed') })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Test failed',
    })
  }
}
