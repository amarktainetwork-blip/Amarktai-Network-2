/**
 * POST /api/admin/settings/test-together
 *
 * Tests the Together AI API key by hitting the models list endpoint.
 * Returns real results — never faked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let inlineKey = ''
  try {
    const body = await req.json()
    inlineKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  } catch { /* ignore */ }

  const key = inlineKey || await getProviderKey('together') || ''

  if (!key) {
    return NextResponse.json({ success: false, error: 'No Together AI API key configured', nextAction: 'Add TOGETHER_API_KEY in Settings' })
  }

  const start = Date.now()
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'API key invalid or expired' : `Together AI returned HTTP ${res.status}`
      return NextResponse.json({ success: false, error: msg, latencyMs, nextAction: 'Check the Together AI key in Settings' })
    }

    const data = await res.json() as unknown[]
    const modelCount = Array.isArray(data) ? data.length : 0

    if (!inlineKey) {
      // Update notes on existing row only — never create a ghost row with apiKey: ''.
      await prisma.integrationConfig.updateMany({
        where: { key: 'together' },
        data: { notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, modelCount, latencyMs })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ success: false, error: message, latencyMs, nextAction: 'Check network connectivity and Together AI key' })
  }
}
