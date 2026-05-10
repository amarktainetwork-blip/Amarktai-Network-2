/**
 * POST /api/admin/settings/test-minimax
 *
 * Tests the MiniMax/Mimo API key by hitting the models list endpoint.
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

  const key = inlineKey || await getProviderKey('minimax') || ''

  if (!key) {
    return NextResponse.json({ success: false, error: 'No MiniMax/Mimo API key configured', nextAction: 'Add MINIMAX_API_KEY or MIMO_API_KEY in Settings' })
  }

  const start = Date.now()
  try {
    const res = await fetch('https://api.minimax.io/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'API key invalid or expired' : `MiniMax API returned HTTP ${res.status}`
      return NextResponse.json({ success: false, error: msg, latencyMs, nextAction: 'Check the MiniMax API key in Settings' })
    }

    if (!inlineKey) {
      await prisma.integrationConfig.upsert({
        where: { key: 'minimax' },
        create: { key: 'minimax', displayName: 'MiniMax / Mimo', apiKey: '', enabled: true, notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
        update: { notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, latencyMs })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ success: false, error: message, latencyMs, nextAction: 'Check network connectivity and MiniMax API key' })
  }
}
