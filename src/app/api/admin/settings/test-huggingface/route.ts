/**
 * POST /api/admin/settings/test-huggingface
 *
 * Tests the Hugging Face API key/token by calling the user info endpoint.
 * This proves account/token validity only. It does not prove any specific
 * inference capability route is executable.
 * Returns real results — never faked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'

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
    return NextResponse.json({ success: false, error: 'No Hugging Face token configured', proofType: 'account_token_check', proofKind: 'credential_test_only', capabilityExecutionProven: false, nextAction: 'Add HUGGINGFACE_API_KEY, HUGGINGFACEHUB_API_TOKEN, or HF_TOKEN in Settings' })
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
      return NextResponse.json({
        success: false,
        error: msg,
        latencyMs,
        proofType: 'account_token_check',
        proofKind: 'credential_test_only',
        capabilityExecutionProven: false,
        nextAction: 'Check the Hugging Face token in Settings, then run a provider-capability test for the required task route.',
      })
    }

    const data = await res.json() as { name?: string; type?: string }

    return NextResponse.json({
      success: true,
      username: data.name,
      accountType: data.type,
      latencyMs,
      proofType: 'account_token_check',
      proofKind: 'credential_test_only',
      capabilityExecutionProven: false,
      detail: 'Hugging Face token/account check passed. Capability execution still requires provider-capability tests or a wired Brain route.',
      nextAction: 'Run a provider-capability test for the specific Hugging Face task or use a Brain route that is already wired.',
    })
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({
      success: false,
      error: message,
      latencyMs,
      proofType: 'account_token_check',
      proofKind: 'credential_test_only',
      capabilityExecutionProven: false,
      nextAction: 'Check network connectivity and the Hugging Face token, then run a provider-capability test for the target capability.',
    })
  }
}
