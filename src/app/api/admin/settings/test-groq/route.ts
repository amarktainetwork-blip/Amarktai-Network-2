/**
 * POST /api/admin/settings/test-groq
 *
 * Tests the Groq API key by hitting the models list endpoint.
 * This proves key/catalog reachability only. It does not prove chat, TTS, or
 * STT Brain route execution, and it does not prove unsupported media/data
 * capabilities.
 * Returns real results — never faked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'
import { resolveProviderEndpoint } from '@/lib/providers/provider-discovery'
import { getProviderTruth } from '@/lib/providers/registry'

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

  const key = inlineKey || await getProviderKey('groq') || ''

  if (!key) {
    return NextResponse.json({
      success: false,
      error: 'No Groq API key configured',
      proofType: 'key_and_model_catalog_check',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      nextAction: 'Add GROQ_API_KEY in Settings',
    })
  }

  const start = Date.now()
  try {
    const res = await fetch(`${resolveProviderEndpoint(getProviderTruth('groq')!, 'openai_compatible')}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'API key invalid or expired' : `Groq API returned HTTP ${res.status}`
      return NextResponse.json({
        success: false,
        error: msg,
        latencyMs,
        proofType: 'key_and_model_catalog_check',
        proofKind: 'catalog_discovery_test',
        capabilityExecutionProven: false,
        nextAction: 'Check the Groq API key in Settings, then run a real Brain route for chat, TTS, or STT proof.',
      })
    }

    const data = await res.json() as { data?: unknown[] }
    const modelCount = Array.isArray(data.data) ? data.data.length : 0

    return NextResponse.json({
      success: true,
      modelCount,
      latencyMs,
      proofType: 'key_and_model_catalog_check',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      detail: 'Groq key and model catalog check passed. Capability execution still requires a real Brain/runtime route proof for chat, TTS, or STT.',
      nextAction: 'Run a real Brain/runtime route for the Groq capability you want to mark ready.',
    })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({
      success: false,
      error: message,
      latencyMs,
      proofType: 'key_and_model_catalog_check',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      nextAction: 'Check network connectivity and the Groq API key, then run a real Brain route for the target capability.',
    })
  }
}
