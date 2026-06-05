/**
 * POST /api/admin/settings/test-qwen
 *
 * Tests the Qwen/DashScope API key by hitting the models list endpoint.
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

  const key = inlineKey || await getProviderKey('qwen') || ''

  if (!key) {
    return NextResponse.json({ success: false, error: 'No Qwen/DashScope API key configured', nextAction: 'Add QWEN_API_KEY or DASHSCOPE_API_KEY in Settings' })
  }

  const start = Date.now()
  try {
    // DashScope-compatible OpenAI chat completions endpoint — minimal test
    const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'API key invalid or expired' : `Qwen API returned HTTP ${res.status}`
      return NextResponse.json({ success: false, error: msg, latencyMs, nextAction: 'Check the Qwen API key in Settings' })
    }

    if (!inlineKey) {
      await prisma.integrationConfig.upsert({
        where: { key: 'qwen' },
        create: { key: 'qwen', displayName: 'Qwen / DashScope', apiKey: '', enabled: true, notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
        update: { notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, latencyMs })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ success: false, error: message, latencyMs, nextAction: 'Check network connectivity and Qwen API key' })
  }
}
