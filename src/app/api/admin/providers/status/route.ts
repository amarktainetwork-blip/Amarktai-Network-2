/**
 * GET /api/admin/providers/status
 * Returns status for the 5 active providers only.
 * Never returns removed providers (openai, gemini, anthropic, etc.)
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getRuntimeProviderStatus } from '@/lib/runtime-capability-truth'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const all = await getRuntimeProviderStatus()
    // Filter to only active providers — defense against any stale entries
    const active = all.filter((p) => (ACTIVE_PROVIDER_KEYS as readonly string[]).includes(p.key))
    const result = active.map((p) => ({
      key: p.key,
      displayName: p.displayName,
      configured: p.configured,
      connected: p.connected,
      status: p.status,
      reason: p.reason,
    }))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
