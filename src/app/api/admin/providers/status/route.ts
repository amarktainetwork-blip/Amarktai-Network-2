/**
 * GET /api/admin/providers/status
 *
 * Single source of truth for the 5 active AI provider statuses.
 * Consumed by the Providers page, the Overview widget, and any other
 * surface that needs provider readiness data.
 *
 * Uses getProviderRuntimeTruth() — the same shared helper that Settings
 * and System Monitoring use — so all surfaces always agree.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const all = await getProviderRuntimeTruth()

    const active = all
      .filter((p) => (ACTIVE_PROVIDER_KEYS as readonly string[]).includes(p.providerId))
      .map((p) => ({
        key: p.providerId,
        displayName: p.displayName,
        configured: p.configured,
        connected: p.connected,
        status: p.connected
          ? 'configured_wired'
          : p.configured
            ? 'configured_not_wired'
            : 'blocked',
        reason: p.connected
          ? 'Connected'
          : p.lastTestStatus === 'failed'
            ? 'Failed'
            : p.configured
              ? 'Not tested'
              : shortBlocker(p.blocker),
        keySource: p.keySource,
        capabilities: [...p.capabilities],
        lastError: p.lastTestStatus === 'failed' ? p.blocker || null : null,
        lastTestedAt: p.lastTestedAt,
      }))

    return NextResponse.json(active)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

/** Shorten a blocker string to a dashboard-safe message. */
function shortBlocker(blocker: string): string {
  if (!blocker) return 'Missing key'
  if (blocker.startsWith('missing_key')) return 'Missing key'
  if (blocker.startsWith('requires_endpoint')) return 'Requires endpoint'
  if (blocker.startsWith('last_test_failed') || blocker === 'last_test_failed') return 'Failed'
  if (blocker.startsWith('run the')) return 'Not tested'
  return blocker.slice(0, 60)
}
