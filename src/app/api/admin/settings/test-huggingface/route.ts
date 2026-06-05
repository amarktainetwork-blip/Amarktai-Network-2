/**
 * POST /api/admin/settings/test-huggingface
 *
 * Tests the Hugging Face API key/token by calling the user info endpoint.
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

  const key = inlineKey || await getProviderKey('huggingface') || ''

  if (!key) {
    return NextResponse.json({ success: false, error: 'No Hugging Face token configured', nextAction: 'Add HUGGINGFACE_API_KEY or HF_TOKEN in Settings' })
  }

  const start = Date.now()
  try {
    const res = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'Token invalid or expired' : `Hugging Face API returned HTTP ${res.status}`
      return NextResponse.json({ success: false, error: msg, latencyMs, nextAction: 'Check the Hugging Face token in Settings' })
    }

    const data = await res.json() as { name?: string; type?: string }

    if (!inlineKey) {
      await prisma.integrationConfig.upsert({
        where: { key: 'huggingface' },
        create: { key: 'huggingface', displayName: 'Hugging Face', apiKey: '', enabled: true, notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
        update: { notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
      }).catch(() => null)
    }

    return NextResponse.json({ success: true, username: data.name, accountType: data.type, latencyMs })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ success: false, error: message, latencyMs, nextAction: 'Check network connectivity and Hugging Face token' })
  }
}
