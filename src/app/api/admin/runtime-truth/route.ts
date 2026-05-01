/**
 * GET /api/admin/runtime-truth
 *
 * Returns the unified runtime capability truth for all dashboard sections.
 * Reads all keys via getDashboardRuntimeTruth() from runtime-capability-truth.ts,
 * which resolves keys through service-vault (DB vault → env var fallback).
 *
 * This is the single API all dashboard pages should call instead of computing
 * their own provider/key status.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const truth = await getDashboardRuntimeTruth()
    return NextResponse.json(truth)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[runtime-truth] GET failed:', message)
    return NextResponse.json(
      { success: false, error: message, blocker: 'Runtime truth unavailable', nextAction: 'Check server logs' },
      { status: 500 },
    )
  }
}
