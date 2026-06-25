/**
 * GET /api/admin/vps/readiness
 *
 * Returns a full VPS readiness check including system metrics,
 * database/Redis/Qdrant connectivity, artifact storage, queue depth,
 * publishing backlog, and provider health for active providers only.
 *
 * Requires admin session.
 * Server-side only.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runReadinessCheck } from '@/lib/vps-monitoring'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runReadinessCheck()

    const httpStatus = result.status === 'critical' ? 503
      : result.status === 'warning' ? 200
      : 200

    return NextResponse.json(result, { status: httpStatus })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'critical',
        summary: `Readiness check failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        checks: [], alerts: [], upgradeRecommended: false,
        upgradeReasons: [], blockingIssues: ['Readiness check itself failed'],
        warningIssues: [], checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
