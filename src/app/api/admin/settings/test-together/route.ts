/**
 * POST /api/admin/settings/test-together
 *
 * Tests the Together AI API key by hitting the models list endpoint.
 * This proves account/key and catalog reachability only. It does not prove
 * image, video, TTS, STT, embeddings, or rerank execution.
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

  const key = inlineKey || await getProviderKey('together') || ''

  if (!key) {
    return NextResponse.json({ success: false, error: 'No Together AI API key configured', nextAction: 'Add TOGETHER_API_KEY in Settings' })
  }

  const start = Date.now()
  try {
    const res = await fetch(`${resolveProviderEndpoint(getProviderTruth('together')!, 'openai_compatible')}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403 ? 'API key invalid or expired' : `Together AI returned HTTP ${res.status}`
      return NextResponse.json({
        success: false,
        error: msg,
        latencyMs,
        proofType: 'key_and_model_catalog_check',
        capabilityExecutionProven: false,
        nextAction: 'Check the Together AI key in Settings, then run a real capability route or provider-capability smoke for the required feature.',
      })
    }

    const data = await res.json() as unknown[]
    const modelCount = Array.isArray(data) ? data.length : 0

    return NextResponse.json({
      success: true,
      modelCount,
      latencyMs,
      proofType: 'key_and_model_catalog_check',
      capabilityExecutionProven: false,
      detail: 'Together key and model catalog check passed. Capability execution still requires a real route proof for image, video, audio, embeddings, or rerank.',
      nextAction: 'Run a real Brain or provider-capability execution for the specific Together capability you want to mark ready.',
    })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({
      success: false,
      error: message,
      latencyMs,
      proofType: 'key_and_model_catalog_check',
      capabilityExecutionProven: false,
      nextAction: 'Check network connectivity and the Together AI key, then run a real capability route for execution proof.',
    })
  }
}
